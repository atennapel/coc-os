import { Ix, Name, nextName } from '../names';
import * as S from '../syntax';
import { Meta } from '../syntax';
import { List, lookup, Cons, Nil, index, indecesOf } from '../list';
import { impossible } from '../util';

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

const globalUsed = (k: Name, t: Term): boolean => {
  if (t.tag === 'App') return globalUsed(k, t.left) || globalUsed(k, t.right);
  if (t.tag === 'Abs') return globalUsed(k, t.type) || globalUsed(k, t.body);
  if (t.tag === 'Let') return globalUsed(k, t.val) || globalUsed(k, t.body);
  if (t.tag === 'Roll') return globalUsed(k, t.type) || globalUsed(k, t.term);
  if (t.tag === 'Unroll') return globalUsed(k, t.term);
  if (t.tag === 'Pi') return globalUsed(k, t.type) || globalUsed(k, t.body);
  if (t.tag === 'Fix') return globalUsed(k, t.type) || globalUsed(k, t.body);
  if (t.tag === 'Global') return t.name === k;
  if (t.tag === 'Var') return false;
  if (t.tag === 'Type') return false;
  return t;
};

const indexUsed = (k: Ix, t: Term): boolean => {
  if (t.tag === 'Var') return t.index === k;
  if (t.tag === 'App') return indexUsed(k, t.left) || indexUsed(k, t.right);
  if (t.tag === 'Abs') return indexUsed(k, t.type) || indexUsed(k + 1, t.body);
  if (t.tag === 'Let') return indexUsed(k, t.val) || indexUsed(k + 1, t.body);
  if (t.tag === 'Roll') return indexUsed(k, t.type) || indexUsed(k, t.term);
  if (t.tag === 'Unroll') return indexUsed(k, t.term);
  if (t.tag === 'Pi') return indexUsed(k, t.type) || indexUsed(k + 1, t.body);
  if (t.tag === 'Fix') return indexUsed(k, t.type) || indexUsed(k + 1, t.body);
  if (t.tag === 'Global') return false;
  if (t.tag === 'Type') return false;
  return t;
};

const decideName = (x: Name, t: Term, ns: List<Name>): Name => {
  const a = indecesOf(ns, x).map(i => indexUsed(i + 1, t)).reduce((x, y) => x || y, false);
  const g = globalUsed(x, t);
  return a || g ? decideName(nextName(x), t, ns) : x;
};

export const fromSurface = (t: Term, ns: List<Name> = Nil): S.Term => {
  if (t.tag === 'Var') {
    const l = index(ns, t.index);
    return l ? S.Var(l) : impossible(`var index out of range in fromSurface: ${t.index}`);
  }
  if (t.tag === 'Type') return S.Type;
  if (t.tag === 'Global') return S.Var(t.name);
  if (t.tag === 'App') return S.App(fromSurface(t.left, ns), t.meta, fromSurface(t.right, ns));
  if (t.tag === 'Roll') return S.Roll(fromSurface(t.type, ns), fromSurface(t.term, ns));
  if (t.tag === 'Unroll') return S.Unroll(fromSurface(t.term, ns));
  if (t.tag === 'Abs') {
    const x = decideName(t.name, t.body, ns);
    return S.Abs(t.meta, x, fromSurface(t.type, ns), fromSurface(t.body, Cons(x, ns)));
  }
  if (t.tag === 'Let') {
    const x = decideName(t.name, t.body, ns);
    return S.Let(t.meta, x, fromSurface(t.val, ns), fromSurface(t.body, Cons(x, ns)));
  }
  if (t.tag === 'Pi') {
    const x = decideName(t.name, t.body, ns);
    return S.Pi(t.meta, x, fromSurface(t.type, ns), fromSurface(t.body, Cons(x, ns)));
  }
  if (t.tag === 'Fix') {
    const x = decideName(t.name, t.body, ns);
    return S.Fix(x, fromSurface(t.type, ns), fromSurface(t.body, Cons(x, ns)));
  }
  return t;
};
