import { chooseName, Ix, Name } from './names';
import * as C from './core';
import { Mode, PrimName } from './core';
import { EnvV, quote, Val, zonk } from './values';
import { Cons, index, List, Nil } from './utils/list';
import { impossible } from './utils/utils';
import { Data } from './utils/adt';

export type ProjType = Data<{
  PName: { name: Name },
  PIndex: { index: Ix },
  PCore: { proj: 'fst' | 'snd' },
}>;
export const PName = (name: Name): ProjType => ({ tag: 'PName', name });
export const PIndex = (index: Ix): ProjType => ({ tag: 'PIndex', index });
export const PCore = (proj: 'fst' | 'snd'): ProjType => ({ tag: 'PCore', proj });

export type SignatureEntry = { erased: boolean, name: Name, type: Term | null };
export type ModuleEntry = { private: boolean, erased: boolean, name: Name, type: Term | null, val: Term };
export type Term = Data<{
  Var: { name: Name },
  Prim: { name: PrimName },
  Meta: { index: Ix },

  Pi: { mode: Mode, erased: boolean, name: Name, type: Term, body: Term },
  Abs: { mode: Mode, erased: boolean, name: Name, type: Term | null, body: Term },
  App: { left: Term, mode: Mode, right: Term },

  Sigma: { erased: boolean, name: Name, type: Term, body: Term },
  Pair: { fst: Term, snd: Term },
  Proj: { proj: ProjType, term: Term },

  Let: { erased: boolean, name: Name, type: Term | null, val: Term, body: Term },
  Hole: { name: Name | null },

  Signature: { defs: SignatureEntry[] },
  Module: { defs: ModuleEntry[] },
}>;
export const Var = (name: Name): Term => ({ tag: 'Var', name });
export const Prim = (name: PrimName): Term => ({ tag: 'Prim', name });
export const App = (left: Term, mode: Mode, right: Term): Term => ({ tag: 'App', left, mode, right });
export const Abs = (mode: Mode, erased: boolean, name: Name, type: Term | null, body: Term): Term => ({ tag: 'Abs', mode, erased, name, type, body });
export const Pair = (fst: Term, snd: Term): Term => ({ tag: 'Pair', fst, snd });
export const Proj = (proj: ProjType, term: Term): Term => ({ tag: 'Proj', proj, term });
export const Let = (erased: boolean, name: Name, type: Term | null, val: Term, body: Term): Term => ({ tag: 'Let', erased, name, type, val, body });
export const Pi = (mode: Mode, erased: boolean, name: Name, type: Term, body: Term): Term => ({ tag: 'Pi', mode, erased, name, type, body });
export const Sigma = (erased: boolean, name: Name, type: Term, body: Term): Term => ({ tag: 'Sigma', erased, name, type, body });
export const Meta = (index: Ix): Term => ({ tag: 'Meta', index });
export const Hole = (name: Name | null): Term => ({ tag: 'Hole', name });
export const Signature = (defs: SignatureEntry[]): Term => ({ tag: 'Signature', defs });
export const Module = (defs: ModuleEntry[]): Term => ({ tag: 'Module', defs });

export const Type = Prim('Type');

