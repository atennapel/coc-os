import { Ix, Name } from '../../names';
import * as S from '../syntax';
import { Meta } from '../syntax';
import { List, lookup, Cons, Nil } from '../../list';

export type Term = Var | Global | App | Abs | Let | Roll | Unroll | Pi | Fix | Type;

export type Var = { tag: 'Var', index: Ix };
export const Var = (index: Ix): Var => ({ tag: 'Var', index });
export type Global = { tag: 'Global', name: Name };
export const Global = (name: Name): Global => ({ tag: 'Global', name });
export type App = { tag: 'App', left: Term, meta: S.Meta, right: Term };
export const App = (left: Term, meta: Meta, right: Term): App => ({ tag: 'App', left, meta, right });
export type Abs = { tag: 'Abs', meta: Meta, name: Name, type: Term, body: Term };
export const Abs = (meta: Meta, name: Name, type: Term, body: Term): Abs => ({ tag: 'Abs', meta, name, type, body });
export type Let = { tag: 'Let', meta: Meta, name: Name, val: Term, body: Term };
export const Let = (meta: Meta, name: Name, val: Term, body: Term): Let => ({ tag: 'Let', meta, name, val, body });
export type Roll = { tag: 'Roll', type: Term, term: Term };
export const Roll = (type: Term, term: Term): Roll => ({ tag: 'Roll', type, term });
export type Unroll = { tag: 'Unroll', term: Term };
export const Unroll = (term: Term): Unroll => ({ tag: 'Unroll', term });
export type Pi = { tag: 'Pi', meta: Meta, name: Name, type: Term, body: Term };
export const Pi = (meta: Meta, name: Name, type: Term, body: Term): Pi => ({ tag: 'Pi', meta, name, type, body });
export type Fix = { tag: 'Fix', name: Name, type: Term, body: Term };
export const Fix = (name: Name, type: Term, body: Term): Fix => ({ tag: 'Fix', name, type, body });
export type Type = { tag: 'Type' };
export const Type: Type = { tag: 'Type' };

export const showTerm = (t: Term): string => {
  if (t.tag === 'Var') return `${t.index}`;
  if (t.tag === 'Global') return t.name;
  if (t.tag === 'App') return `(${showTerm(t.left)} ${t.meta.erased ? '-' : ''}${showTerm(t.right)})`;
  if (t.tag === 'Abs') return `(\\(${t.meta.erased ? '-' : ''}${t.name} : ${showTerm(t.type)}). ${showTerm(t.body)})`;
  if (t.tag === 'Let') return `(let ${t.meta.erased ? '-' : ''}${t.name} = ${showTerm(t.val)} in ${showTerm(t.body)})`;
  if (t.tag === 'Roll') return `(roll ${showTerm(t.type)} ${showTerm(t.term)})`;
  if (t.tag === 'Unroll') return `(unroll ${showTerm(t.term)})`;
  if (t.tag === 'Pi') return `(/(${t.meta.erased ? '-' : ''}${t.name} : ${showTerm(t.type)}). ${showTerm(t.body)})`;
  if (t.tag === 'Fix') return `(fix (${t.name} : ${showTerm(t.type)}). ${showTerm(t.body)})`;
  if (t.tag === 'Type') return '*';
  return t;
};

export const toSurface = (t: S.Term, ns: List<[Name, Ix]> = Nil, k: Ix = 0): Term => {
  if (t.tag === 'Var') {
    const l = lookup(ns, t.name);
    return l === null ? Global(t.name) : Var(k - l - 1);
  }
  if (t.tag === 'App') return App(toSurface(t.left, ns, k), t.meta, toSurface(t.right, ns, k));
  if (t.tag === 'Abs') return Abs(t.meta, t.name, toSurface(t.type, ns, k), toSurface(t.body, Cons([t.name, k], ns), k + 1));
  if (t.tag === 'Let') return Let(t.meta, t.name, toSurface(t.val, ns, k), toSurface(t.body, Cons([t.name, k], ns), k + 1));
  if (t.tag === 'Roll') return Roll(toSurface(t.type, ns, k), toSurface(t.term, ns, k));
  if (t.tag === 'Unroll') return Unroll(toSurface(t.term, ns, k));
  if (t.tag === 'Pi') return Pi(t.meta, t.name, toSurface(t.type, ns, k), toSurface(t.body, Cons([t.name, k], ns), k + 1));
  if (t.tag === 'Fix') return Fix(t.name, toSurface(t.type, ns, k), toSurface(t.body, Cons([t.name, k], ns), k + 1));
  if (t.tag === 'Type') return Type;
  return t;
};
