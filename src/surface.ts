import { chooseName, Ix, Name } from './names';
import * as C from './core';
import { Mode, PrimName } from './core';
import { EnvV, quote, Val, zonk } from './values';
import { Cons, index, List, Nil } from './utils/list';
import { impossible } from './utils/utils';

export type ProjType = PName | PIndex | PCore;
export type PName = { tag: 'PName', name: Name };
export const PName = (name: Name): PName => ({ tag: 'PName', name });
export type PIndex = { tag: 'PIndex', index: Ix };
export const PIndex = (index: Ix): PIndex => ({ tag: 'PIndex', index });
export type PCore = { tag: 'PCore', proj: 'fst' | 'snd' };
export const PCore = (proj: 'fst' | 'snd'): PCore => ({ tag: 'PCore', proj });

export type Term = Var | Prim | App | Abs | Pair | Proj | Let | Pi | Sigma | Meta | Hole;

export type Var = { tag: 'Var', name: Name };
export const Var = (name: Name): Var => ({ tag: 'Var', name });
export type Prim = { tag: 'Prim', name: PrimName };
export const Prim = (name: PrimName): Prim => ({ tag: 'Prim', name });
export type App = { tag: 'App', left: Term, mode: Mode, right: Term };
export const App = (left: Term, mode: Mode, right: Term): App => ({ tag: 'App', left, mode, right });
export type Abs = { tag: 'Abs', mode: Mode, name: Name, type: Term | null, body: Term };
export const Abs = (mode: Mode, name: Name, type: Term | null, body: Term): Abs => ({ tag: 'Abs', mode, name, type, body });
export type Pair = { tag: 'Pair', fst: Term, snd: Term };
export const Pair = (fst: Term, snd: Term): Pair => ({ tag: 'Pair', fst, snd });
export type Proj = { tag: 'Proj', proj: ProjType, term: Term };
export const Proj = (proj: ProjType, term: Term): Proj => ({ tag: 'Proj', proj, term });
export type Let = { tag: 'Let', name: Name, type: Term | null, val: Term, body: Term };
export const Let = (name: Name, type: Term | null, val: Term, body: Term): Let => ({ tag: 'Let', name, type, val, body });
export type Pi = { tag: 'Pi', mode: Mode, name: Name, type: Term, body: Term };
export const Pi = (mode: Mode, name: Name, type: Term, body: Term): Pi => ({ tag: 'Pi', mode, name, type, body });
export type Sigma = { tag: 'Sigma', name: Name, type: Term, body: Term };
export const Sigma = (name: Name, type: Term, body: Term): Sigma => ({ tag: 'Sigma', name, type, body });
export type Meta = { tag: 'Meta', index: Ix };
export const Meta = (index: Ix): Meta => ({ tag: 'Meta', index });
export type Hole = { tag: 'Hole' };
export const Hole: Hole = { tag: 'Hole' };

export const Type = Prim('Type');

export const flattenApp = (t: Term): [Term, [Mode, Term][]] => {
  const r: [Mode, Term][] = [];
  while (t.tag === 'App') {
    r.push([t.mode, t.right]);
    t = t.left;
  }
  return [t, r.reverse()];
};
export const flattenAbs = (t: Term): [[Name, Mode, Term | null][], Term] => {
  const r: [Name, Mode, Term | null][] = [];
  while (t.tag === 'Abs') {
    r.push([t.name, t.mode, t.type]);
    t = t.body;
  }
  return [r, t];
};
export const flattenPi = (t: Term): [[Name, Mode, Term][], Term] => {
  const r: [Name, Mode, Term][] = [];
  while (t.tag === 'Pi') {
    r.push([t.name, t.mode, t.type]);
    t = t.body;
  }
  return [r, t];
};
export const flattenSigma = (t: Term): [[Name, Term][], Term] => {
  const r: [Name, Term][] = [];
  while (t.tag === 'Sigma') {
    r.push([t.name, t.type]);
    t = t.body;
  }
  return [r, t];
};
export const flattenPair = (t: Term): Term[] => {
  const r: Term[] = [];
  while (t.tag === 'Pair') {
    r.push(t.fst);
    t = t.snd;
  }
  r.push(t);
  return r;
};

const showP = (b: boolean, t: Term): string => b ? `(${show(t)})` : show(t);
const isSimple = (t: Term): boolean =>
  t.tag === 'Var' || t.tag === 'Prim' || t.tag === 'Meta' || t.tag === 'Hole' || (t.tag === 'Proj' && isSimple(t.term));
