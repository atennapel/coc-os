import { chooseName, Ix, Name } from './names';
import * as C from './core';
import { Mode } from './core';
import { EnvV, quote, Val, zonk } from './values';
import { Cons, index, List, Nil } from './utils/list';
import { impossible } from './utils/utils';

export type Term = Var | App | Abs | Let | Type | Pi | Meta | Hole;

export type Var = { tag: 'Var', name: Name };
export const Var = (name: Name): Var => ({ tag: 'Var', name });
export type App = { tag: 'App', left: Term, mode: Mode, right: Term };
export const App = (left: Term, mode: Mode, right: Term): App => ({ tag: 'App', left, mode, right });
export type Abs = { tag: 'Abs', mode: Mode, name: Name, type: Term | null, body: Term };
export const Abs = (mode: Mode, name: Name, type: Term | null, body: Term): Abs => ({ tag: 'Abs', mode, name, type, body });
export type Let = { tag: 'Let', name: Name, type: Term | null, val: Term, body: Term };
export const Let = (name: Name, type: Term | null, val: Term, body: Term): Let => ({ tag: 'Let', name, type, val, body });
export type Type = { tag: 'Type' };
export const Type: Type = { tag: 'Type' };
export type Pi = { tag: 'Pi', mode: Mode, name: Name, type: Term, body: Term };
export const Pi = (mode: Mode, name: Name, type: Term, body: Term): Pi => ({ tag: 'Pi', mode, name, type, body });
export type Meta = { tag: 'Meta', index: Ix };
export const Meta = (index: Ix): Meta => ({ tag: 'Meta', index });
export type Hole = { tag: 'Hole' };
export const Hole: Hole = { tag: 'Hole' };

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

const showP = (b: boolean, t: Term): string => b ? `(${show(t)})` : show(t);
const isSimple = (t: Term): boolean => t.tag === 'Var' || t.tag === 'Type' || t.tag === 'Meta' || t.tag === 'Hole';
export const show = (t: Term): string => {
  if (t.tag === 'Var') return t.name;
  if (t.tag === 'Type') return '*';
  if (t.tag === 'Meta') return `?${t.index}`;
  if (t.tag === 'Hole') return '_';
  if (t.tag === 'App') {
    const [f, as] = flattenApp(t);
    return `${showP(!isSimple(f), f)} ${as.map(([m, t], i) => `${m === C.ImplUnif ? 'impl ' : ''}${showP(!isSimple(t) && !(t.tag === 'Abs' && i >= as.length), t)}`).join(' ')}`;
  }
  if (t.tag === 'Abs') {
    const [as, b] = flattenAbs(t);
    return `\\${as.map(([x, m, t]) => !t ?
      (m === C.ImplUnif ? `(impl ${x})` : x) :
      `(${m === C.ImplUnif ? 'impl ' : ''}${x} : ${show(t)})`).join(' ')}. ${show(b)}`;
  }
  if (t.tag === 'Pi') {
    const [as, b] = flattenPi(t);
    return `${as.map(([x, m, t]) => x === '_' && m === C.Expl ?
      showP(!isSimple(t) && t.tag !== 'App', t) :
      `(${m === C.ImplUnif ? 'impl ' : ''}${x} : ${show(t)})`).join(' -> ')} -> ${show(b)}`;
  }
  if (t.tag === 'Let')
    return `let ${t.name}${t.type ? ` : ${showP(t.type.tag === 'Let', t.type)}` : ''} = ${showP(t.val.tag === 'Let', t.val)} in ${show(t.body)}`;
  return t;
};

export const toSurface = (t: C.Term, ns: List<Name> = Nil): Term => {
  if (t.tag === 'Type') return Type;
  if (t.tag === 'Meta') return Meta(t.index);
  if (t.tag === 'Var') return Var(index(ns, t.index) || impossible(`toSurface: index out of scope: ${t.index}`));
  if (t.tag === 'App') return App(toSurface(t.left, ns), t.mode, toSurface(t.right, ns));
  if (t.tag === 'Abs') {
    const x = chooseName(t.name, ns);
    return Abs(t.mode, x, toSurface(t.type, ns), toSurface(t.body, Cons(x, ns)));
  }
  if (t.tag === 'Pi') {
    const x = chooseName(t.name, ns);
    return Pi(t.mode, x, toSurface(t.type, ns), toSurface(t.body, Cons(x, ns)));
  }
  if (t.tag === 'Let') {
    const x = chooseName(t.name, ns);
    return Let(x, toSurface(t.type, ns), toSurface(t.val, ns), toSurface(t.body, Cons(x, ns)));
  }
  return t;
};

export const showCore = (t: C.Term, ns: List<Name> = Nil): string => show(toSurface(t, ns));
export const showVal = (v: Val, k: Ix = 0, ns: List<Name> = Nil): string => show(toSurface(quote(v, k), ns));
export const showCoreZ = (t: C.Term, vs: EnvV = Nil, k: Ix = 0, ns: List<Name> = Nil): string => show(toSurface(zonk(t, vs, k), ns));
export const showValZ = (v: Val, vs: EnvV = Nil, k: Ix = 0, ns: List<Name> = Nil): string => show(toSurface(zonk(quote(v, k), vs, k), ns));
