import { loadFile, serr } from './utils/utils';
import { Term, Var, App, Abs, Pi, Let, Hole, Sigma, Pair, PCore, PIndex, PName, Proj, Prim, Def, DDef, Type, DExecute } from './surface';
import { Name } from './names';
import { Expl, ImplUnif, isPrimName } from './core';
import { log } from './config';

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
  | { tag: 'List', list: Token[], bracket: BracketO }
  | { tag: 'Str', str: string };
const TName = (name: string): Token => ({ tag: 'Name', name });
const TNum = (num: string): Token => ({ tag: 'Num', num });
const TList = (list: Token[], bracket: BracketO): Token => ({ tag: 'List', list, bracket });
const TStr = (str: string): Token => ({ tag: 'Str', str });

const SYM1: string[] = ['\\', ':', '=', ',', '*'];
const SYM2: string[] = ['->', '**'];

const START = 0;
const NAME = 1;
const COMMENT = 2;
const NUMBER = 3;
const STRING = 4;
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
      else if (c === '"') state = STRING;
      else if (c === '.' && !/[\.\%\_a-z]/i.test(next)) r.push(TName('.'));
      else if (c + next === '--') i++, state = COMMENT;
      else if (/[\-\.\?\@\#\%\_a-z]/i.test(c)) t += c, state = NAME;
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
      if (!(/[a-z0-9\-\_\/]/i.test(c) || (c === '.' && /[a-z0-9]/i.test(next)))) {
        r.push(TName(t));
        t = '', i--, state = START;
      } else t += c;
    } else if (state === NUMBER) {
      if (!/[0-9a-z]/i.test(c)) {
        r.push(TNum(t));
        t = '', i--, state = START;
      } else t += c;
    } else if (state === COMMENT) {
      if (c === '\n') state = START;
    } else if (state === STRING) {
      if (c === '\\') esc = true;
      else if (esc) t += c, esc = false;
      else if (c === '"') {
        r.push(TStr(t));
        t = '', state = START;
      } else t += c;
    }
  }
  if (b.length > 0) return serr(`unclosed brackets: ${b.join(' ')}`);
  if (state !== START && state !== COMMENT)
    return serr('invalid tokenize end state');
  if (esc) return serr(`escape is true after tokenize`);
  return r;
};

const tunit = Var('U');
const unit = Var('Unit');

const isName = (t: Token, x: Name): boolean =>
  t.tag === 'Name' && t.name === x;
const isNames = (t: Token[]): Name[] =>
  t.map(x => {
    if (x.tag !== 'Name') return serr(`expected name`);
    return x.name;
  });

