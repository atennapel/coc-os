import { serr } from '../util'
import { Term, Var, App, Hole, Type, Abs, Pi, Ann, Open, Let, Fix, Unroll, Roll, Rec, Iota } from './syntax';
import { log } from '../config';
import { Name } from '../names';
import { Def, DDef } from './definitions';

type BracketO = '(' | '{'
type Bracket = BracketO | ')' | '}';
const matchingBracket = (c: Bracket): Bracket => {
  if(c === '(') return ')';
  if(c === ')') return '(';
  if(c === '{') return '}';
  if(c === '}') return '{';
  return serr(`invalid bracket: ${c}`);
};

type Token
  = { tag: 'Name', name: string }
  | { tag: 'Num', num: string }
  | { tag: 'List', list: Token[], bracket: BracketO };
const TName = (name: string): Token => ({ tag: 'Name', name });
const TNum = (num: string): Token => ({ tag: 'Num', num });
const TList = (list: Token[], bracket: BracketO): Token => ({ tag: 'List', list, bracket });

const SYM1: string[] = ['\\', ':', '/', '.', '*', '='];
const SYM2: string[] = ['->'];

const START = 0;
const NAME = 1;
const COMMENT = 2;
const NUMBER = 3;
const tokenize = (sc: string): Token[] => {
  let state = START;
  let r: Token[] = [];
  let t = '';
  let esc = false;
  let p: Token[][] = [], b: BracketO[] = [];
  for (let i = 0, l = sc.length; i <= l; i++) {
    const c = sc[i] || ' ';
    const next = sc[i + 1] || '';
    if (state === START) {
      if (SYM2.indexOf(c + next) >= 0) r.push(TName(c + next)), i++;
      else if (SYM1.indexOf(c) >= 0) r.push(TName(c));
      else if (c === ';') state = COMMENT;
      else if (/[\_a-z]/i.test(c)) t += c, state = NAME;
      else if (/[0-9]/.test(c)) t += c, state = NUMBER;
      else if(c === '(' || c === '{') b.push(c), p.push(r), r = [];
      else if(c === ')' || c === '}') {
        if(b.length === 0) return serr(`unmatched bracket: ${c}`);
        const br = b.pop() as BracketO;
        if(matchingBracket(br) !== c) return serr(`unmatched bracket: ${br} and ${c}`);
        const a: Token[] = p.pop() as Token[];
        a.push(TList(r, br));
        r = a;
      }
      else if (/\s/.test(c)) continue;
      else return serr(`invalid char ${c} in tokenize`);
    } else if (state === NAME) {
      if (!/[\@a-z0-9\_]/i.test(c)) {
        r.push(TName(t));
        t = '', i--, state = START;
      } else t += c;
    } else if (state === NUMBER) {
      if (!/[0-9]/.test(c)) {
        r.push(TNum(t));
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

const tunit = Var('UnitType');
const unit = Var('Unit');

const isName = (t: Token, x: Name): t is { tag: 'Name', name: string } =>
  t.tag === 'Name' && t.name === x;
const isNames = (t: Token[]): Name[] =>
  t.map(x => {
    if (x.tag !== 'Name') return serr(`expected name`);
    return x.name;
  });

const splitTokens = (a: Token[], fn: (t: Token) => boolean): Token[][] => {
  const r: Token[][] = [];
  let t: Token[] = [];
  for (let i = 0, l = a.length; i < l; i++) {
    const c = a[i];
    if (fn(c)) {
      r.push(t);
      t = [];
    } else t.push(c);
  }
  r.push(t);
  return r;
};

const lambdaParams = (t: Token): [Name, boolean, Term | null][] => {
  if (t.tag === 'Name') return [[t.name, false, null]];
  if (t.tag === 'List') {
    const impl = t.bracket === '{';
    const a = t.list;
    if (a.length === 0) return [['_', impl, tunit]];
    const i = a.findIndex(v => v.tag === 'Name' && v.name === ':');
    if (i === -1) return isNames(a).map(x => [x, impl, null]);
    const ns = a.slice(0, i);
    const rest = a.slice(i + 1);
    const ty = exprs(rest, '(');
    return isNames(ns).map(x => [x, impl, ty]);
  }
  return serr(`invalid lambda param`);
};
const piParams = (t: Token): [Name, boolean, Term][] => {
  if (t.tag === 'Name') return [['_', false, expr(t)[0]]];
  if (t.tag === 'List') {
    const impl = t.bracket === '{';
    const a = t.list;
    if (a.length === 0) return [['_', impl, tunit]];
    const i = a.findIndex(v => v.tag === 'Name' && v.name === ':');
    if (i === -1) return [['_', impl, expr(t)[0]]];
    const ns = a.slice(0, i);
    const rest = a.slice(i + 1);
    const ty = exprs(rest, '(');
    return isNames(ns).map(x => [x, impl, ty]);
  }
  return serr(`invalid pi param`);
};

const expr = (t: Token): [Term, boolean] => {
  if (t.tag === 'List')
    return [exprs(t.list, '('), t.bracket === '{'];
  if (t.tag === 'Name') {
    const x = t.name;
    if (x === '*') return [Type, false];
    if (x === '_') return [Hole, false];
    if (x.includes('@')) return serr(`invalid name: ${x}`);
    if (/[a-z]/i.test(x[0])) return [Var(x), false];
    return serr(`invalid name: ${x}`);
  }
  if (t.tag === 'Num') {
    const n = +t.num;
    if (isNaN(n)) return serr(`invalid number: ${t.num}`);
    const s = Var('S');
    let c = Var('Z');
    for (let i = 0; i < n; i++) c = App(s, false, c);
    return [c, false];
  }
  return t;
};

const exprs = (ts: Token[], br: BracketO): Term => {
  if (br === '{') return serr(`{} cannot be used here`);
  if (ts.length === 0) return unit;
  if (ts.length === 1) return expr(ts[0])[0];
  const i = ts.findIndex(x => isName(x, ':'));
  if (i >= 0) {
    const a = ts.slice(0, i);
    const b = ts.slice(i + 1);
    return Ann(exprs(a, '('), exprs(b, '('));
  }
  if (isName(ts[0], '\\')) {
    const args: [Name, boolean, Term | null][] = [];
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
    const body = exprs(ts.slice(i + 1), '(');
    return args.reduceRight((x, [name, impl, ty]) => Abs(name, impl, ty, x), body);
  }
  if (isName(ts[0], 'open')) {
    const args: Name[] = [];
    let found = false;
    let i = 1;
    for (; i < ts.length; i++) {
      const c = ts[i];
      if (c.tag === 'Name') {
        if (c.name === 'in') {
          found = true;
          break;
        } else {
          args.push(c.name);
          continue;
        }
      }
      return serr(`invalid name after open`);
    }
    if (!found) return serr(`in not found after open`);
    if (args.length === 0) return serr(`empty open`);
    const body = exprs(ts.slice(i + 1), '(');
    return Open(args, body);
  }
  if (isName(ts[0], 'unroll')) {
    const body = exprs(ts.slice(1), '(');
    return Unroll(body);
  }
  if (isName(ts[0], 'roll')) {
    const [ty] = expr(ts[1]);
    const body = exprs(ts.slice(2), '(');
    return Roll(ty, body);
  }
  if (isName(ts[0], 'fix')) {
    const args: [Name, boolean, Term | null][] = [];
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
    if (!found) return serr(`. not found after fix`);
    const rargs: [Name, Name, Term][] = [];
    args.forEach(([x, i, t]) => {
      if (i) return serr(`fix arg cannot be implicit`);
      if (!t) return serr(`fix arg must have a type annotation`);
      const self = x.includes('@') ? x.split('@')[0] : '_';
      const y = x.includes('@') ? x.split('@')[1] : x;
      return rargs.push([self, y, t]);
    })
    const body = exprs(ts.slice(i + 1), '(');
    return rargs.reduceRight((x, [self, name, ty]) => Fix(self, name, ty, x), body);
  }
  if (isName(ts[0], 'rec')) {
    const args: [Name, boolean, Term | null][] = [];
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
    if (!found) return serr(`. not found after rec`);
    const rargs: [Name, Term][] = [];
    args.forEach(([x, i, t]) => {
      if (i) return serr(`rec arg cannot be implicit`);
      if (!t) return serr(`rec arg must have a type annotation`);
      return rargs.push([x, t]);
    })
    const body = exprs(ts.slice(i + 1), '(');
    return rargs.reduceRight((x, [name, ty]) => Rec(name, ty, x), body);
  }
  if (isName(ts[0], 'iota')) {
    const args: [Name, boolean, Term | null][] = [];
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
    if (!found) return serr(`. not found after iota`);
    const rargs: [Name, Term][] = [];
    args.forEach(([x, i, t]) => {
      if (i) return serr(`iota arg cannot be implicit`);
      if (!t) return serr(`iota arg must have a type annotation`);
      return rargs.push([x, t]);
    })
    const body = exprs(ts.slice(i + 1), '(');
    return rargs.reduceRight((x, [name, ty]) => Iota(name, ty, x), body);
  }
  if (isName(ts[0], 'let')) {
    const x = ts[1];
    let impl = false;
    let name = 'ERROR';
    if (x.tag === 'Name') {
      name = x.name;
    } else if (x.tag === 'List' && x.bracket === '{') {
      const a = x.list;
      if (a.length !== 1) return serr(`invalid name for let`);
      const h = a[0];
      if (h.tag !== 'Name') return serr(`invalid name for let`);
      name = h.name;
      impl = true;
    } else return serr(`invalid name for let`);
    if (!isName(ts[2], '=')) return serr(`no = after name in let`);
    const vals: Token[] = [];
    let found = false;
    let i = 3;
    for (; i < ts.length; i++) {
      const c = ts[i];
      if (c.tag === 'Name' && c.name === 'in') {
        found = true;
        break;
      }
      vals.push(c);
    }
    if (!found) return serr(`no in after let`);
    if (vals.length === 0) return serr(`empty val in let`);
    const val = exprs(vals, '(');
    const body = exprs(ts.slice(i + 1), '(');
    return Let(name, impl, val, body);
  }
  const j = ts.findIndex(x => isName(x, '->'));
  if (j >= 0) {
    const s = splitTokens(ts, x => isName(x, '->'));
    if (s.length < 2) return serr(`parsing failed with ->`);
    const args: [Name, boolean, Term][] = s.slice(0, -1)
      .map(p => p.length === 1 ? piParams(p[0]) : [['_', false, exprs(p, '(')] as [Name, boolean, Term]])
      .reduce((x, y) => x.concat(y), []);
    const body = exprs(s[s.length - 1], '(');
    return args.reduceRight((x, [name, impl, ty]) => Pi(name, impl, ty, x), body);
  }
  const l = ts.findIndex(x => isName(x, '\\'));
  let all = [];
  if (l >= 0) {
    const first = ts.slice(0, l).map(expr);
    const rest = exprs(ts.slice(l), '(');
    all = first.concat([[rest, false]]);
  } else {
    all = ts.map(expr);
  }
  if (all.length === 0) return serr(`empty application`);
  if (all[0] && all[0][1]) return serr(`in application function cannot be between {}`);
  return all.slice(1).reduce((x, [y, impl]) => App(x, impl, y), all[0][0]);
};

export const parse = (s: string): Term => {
  const ts = tokenize(s);
  log(() => ts);
  const ex = exprs(ts, '(');
  log(() => ex);
  return ex;
};

export const parseDefs = (s: string): Def[] => {
  const ts = tokenize(s);
  if (ts[0].tag !== 'Name' || ts[0].name !== 'def')
    return serr(`def should start with "def"`);
  const spl = splitTokens(ts, t => t.tag === 'Name' && t.name === 'def');
  const ds: Def[] = [];
  for (let i = 0; i < spl.length; i++) {
    const c = spl[i];
    if (c.length === 0) continue;
    if (c[0].tag === 'Name') {
      let opq = false;
      let name;
      let fst = -1;
      if (c[0].name === 'opaque') {
        opq = true;
        if (c[1].tag !== 'Name')
          return serr(`def should start with a name`);
        name = c[1].name;
        fst = 2;
      } else {
        name = c[0].name;
        fst = 1;
      }
      const sym = c[fst];
      if (sym.tag !== 'Name') return serr(`def: after name should be : or =`);
      if (sym.name === '=') {
        ds.push(DDef(name, exprs(c.slice(fst + 1), '('), opq));
        continue;
      } else if (sym.name === ':') {
        const tyts: Token[] = [];
        let j = fst + 1;
        for (; j < c.length; j++) {
          const v = c[j];
          if (v.tag === 'Name' && v.name === '=')
            break;
          else tyts.push(v);
        }
        const ety = exprs(tyts, '(');
        const body = exprs(c.slice(j + 1), '(');
        ds.push(DDef(name, Ann(body, ety), opq));
        continue;
      } else return serr(`def: : or = expected but got ${sym.name}`);
    } else return serr(`def should start with a name`);
  }
  return ds;
};
