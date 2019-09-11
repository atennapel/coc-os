import { STerm, SVar, sappFrom, SAbs, sabs, SAnn, SPi, SFix, sfunFrom } from './surface';
import { Type } from './terms';

const err = (msg: string) => { throw new SyntaxError(msg) };

type Token = { tag: 'Name', name: string } | { tag: 'List', list: Token[] };
const TName = (name: string): Token => ({ tag: 'Name', name });
const TList = (list: Token[]): Token => ({ tag: 'List', list });

type Bracket = '(' | ')';
const matchingBracket = (c: Bracket): Bracket => {
  if(c === '(') return ')';
  if(c === ')') return '(';
  return err(`invalid bracket: ${c}`);
}

const SYM1: string[] = ['\\', ':', '/', '*'];
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
        if(b.length === 0) return err(`unmatched bracket: ${c}`);
        const br = b.pop() as Bracket;
        if(matchingBracket(br) !== c) return err(`unmatched bracket: ${br} and ${c}`);
        const a: Token[] = p.pop() as Token[];
        a.push(TList(r));
        r = a;
      }
      else if (/\s/.test(c)) continue;
      else return err(`invalid char ${c} in tokenize`);
    } else if (state === NAME) {
      if (!/[a-z0-9\_]/i.test(c)) {
        r.push(TName(t));
        t = '', i--, state = START;
      } else t += c;
    } else if (state === COMMENT) {
      if (c === '\n') state = START;
    }
  }
  if (b.length > 0) return err(`unclosed brackets: ${b.join(' ')}`);
  if (state !== START && state !== COMMENT)
    return err('invalid tokenize end state');
  if (esc) return err(`escape is true after tokenize`);
  return r;
};

const exprs = (ts: Token[]): STerm => {
  if (ts.length === 0) return SVar('Unit');
  if (ts.length === 1) return expr(ts[0]);
  const head = ts[0];
  if (head.tag === 'Name') {
    const x = head.name;
    if (x === '\\' || x === 'fn') {
      const args = ts[1];
      if (!args) return err(`abs missing args`);
      const rest = exprs(ts.slice(2));
      if (args.tag === 'Name') return SAbs(args.name, rest);
      return sabs(args.list.map(a => a.tag === 'Name' ? a.name : err(`nested list in args of abs`)), rest);
    }
    if (x === '/' || x === 'pi') {
      if (ts.length < 3) return err(`invalid use of / or pi`);
      const arg = ts[1];
      if (arg.tag !== 'Name') return err(`invalid arg for pi`);
      const rest = exprs(ts.slice(3));
      return SPi(arg.name, expr(ts[2]), rest);
    }
    if (x === 'fix') {
      if (ts.length < 3) return err(`invalid use of fix`);
      const arg = ts[1];
      if (arg.tag !== 'Name') return err(`invalid arg for fix`);
      const rest = exprs(ts.slice(3));
      return SFix(arg.name, expr(ts[2]), rest);
    }
    if (x === ':') {
      if (ts.length !== 3) return err(`invalid annotation`);
      return SAnn(expr(ts[1]), expr(ts[2]));
    }
    if (x === '->') {
      return sfunFrom(ts.slice(1).map(expr));
    }
  }
  return sappFrom(ts.map(expr));
};
const expr = (t: Token): STerm => {
  if (t.tag === 'List') return exprs(t.list);
  const x = t.name;
  if (x === '*') return Type;
  return SVar(x);
};

export const parse = (s: string): STerm => {
  const ts = tokenize(s);
  return exprs(ts);
};