export const show = (t: Term): string => {
  if (t.tag === 'Var') return t.name;
  if (t.tag === 'Prim') return `%${t.name}`;
  if (t.tag === 'Meta') return `?${t.index}`;
  if (t.tag === 'Hole') return '_';
  if (t.tag === 'App') {
    const [f, as] = flattenApp(t);
    return `${showP(!isSimple(f), f)} ${as.map(([m, t], i) =>
      m === C.ImplUnif ? `{${show(t)}}` : showP(!isSimple(t) && !(t.tag === 'Abs' && i >= as.length), t)).join(' ')}`;
  }
  if (t.tag === 'Abs') {
    const [as, b] = flattenAbs(t);
    return `\\${as.map(([x, m, t]) => !t ?
      (m === C.ImplUnif ? `{${x}}` : x) :
      `${m === C.ImplUnif ? '{' : '('}${x} : ${show(t)}${m === C.ImplUnif ? '}' : ')'}`).join(' ')}. ${show(b)}`;
  }
  if (t.tag === 'Pi') {
    const [as, b] = flattenPi(t);
    return `${as.map(([x, m, t]) => x === '_' ?
      (m === C.ImplUnif ? `{${show(t)}}` : showP(!isSimple(t) && t.tag !== 'App', t)) :
      `${m === C.ImplUnif ? '{' : '('}${x} : ${show(t)}${m === C.ImplUnif ? '}' : ')'}`).join(' -> ')} -> ${show(b)}`;
  }
  if (t.tag === 'Let')
    return `let ${t.name}${t.type ? ` : ${showP(t.type.tag === 'Let', t.type)}` : ''} = ${showP(t.val.tag === 'Let', t.val)} in ${show(t.body)}`;
  if (t.tag === 'Sigma') {
    const [as, b] = flattenSigma(t);
    return `${as.map(([x, t]) => x === '_' ? showP(t.tag === 'Abs' || t.tag === 'Let' || t.tag === 'Pi' || t.tag === 'Sigma', t) : `${x} : ${showP(t.tag === 'Let', t)}`).join(' ** ')} ** ${showP(b.tag === 'Let', b)}`
  }
  if (t.tag === 'Pair') {
    const ps = flattenPair(t);
    return `(${ps.map(t => show(t)).join(', ')})`;
  }
  if (t.tag === 'Proj') {
    const proj = t.proj.tag === 'PName' ? t.proj.name : t.proj.tag === 'PIndex' ? t.proj.index : t.proj.proj;
    if (isSimple(t.term)) return `${show(t.term)}.${proj}`;
    return `.${proj} ${showP(true, t.term)}`;
  }
  return t;
};

export const toSurface = (t: C.Term, ns: List<Name> = Nil): Term => {
  if (t.tag === 'Meta') return Meta(t.index);
  if (t.tag === 'Var') return Var(index(ns, t.index) || impossible(`toSurface: index out of scope: ${t.index}`));
  if (t.tag === 'Global') return Var(t.name);
  if (t.tag === 'Prim') return Prim(t.name);
  if (t.tag === 'App') return App(toSurface(t.left, ns), t.mode, toSurface(t.right, ns));
  if (t.tag === 'Pair') return Pair(toSurface(t.fst, ns), toSurface(t.snd, ns));
  if (t.tag === 'Proj') return Proj(PCore(t.proj), toSurface(t.term, ns));
  if (t.tag === 'Abs') {
    const x = chooseName(t.name, ns);
    return Abs(t.mode, x, toSurface(t.type, ns), toSurface(t.body, Cons(x, ns)));
  }
  if (t.tag === 'Pi') {
    const x = chooseName(t.name, ns);
    return Pi(t.mode, x, toSurface(t.type, ns), toSurface(t.body, Cons(x, ns)));
  }
  if (t.tag === 'Sigma') {
    const x = chooseName(t.name, ns);
    return Sigma(x, toSurface(t.type, ns), toSurface(t.body, Cons(x, ns)));
  }
  if (t.tag === 'Let') {
    const x = chooseName(t.name, ns);
    return Let(x, toSurface(t.type, ns), toSurface(t.val, ns), toSurface(t.body, Cons(x, ns)));
  }
  return t;
};

export const showCore = (t: C.Term, ns: List<Name> = Nil): string => show(toSurface(t, ns));
export const showVal = (v: Val, k: Ix = 0, ns: List<Name> = Nil, full: boolean = false): string => show(toSurface(quote(v, k, full), ns));
export const showCoreZ = (t: C.Term, vs: EnvV = Nil, k: Ix = 0, ns: List<Name> = Nil): string => show(toSurface(zonk(t, vs, k), ns));
export const showValZ = (v: Val, vs: EnvV = Nil, k: Ix = 0, ns: List<Name> = Nil, full: boolean = false): string => show(toSurface(zonk(quote(v, k, full), vs, k), ns));

export type Def = DDef;

export type DDef = { tag: 'DDef', name: Name, value: Term };
export const DDef = (name: Name, value: Term): DDef => ({ tag: 'DDef', name, value });

export const showDef = (d: Def): string => {
  if (d.tag === 'DDef') return `def ${d.name} = ${show(d.value)}`;
  return d.tag;
};
export const showDefs = (ds: Def[]): string => ds.map(showDef).join('\n');
