import { Term, Var, Type, Hole, Ann, Let, Pi, Abs, App } from './terms';

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

const SYM1: string[] = ['\\', ':', '/', '*', '@'];
const SYM2: string[] = ['\\:', '->', '\\@', '\\@:', '/@', '-@'];

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
      else if (c === '#') t += c, state = NAME;
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

const exprs = (ts: Token[]): Term => {
  if (ts.length === 0) return Var('Unit');
  if (ts.length === 1) return expr(ts[0]);
  const head = ts[0];
  if (head.tag === 'Name') {
    const x = head.name;
    if (x === '\\' || x === 'fn' || x === '\\@' || x === 'fni') {
      const args = ts[1];
      if (!args) return err(`abs missing args`);
      const rest = exprs(ts.slice(2));
      const impl = x === '\\@' || x === 'fni';
      if (args.tag === 'Name') return Abs(args.name, null, impl, rest);
      return args.list.map(a => a.tag === 'Name' ? a.name : err(`nested list in args of abs`))
        .reduceRight((x, y) => Abs(y, null, impl, x), rest);
    }
    if (x === '/' || x === 'pi' || x === '/@' || x === 'pii') {
      if (ts.length < 3) return err(`invalid use of / or pi`);
      const arg = ts[1];
      if (arg.tag !== 'Name') return err(`invalid arg for pi`);
      const rest = exprs(ts.slice(3));
      const impl = x === '/@' || x === 'pii';
      return Pi(arg.name, expr(ts[2]), impl, rest);
    }
    if (x === '\\:' || x === 'fnt' || x === '\\@:' || x === 'fnit') {
      if (ts.length < 3) return err(`invalid use of \\: or fnt`);
      const arg = ts[1];
      if (arg.tag !== 'Name') return err(`invalid arg for fnt`);
      const rest = exprs(ts.slice(3));
      const impl = x === '\\@:' || x === 'fnit';
      return Abs(arg.name, expr(ts[2]), impl, rest);
    }
    if (x === ':') {
      if (ts.length !== 3) return err(`invalid annotation`);
      return Ann(expr(ts[1]), expr(ts[2]));
    }
    if (x === '->' || x === '-@') {
      const impl = x === '-@';
      return ts.slice(1).map(expr).reduceRight((x, y) => Pi('_', y, impl, x));
    }
    if (x === 'let' || x === 'leti') {
      if (ts.length < 3) return err(`invalid let`);
      const xx = ts[1];
      if (xx.tag !== 'Name') return err(`invalid let name`);
      const rest = exprs(ts.slice(3));
      const impl = x === 'leti';
      return Let(xx.name, null, impl, expr(ts[2]), rest);
    }
    if (x === 'lett' || x === 'letit') {
      if (ts.length < 4) return err(`invalid lett`);
      const xx = ts[1];
      if (xx.tag !== 'Name') return err(`invalid let name`);
      const rest = exprs(ts.slice(4));
      const impl = x === 'letit';
      return Let(xx.name, expr(ts[3]), impl, rest, expr(ts[2]));
    }
    if (x === '@') {
      if (ts.length !== 3) return err(`invalid implicit application`);
      return App(expr(ts[1]), true, expr(ts[2]));
    }
  }
  return ts.map(expr).reduce((x, y) => App(x, false, y));
};

const expr = (t: Token): Term => {
  if (t.tag === 'List') return exprs(t.list);
  const x = t.name;
  if (x === '*') return Type;
  if (x === '_') return Hole;
  return Var(x);
};

export const parse = (s: string): Term => {
  const ts = tokenize(s);
  return exprs(ts);
};
