import { serr } from '../util'
import { Term, Var, App, Hole, Type, Abs, Pi } from './syntax';
import { log } from '../config';
import { Name } from '../names';

type Token = { tag: 'Name', name: string } | { tag: 'List', list: Token[] };
const TName = (name: string): Token => ({ tag: 'Name', name });
const TList = (list: Token[]): Token => ({ tag: 'List', list });

type Bracket = '(' | ')';
const matchingBracket = (c: Bracket): Bracket => {
  if(c === '(') return ')';
  if(c === ')') return '(';
  return serr(`invalid bracket: ${c}`);
};

const SYM1: string[] = ['\\', ':', '/', '.', '*'];
const SYM2: string[] = ['->'];

const START = 0;
const NAME = 1;
const COMMENT = 2;
const tokenize = (sc: string): Token[] => {
  let state = START;
  let r: Token[] = [];
  let t = '';
  let esc = false;
  let p: Token[][] = [], b: Bracket[] = [];
  for (let i = 0, l = sc.length; i <= l; i++) {
    const c = sc[i] || ' ';
    const next = sc[i + 1] || '';
    if (state === START) {
      if (SYM2.indexOf(c + next) >= 0) r.push(TName(c + next)), i++;
      else if (SYM1.indexOf(c) >= 0) r.push(TName(c));
      else if (c === ';') state = COMMENT;
      else if (/[\_a-z]/i.test(c)) t += c, state = NAME;
      else if(c === '(') b.push(c), p.push(r), r = [];
      else if(c === ')') {
        if(b.length === 0) return serr(`unmatched bracket: ${c}`);
        const br = b.pop() as Bracket;
        if(matchingBracket(br) !== c) return serr(`unmatched bracket: ${br} and ${c}`);
        const a: Token[] = p.pop() as Token[];
        a.push(TList(r));
        r = a;
      }
      else if (/\s/.test(c)) continue;
      else return serr(`invalid char ${c} in tokenize`);
    } else if (state === NAME) {
      if (!/[a-z0-9\_]/i.test(c)) {
        r.push(TName(t));
        t = '', i--, state = START;
      } else t += c;
    } else if (state === COMMENT) {
      if (c === '\n') state = START;
    }
  }
  if (b.length > 0) return serr(`unclosed brackets: ${b.join(' ')}`);
  if (state !== START && state !== COMMENT)
    return serr('invalid tokenize end state');
  if (esc) return serr(`escape is true after tokenize`);
  return r;
};

/*
TODO:
{ tag: 'App', left: Term, right: Term }
{ tag: 'Abs', name: Name, type: Term | null, body: Term }
{ tag: 'Pi', name: Name, type: Term, body: Term }
{ tag: 'Let', name: Name, val: Term, body: Term }
{ tag: 'Ann', term: Term, type: Term }
*/

const tunit = Var('UnitType');
const unit = Var('Unit');

const isName = (t: Token, x: Name): t is { tag: 'Name', name: string } =>
  t.tag === 'Name' && t.name === x;
const isNames = (t: Token[]): Name[] =>
  t.map(x => {
    if (x.tag !== 'Name') return serr(`expected name`);
    return x.name;
  });

const lambdaParams = (t: Token): [Name, Term | null][] => {
  if (t.tag === 'Name') return [[t.name, null]];
  if (t.tag === 'List') {
    const a = t.list;
    if (a.length === 0) return [['_', tunit]];
    const i = a.findIndex(v => v.tag === 'Name' && v.name === ':');
    if (i === -1) return isNames(a).map(x => [x, null]);
    const ns = a.slice(0, i);
    const rest = a.slice(i + 1);
    const ty = exprs(rest);
    return isNames(ns).map(x => [x, ty]);
  }
  return serr(`invalid lambda param`);
};

const expr = (t: Token): Term => {
  if (t.tag === 'List') return exprs(t.list);
  if (t.tag === 'Name') {
    const x = t.name;
    if (x === '*') return Type;
    if (x === '_') return Hole;
    if (/[a-z]/i.test(x[0])) return Var(x);
    return serr(`invalid name: ${x}`);
  }
  return t;
};

const exprs = (ts: Token[]): Term => {
  if (ts.length === 0) return unit;
  if (ts.length === 1) return expr(ts[0]);
  if (isName(ts[0], '\\')) {
    const args: [Name, Term | null][] = [];
    let found = false;
    let i = 1;
    for (; i < ts.length; i++) {
      const c = ts[i];
      if (isName(c, '.')) {
        found = true;
        break;
      }
      lambdaParams(c).forEach(x => args.push(x));
    }
    if (!found) return serr(`. not found after \\`);
    const body = exprs(ts.slice(i + 1));
    return args.reduceRight((x, [name, ty]) => Abs(name, ty, x), body);
  }
  if (isName(ts[0], '/')) {
    const args: [Name, Term][] = [];
    let found = false;
    let i = 1;
    for (; i < ts.length; i++) {
      const c = ts[i];
      if (isName(c, '.')) {
        found = true;
        break;
      }
      lambdaParams(c).forEach(([x, ty]) => {
        if (!ty) return serr('pi parameter requires type');
        return args.push([x, ty])
      });
    }
    if (!found) return serr(`. not found after /`);
    const body = exprs(ts.slice(i + 1));
    return args.reduceRight((x, [name, ty]) => Pi(name, ty, x), body);
  }
  return ts.map(expr).reduce(App);
};

export const parse = (s: string): Term => {
  const ts = tokenize(s);
  log(() => ts);
  return exprs(ts);
};
