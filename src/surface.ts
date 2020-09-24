import { chooseName, Ix, Name } from './names';
import * as C from './core';
import { quote, Val } from './values';
import { Cons, index, List, Nil } from './utils/list';
import { impossible } from './utils/utils';

export type Term = Var | App | Abs | Let | Type | Pi;

export type Var = { tag: 'Var', name: Name };
export const Var = (name: Name): Var => ({ tag: 'Var', name });
export type App = { tag: 'App', left: Term, right: Term };
export const App = (left: Term, right: Term): App => ({ tag: 'App', left, right });
export type Abs = { tag: 'Abs', name: Name, type: Term | null, body: Term };
export const Abs = (name: Name, type: Term | null, body: Term): Abs => ({ tag: 'Abs', name, type, body });
export type Let = { tag: 'Let', name: Name, type: Term | null, val: Term, body: Term };
export const Let = (name: Name, type: Term | null, val: Term, body: Term): Let => ({ tag: 'Let', name, type, val, body });
export type Type = { tag: 'Type' };
export const Type: Type = { tag: 'Type' };
export type Pi = { tag: 'Pi', name: Name, type: Term, body: Term };
export const Pi = (name: Name, type: Term, body: Term): Pi => ({ tag: 'Pi', name, type, body });

export const flattenApp = (t: Term): [Term, Term[]] => {
  const r: Term[] = [];
  while (t.tag === 'App') {
    r.push(t.right);
    t = t.left;
  }
  return [t, r.reverse()];
};
export const flattenAbs = (t: Term): [[Name, Term | null][], Term] => {
  const r: [Name, Term | null][] = [];
  while (t.tag === 'Abs') {
    r.push([t.name, t.type]);
    t = t.body;
  }
  return [r, t];
};
export const flattenPi = (t: Term): [[Name, Term][], Term] => {
  const r: [Name, Term][] = [];
  while (t.tag === 'Pi') {
    r.push([t.name, t.type]);
    t = t.body;
  }
  return [r, t];
};

const showP = (b: boolean, t: Term): string => b ? `(${show(t)})` : show(t);
const isSimple = (t: Term): boolean => t.tag === 'Var' || t.tag === 'Type';
export const show = (t: Term): string => {
  if (t.tag === 'Var') return t.name;
  if (t.tag === 'Type') return '*';
  if (t.tag === 'App') {
    const [f, as] = flattenApp(t);
    return `${showP(!isSimple(f), f)} ${as.map((t, i) => `${showP(!isSimple(t) && !(t.tag === 'Abs' && i >= as.length), t)}`).join(' ')}`;
  }
  if (t.tag === 'Abs') {
    const [as, b] = flattenAbs(t);
    return `\\${as.map(([x, t]) => !t ? x : `(${x} : ${show(t)})`).join(' ')}. ${show(b)}`;
  }
  if (t.tag === 'Pi') {
    const [as, b] = flattenPi(t);
    return `${as.map(([x, t]) => x === '_' ? showP(!isSimple(t) && t.tag !== 'App', t) : `(${x} : ${show(t)})`).join(' -> ')} -> ${show(b)}`;
  }
  if (t.tag === 'Let')
    return `let ${t.name}${t.type ? ` : ${showP(t.type.tag === 'Let', t.type)}` : ''} = ${showP(t.val.tag === 'Let', t.val)} in ${show(t.body)}`;
  return t;
};

export const toSurface = (t: C.Term, ns: List<Name> = Nil): Term => {
  if (t.tag === 'Type') return Type;
  if (t.tag === 'Var') return Var(index(ns, t.index) || impossible(`toSurface: index out of scope: ${t.index}`));
  if (t.tag === 'App') return App(toSurface(t.left, ns), toSurface(t.right, ns));
  if (t.tag === 'Abs') {
    const x = chooseName(t.name, ns);
    return Abs(x, toSurface(t.type, ns), toSurface(t.body, Cons(x, ns)));
  }
  if (t.tag === 'Pi') {
    const x = chooseName(t.name, ns);
    return Pi(x, toSurface(t.type, ns), toSurface(t.body, Cons(x, ns)));
  }
  if (t.tag === 'Let') {
    const x = chooseName(t.name, ns);
    return Let(x, toSurface(t.type, ns), toSurface(t.val, ns), toSurface(t.body, Cons(x, ns)));
  }
  return t;
};

export const showCore = (t: C.Term, ns: List<Name> = Nil): string => show(toSurface(t, ns));
export const showVal = (v: Val, k: Ix = 0, ns: List<Name> = Nil): string => show(toSurface(quote(v, k), ns));