export const flattenApp = (t: Term): [Term, [Mode, Term][]] => {
  const r: [Mode, Term][] = [];
  while (t.tag === 'App') {
    r.push([t.mode, t.right]);
    t = t.left;
  }
  return [t, r.reverse()];
};
export const flattenAbs = (t: Term): [[Name, Mode, boolean, Term | null][], Term] => {
  const r: [Name, Mode, boolean, Term | null][] = [];
  while (t.tag === 'Abs') {
    r.push([t.name, t.mode, t.erased, t.type]);
    t = t.body;
  }
  return [r, t];
};
export const flattenPi = (t: Term): [[Name, Mode, boolean, Term][], Term] => {
  const r: [Name, Mode, boolean, Term][] = [];
  while (t.tag === 'Pi') {
    r.push([t.name, t.mode, t.erased, t.type]);
    t = t.body;
  }
  return [r, t];
};
export const flattenSigma = (t: Term): [[Name, boolean, Term][], Term] => {
  const r: [Name, boolean, Term][] = [];
  while (t.tag === 'Sigma') {
    r.push([t.name, t.erased, t.type]);
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
  t.tag === 'Var' || t.tag === 'Prim' || t.tag === 'Meta' || t.tag === 'Hole' || t.tag === 'Pair' || (t.tag === 'Proj' && isSimple(t.term));
export const show = (t: Term): string => {
  if (t.tag === 'Var') return t.name;
  if (t.tag === 'Prim') return t.name === 'Type' ? '*' : `%${t.name}`;
  if (t.tag === 'Meta') return `?${t.index}`;
  if (t.tag === 'Hole') return `_${t.name || ''}`;
  if (t.tag === 'App') {
    const [f, as] = flattenApp(t);
    return `${showP(!isSimple(f), f)} ${as.map(([m, t], i) =>
      m.tag === 'ImplUnif' ? `{${show(t)}}` : showP(!isSimple(t) && !(t.tag === 'Abs' && i >= as.length), t)).join(' ')}`;
  }
  if (t.tag === 'Abs') {
    const [as, b] = flattenAbs(t);
    return `\\${as.map(([x, m, e, t]) => !t ?
      (m.tag === 'ImplUnif' ? `{${e ? '-' : ''}${x}}` : `${e ? '-' : ''}${x}`) :
      `${m.tag === 'ImplUnif' ? '{' : '('}${e ? '-' : ''}${x} : ${show(t)}${m.tag === 'ImplUnif' ? '}' : ')'}`).join(' ')}. ${show(b)}`;
  }
  if (t.tag === 'Pi') {
    const [as, b] = flattenPi(t);
    return `${as.map(([x, m, e, t]) => x === '_' && !e?
      (m.tag === 'ImplUnif' ? `{${show(t)}}` : showP(!isSimple(t) && t.tag !== 'App', t)) :
      `${m.tag === 'ImplUnif' ? '{' : '('}${e ? '-' : ''}${x} : ${show(t)}${m.tag === 'ImplUnif' ? '}' : ')'}`).join(' -> ')} -> ${show(b)}`;
  }
  if (t.tag === 'Let')
    return `let ${t.erased ? '-' : ''}${t.name}${t.type ? ` : ${showP(t.type.tag === 'Let', t.type)}` : ''} = ${showP(t.val.tag === 'Let', t.val)}; ${show(t.body)}`;
  if (t.tag === 'Sigma') {
    const [as, b] = flattenSigma(t);
    return `${as.map(([x, e, t]) => !e && x === '_' ? showP(t.tag === 'Abs' || t.tag === 'Let' || t.tag === 'Pi' || t.tag === 'Sigma', t) : `(${e ? '-' : ''}${x} : ${showP(t.tag === 'Let', t)})`).join(' ** ')} ** ${showP(b.tag === 'Let', b)}`
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
  if (t.tag === 'Signature')
    return `signature { ${t.defs.map(({ erased, name, type}) => `def ${erased ? '_' : ''}${name}${type ? ` : ${show(type)}` : ''}`).join(' ')} }`;
  if (t.tag === 'Module')
    return `module { ${t.defs.map(({ private: private_, erased, name, type, val }) => `${private_ ? 'private' : 'public'} ${erased ? '-' : ''}${name}${type ? ` : ${show(type)}` : ''} = ${show(val)}`).join(' ')}${t.defs.length > 0 ? ' ' : ''}}`;
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
    return Abs(t.mode, t.erased, x, toSurface(t.type, ns), toSurface(t.body, Cons(x, ns)));
  }
  if (t.tag === 'Pi') {
    const x = chooseName(t.name, ns);
    return Pi(t.mode, t.erased, x, toSurface(t.type, ns), toSurface(t.body, Cons(x, ns)));
  }
  if (t.tag === 'Sigma') {
    const x = chooseName(t.name, ns);
    return Sigma(t.erased, x, toSurface(t.type, ns), toSurface(t.body, Cons(x, ns)));
  }
  if (t.tag === 'Let') {
    const x = chooseName(t.name, ns);
    return Let(t.erased, x, toSurface(t.type, ns), toSurface(t.val, ns), toSurface(t.body, Cons(x, ns)));
  }
  return t;
};

export const showCore = (t: C.Term, ns: List<Name> = Nil): string => show(toSurface(t, ns));
export const showVal = (v: Val, k: Ix = 0, ns: List<Name> = Nil, full: boolean = false): string => show(toSurface(quote(v, k, full), ns));
export const showCoreZ = (t: C.Term, vs: EnvV = Nil, k: Ix = 0, ns: List<Name> = Nil): string => show(toSurface(zonk(t, vs, k), ns));
export const showValZ = (v: Val, vs: EnvV = Nil, k: Ix = 0, ns: List<Name> = Nil, full: boolean = false): string => show(toSurface(zonk(quote(v, k, full), vs, k), ns));

export type Def = Data<{
  DDef: { erased: boolean, name: Name, value: Term },
  DExecute: { term: Term, erased: boolean, typeOnly: boolean },
}>;
export const DDef = (erased: boolean, name: Name, value: Term): Def => ({ tag: 'DDef', erased, name, value });
export const DExecute = (term: Term, erased: boolean, typeOnly: boolean): Def => ({ tag: 'DExecute', term, erased, typeOnly });

export const showDef = (d: Def): string => {
  if (d.tag === 'DDef') return `def ${d.erased ? '-' : ''}${d.name} = ${show(d.value)}`;
  if (d.tag === 'DExecute') return `${d.erased ? '-' : ''}${d.typeOnly ? 'typecheck' : 'execute'} ${show(d.term)}`;
  return d;
};
export const showDefs = (ds: Def[]): string => ds.map(showDef).join('\n');