const splitTokens = (a: Token[], fn: (t: Token) => boolean, keepSymbol: boolean = false): Token[][] => {
  const r: Token[][] = [];
  let t: Token[] = [];
  for (let i = 0, l = a.length; i < l; i++) {
    const c = a[i];
    if (fn(c)) {
      r.push(t);
      t = keepSymbol ? [c] : [];
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

const parseProj = (t: Term, xx: string): Term => {
  const spl = xx.split('.');
  let c = t;
  for (let i = 0; i < spl.length; i++) {
    const x = spl[i];
    const n = +x;
    let proj;
    if (!isNaN(n) && n >= 0 && Math.floor(n) === n) proj = PIndex(n);
    else if (x === 'fst') proj = PCore('fst');
    else if (x === 'snd') proj = PCore('snd');
    else proj = PName(x);
    c = Proj(proj, c);
  }
  return c;
};

const codepoints = (s: string): number[] => {
  const chars: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c1 = s.charCodeAt(i);
    if (c1 >= 0xD800 && c1 < 0xDC00 && i + 1 < s.length) {
      const c2 = s.charCodeAt(i + 1);
      if (c2 >= 0xDC00 && c2 < 0xE000) {
        chars.push(0x10000 + ((c1 - 0xD800) << 10) + (c2 - 0xDC00));
        i++;
        continue;
      }
    }
    chars.push(c1);
  }
  return chars;
};

const numToNat = (n: number): Term => {
  if (isNaN(n)) return serr(`invalid nat number: ${n}`);
  const s = Var('S');
  let c: Term = Var('Z');
  for (let i = 0; i < n; i++) c = App(s, Expl, c);
  return c;
};

const expr = (t: Token): [Term, boolean] => {
  if (t.tag === 'List')
    return [exprs(t.list, '('), t.bracket === '{'];
  if (t.tag === 'Str') {
    const s = codepoints(t.str).reverse();
    const Cons = Var('Cons');
    const Nil = Var('Nil');
    return [s.reduce((t, n) => App(App(Cons, Expl, numToNat(n)), Expl, t), Nil as Term), false];
  }
  if (t.tag === 'Name') {
    const x = t.name;
    if (x === '*') return [Type, false];
    if (x.startsWith('_')) {
      const rest = x.slice(1);
      return [Hole(rest.length > 0 ? rest : null), false];
    }
    if (x[0] === '%') {
      const rest = x.slice(1);
      if (isPrimName(rest)) return [Prim(rest), false];
      return serr(`invalid primitive: ${x}`);
    }
    if (/[a-z]/i.test(x[0])) {
      if (x.includes('.')) {
        const spl = x.split('.');
        const v = spl[0];
        const rest = spl.slice(1).join('.');
        return [parseProj(Var(v), rest), false];
      }
      return [Var(x), false];
    }
    return serr(`invalid name: ${x}`);
  }
  if (t.tag === 'Num') {
    if (t.num.endsWith('b')) {
      const n = +t.num.slice(0, -1);
      if (isNaN(n)) return serr(`invalid number: ${t.num}`);
      const s0 = Var('B0');
      const s1 = Var('B1');
      let c: Term = Var('BE');
      const s = n.toString(2);
      for (let i = 0; i < s.length; i++) c = App(s[i] === '0' ? s0 : s1, Expl, c);
      return [c, false];
    } else if (t.num.endsWith('f')) {
      const n = +t.num.slice(0, -1);
      if (isNaN(n)) return serr(`invalid number: ${t.num}`);
      const s = Var('FS');
      let c: Term = Var('FZ');
      for (let i = 0; i < n; i++) c = App(s, Expl, c);
      return [c, false];
    } else if (t.num.endsWith('n')) {
      return [numToNat(+t.num.slice(0, -1)), false];
    } else {
      return [numToNat(+t.num), false];
    }
  }
  return t;
};

const exprs = (ts: Token[], br: BracketO): Term => {
  if (br === '{') return serr(`{} cannot be used here`);
  if (ts.length === 0) return unit;
  if (ts.length === 1) return expr(ts[0])[0];
  if (isName(ts[0], 'let')) {
    const x = ts[1];
    let name = 'ERROR';
    if (x.tag === 'Name') {
      name = x.name;
    } else if (x.tag === 'List' && x.bracket === '{') {
      const a = x.list;
      if (a.length !== 1) return serr(`invalid name for let`);
      const h = a[0];
      if (h.tag !== 'Name') return serr(`invalid name for let`);
      name = h.name;
    } else return serr(`invalid name for let`);
    let ty: Term | null = null;
    let j = 2;
    if (isName(ts[j], ':')) {
      const tyts: Token[] = [];
      j++;
      for (; j < ts.length; j++) {
        const v = ts[j];
        if (v.tag === 'Name' && v.name === '=')
          break;
        else tyts.push(v);
      }
      ty = exprs(tyts, '(');
    }
    if (!isName(ts[j], '=')) return serr(`no = after name in let`);
    const vals: Token[] = [];
    let found = false;
    let i = j + 1;
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
    const erased = name[0] === '-';
    const name2 = name[0] === '-' ? name.slice(1) : name;
    if (ty)
      return Let(erased, name2, ty, val, body);
    return Let(erased, name2, null, val, body);
  }
  const i = ts.findIndex(x => isName(x, ':'));
  if (i >= 0) {
    const a = ts.slice(0, i);
    const b = ts.slice(i + 1);
    return Let(false, 'x', exprs(b, '('), exprs(a, '('), Var('x'));
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
    if (!found) return serr(`. not found after \\ or there was no whitespace after .`);
    const body = exprs(ts.slice(i + 1), '(');
    return args.reduceRight((x, [name, impl, ty]) => Abs(impl ? ImplUnif : Expl, name[0] === '-', name[0] === '-' ? name.slice(1) : name, ty, x), body);
  }
  if (ts[0].tag === 'Name' && ts[0].name[0] === '.') {
    const x = ts[0].name.slice(1);
    if (ts.length < 2) return serr(`something went wrong when parsing .${x}`);
    if (ts.length === 2) {
      const [term, tb] = expr(ts[1]);
      if (tb) return serr(`something went wrong when parsing .${x}`);
      return parseProj(term, x);
    }
    const indPart = ts.slice(0, 2);
    const rest = ts.slice(2);
    return exprs([TList(indPart, '(')].concat(rest), '(');
  }
  const j = ts.findIndex(x => isName(x, '->'));
  if (j >= 0) {
    const s = splitTokens(ts, x => isName(x, '->'));
    if (s.length < 2) return serr(`parsing failed with ->`);
    const args: [Name, boolean, Term][] = s.slice(0, -1)
      .map(p => p.length === 1 ? piParams(p[0]) : [['_', false, exprs(p, '(')] as [Name, boolean, Term]])
      .reduce((x, y) => x.concat(y), []);
    const body = exprs(s[s.length - 1], '(');
    return args.reduceRight((x, [name, impl, ty]) => Pi(impl ? ImplUnif : Expl, name[0] === '-', name[0] === '-' ? name.slice(1) : name, ty, x), body);
  }
  const jp = ts.findIndex(x => isName(x, ','));
  if (jp >= 0) {
    const s = splitTokens(ts, x => isName(x, ','));
    if (s.length < 2) return serr(`parsing failed with ,`);
    const args: [Term, boolean][] = s.map(x => {
      if (x.length === 1) {
        const h = x[0];
        if (h.tag === 'List' && h.bracket === '{')
          return expr(h)
      }
      return [exprs(x, '('), false];
    });
    if (args.length === 0) return serr(`empty pair`);
    if (args.length === 1) return serr(`singleton pair`);
    const last1 = args[args.length - 1];
    const last2 = args[args.length - 2];
    const lastitem = Pair(last2[0], last1[0]);
    return args.slice(0, -2).reduceRight((x, [y, _p]) => Pair(y, x), lastitem);
  }
  const js = ts.findIndex(x => isName(x, '**'));
  if (js >= 0) {
    const s = splitTokens(ts, x => isName(x, '**'));
    if (s.length < 2) return serr(`parsing failed with **`);
    const args: [Name, boolean, Term][] = s.slice(0, -1)
      .map(p => p.length === 1 ? piParams(p[0]) : [['_', false, exprs(p, '(')] as [Name, boolean, Term]])
      .reduce((x, y) => x.concat(y), []);
    const rest = s[s.length - 1];
    let body: [Term, boolean];
    if (rest.length === 1) {
      const h = rest[0];
      if (h.tag === 'List' && h.bracket === '{')
        body = expr(h)
      else body = [exprs(s[s.length - 1], '('), false];
    } else body = [exprs(s[s.length - 1], '('), false];
    const last = args[args.length - 1];
    const lasterased = last[0][0] === '-';
    const lastname = last[0][0] === '-' ? last[0].slice(1) : last[0];
    const lastitem = Sigma(lasterased, lastname, last[2], body[0]);
    return args.slice(0, -1).reduceRight((x, [name, _impl, ty]) => {
      const erased = name[0] === '-';
      const name2 = name[0] === '-' ? name.slice(1) : name;
      return Sigma(erased, name2, ty, x);
    }, lastitem);
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
  return all.slice(1).reduce((x, [y, impl]) => App(x, impl ? ImplUnif : Expl, y), all[0][0]);
};

export const parse = (s: string): Term => {
  const ts = tokenize(s);
  const ex = exprs(ts, '(');
  return ex;
};

type FileMap = { [key: string]: [string[], Def[]] };
const addDef = (m: FileMap, x: string, d: Def): void => { m[x][1].push(d) };
export const parseDef = async (c: Token[], file: string, fileorder: string[], filemap: FileMap): Promise<void> => {
  if (!filemap[file]) filemap[file] = [[], []];
  if (c.length === 0) return;
  if (c[0].tag === 'Name' && c[0].name === 'import') {
    const files = c.slice(1).map(t => {
      if (t.tag !== 'Name' && t.tag !== 'Num' && t.tag !== 'Str') return serr(`trying to import a non-path`);
      const name = t.tag === 'Name' ? t.name : t.tag === 'Num' ? t.num : t.str;
      filemap[file][0].push(name);
      if (fileorder.includes(name)) {
        log(() => `skipping import ${name}`);
        return null;
      }
      fileorder.push(name);
      return name;
    }).filter(x => x) as string[];
    if (files.length === 0) return;
    log(() => `import all ${files.join(' ')}`);
    await Promise.all(files.map(async f => {
      log(() => `import ${f}`);
      const m = await loadFile(f);
      await parseDefsR(m, f, fileorder, filemap);
      log(() => `parsed ${f}`);
    }));
    log(() => `imported ${files.join(' ')}`);
    return;
  } else if (c[0].tag === 'Name' && c[0].name === 'def') {
    const x = c[1];
    let impl = false;
    let name = '';
    if (x.tag === 'Name') {
      name = x.name;
    } else if (x.tag === 'List' && x.bracket === '{') {
      const a = x.list;
      if (a.length !== 1) return serr(`invalid name for def`);
      const h = a[0];
      if (h.tag !== 'Name') return serr(`invalid name for def`);
      name = h.name;
      impl = true;
    } else return serr(`invalid name for def`);
    if (impl) return serr(`definition cannot be implicit`);
    if (name) {
      const fst = 2;
      const sym = c[fst];
      if (sym.tag !== 'Name') return serr(`def: after name should be : or =`);
      if (sym.name === '=') {
        const erased = name[0] === '-';
        const name2 = erased ? name.slice(1) : name;
        return addDef(filemap, file, DDef(erased, name2, exprs(c.slice(fst + 1), '(')));
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
        const erased = name[0] === '-';
        const name2 = erased ? name.slice(1) : name;
        return addDef(filemap, file, DDef(erased, name2, Let(false, name, ety, body, Var(name))));
      } else return serr(`def: : or = expected but got ${sym.name}`);
    } else return serr(`def should start with a name`);
  } else if (c[0].tag === 'Name' && ['execute', '-execute', 'typecheck', '-typecheck'].includes(c[0].name)) {
    const command = c[0].name;
    const rest = c.slice(1);
    const term = exprs(rest, '(');
    return addDef(filemap, file, DExecute(term, command[0] === '-', command.endsWith('typecheck')));
  } else return serr(`def should start with ${defCommands.join(' or ')}`);
};

const defCommands = ['def', 'import', 'execute', 'typecheck', '-execute', '-typecheck'];

const parseDefsR = async (s: string, file: string, fileorder: string[], filemap: FileMap): Promise<void> => {
  log(() => `parseDefsR ${file}`);
  const ts = tokenize(s);
  if (ts.length === 0) return;
  if (ts[0].tag !== 'Name' || !defCommands.includes(ts[0].name))
    return serr(`def should start with ${defCommands.map(x => `"${x}"`).join(' or ')}`);
  const spl = splitTokens(ts, t => t.tag === 'Name' && defCommands.includes(t.name), true);
  await Promise.all(spl.map(s => parseDef(s, file, fileorder, filemap)));
};

export const parseDefs = async (s: string, file: string = '_TOPLEVEL_', fileorder: string[] = [file], filemap: FileMap = { [file]: [[], []] }): Promise<Def[]> => {
  await parseDefsR(s, file, fileorder, filemap);
  log(() => fileorder.join(' '));
  log(() => Object.keys(filemap).map(f => `${f} <- ${filemap[f][0].join(' ')}`).join('\n'));
  const all = fileorder.slice();
  const curfiles: string[] = [];
  const defs: Def[] = [];
  while (all.length > 0) {
    const i = all.findIndex(f => filemap[f][0].every(y => curfiles.includes(y)));
    if (i === -1) return serr(`could not find import order: ${curfiles.join(' ')}`);
    const f = all[i];
    log(() => `order import ${f}`);
    all.splice(i, 1);
    curfiles.push(f);
    filemap[f][1].forEach(d => defs.push(d));
  }
  return defs;
};
