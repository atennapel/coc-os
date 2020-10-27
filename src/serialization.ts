import { PrimName, Mode } from './core';
import { Ix, Name } from './names';
import { Data } from './utils/adt';
import * as C from './core';
import { impossible } from './utils/utils';

export type Term = Data<{
  Var: { index: Ix },
  Prim: { name: PrimName },
  Global: { name: Name },

  Pi: { mode: Mode, erased: boolean, type: Term, body: Term },
  Abs: { mode: Mode, erased: boolean, type: Term, body: Term },
  App: { left: Term, mode: Mode, right: Term },

  Sigma: { erased: boolean, type: Term, body: Term },
  Pair: { fst: Term, snd: Term, type: Term },
  Proj: { proj: 'fst' | 'snd', term: Term },

  Let: { erased: boolean, type: Term, val: Term, body: Term },
}>;
export const Var = (index: Ix): Term => ({ tag: 'Var', index });
export const Prim = (name: PrimName): Term => ({ tag: 'Prim', name });
export const Global = (name: Name): Term => ({ tag: 'Global', name });
export const App = (left: Term, mode: Mode, right: Term): Term => ({ tag: 'App', left, mode, right });
export const Abs = (mode: Mode, erased: boolean, type: Term, body: Term): Term => ({ tag: 'Abs', erased, mode, type, body });
export const Pair = (fst: Term, snd: Term, type: Term): Term => ({ tag: 'Pair', fst, snd, type });
export const Proj = (proj: 'fst' | 'snd', term: Term): Term => ({ tag: 'Proj', proj, term });
export const Let = (erased: boolean, type: Term, val: Term, body: Term): Term => ({ tag: 'Let', erased, type, val, body });
export const Pi = (mode: Mode, erased: boolean, type: Term, body: Term): Term => ({ tag: 'Pi', mode, erased, type, body });
export const Sigma = (erased: boolean, type: Term, body: Term): Term => ({ tag: 'Sigma', erased, type, body });

const fromCoreR = (t: C.Term, ns: Name[]): Term => {
  if (t.tag === 'Var') return Var(t.index);
  if (t.tag === 'Prim') return Prim(t.name);
  if (t.tag === 'Global') return Global(t.name);
  if (t.tag === 'App') return App(fromCoreR(t.left, ns), t.mode, fromCoreR(t.right, ns));
  if (t.tag === 'Proj') return Proj(t.proj, fromCoreR(t.term, ns));
  if (t.tag === 'Pair') return Pair(fromCoreR(t.fst, ns), fromCoreR(t.snd, ns), fromCoreR(t.type, ns));
  if (t.tag === 'Pi') {
    ns.push(t.name);
    return Pi(t.mode, t.erased, fromCoreR(t.type, ns), fromCoreR(t.body, ns));
  }
  if (t.tag === 'Abs') {
    ns.push(t.name);
    return Abs(t.mode, t.erased, fromCoreR(t.type, ns), fromCoreR(t.body, ns));
  }
  if (t.tag === 'Sigma') {
    ns.push(t.name);
    return Sigma(t.erased, fromCoreR(t.type, ns), fromCoreR(t.body, ns));
  }
  if (t.tag === 'Let') {
    ns.push(t.name);
    return Let(t.erased,fromCoreR(t.type, ns), fromCoreR(t.val, ns), fromCoreR(t.body, ns));
  }
  return impossible(`fromCore: ${t.tag}`);
};

export const fromCore = (t: C.Term): [Term, Name[]] => {
  const ns: Name[] = [];
  const tm = fromCoreR(t, ns);
  return [tm, ns];
};

const toCoreR = (t: Term, ns: Name[] | null): C.Term => {
  if (t.tag === 'Var') return C.Var(t.index);
  if (t.tag === 'Prim') return C.Prim(t.name);
  if (t.tag === 'Global') return C.Global(t.name);
  if (t.tag === 'Pair') return C.Pair(toCoreR(t.fst, ns), toCoreR(t.snd, ns), toCoreR(t.type, ns));
  if (t.tag === 'Proj') return C.Proj(t.proj, toCoreR(t.term, ns));
  if (t.tag === 'App') return C.App(toCoreR(t.left, ns), t.mode, toCoreR(t.right, ns));
  if (t.tag === 'Pi') return C.Pi(t.mode, t.erased, ns ? ns.pop() || 'x' : 'x', toCoreR(t.type, ns), toCoreR(t.body, ns));
  if (t.tag === 'Abs') return C.Abs(t.mode, t.erased, ns ? ns.pop() || 'x' : 'x', toCoreR(t.type, ns), toCoreR(t.body, ns));
  if (t.tag === 'Sigma') return C.Sigma(t.erased, ns ? ns.pop() || 'x' : 'x', toCoreR(t.type, ns), toCoreR(t.body, ns));
  if (t.tag === 'Let') return C.Let(t.erased, ns ? ns.pop() || 'x' : 'x', toCoreR(t.type, ns), toCoreR(t.val, ns), toCoreR(t.body, ns));
  return t;
};

export const toCore = (t: Term, ns: Name[] | null = null): C.Term => {
  const core = toCoreR(t, ns ? ns.slice().reverse() : ns);
  return core;
};

export const serializeCore = (t: C.Term): [string, Name[]] => {
  const [tm, ns] = fromCore(t)
  const str = JSON.stringify(tm);
  return [str, ns];
};
export const deserializeCore = (s: string, ns: Name[] | null = null): C.Term => {
  try { return toCore(JSON.parse(s) as Term, ns); } catch (err) { return impossible(`deserializeCore: ${err}`) }
};
