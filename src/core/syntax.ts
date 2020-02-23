import { Ix, Name, nextName } from '../names';
import * as S from '../syntax';
import { Plicity } from '../syntax';
import { List, lookup, Cons, Nil, index, indecesOf } from '../list';
import { impossible } from '../util';
import { EnvV, zonk } from './domain';

export type Term = Var | Global | App | Abs | Let | Pi | Type | Ann | Hole | Meta | Inter | Both | Fst | Snd;

export type Var = { tag: 'Var', index: Ix };
export const Var = (index: Ix): Var => ({ tag: 'Var', index });
export type Global = { tag: 'Global', name: Name };
export const Global = (name: Name): Global => ({ tag: 'Global', name });
export type App = { tag: 'App', left: Term, plicity: S.Plicity, right: Term };
export const App = (left: Term, plicity: Plicity, right: Term): App => ({ tag: 'App', left, plicity, right });
export type Abs = { tag: 'Abs', plicity: Plicity, name: Name, type: Term | null, body: Term };
export const Abs = (plicity: Plicity, name: Name, type: Term | null, body: Term): Abs => ({ tag: 'Abs', plicity, name, type, body });
export type Let = { tag: 'Let', plicity: Plicity, name: Name, val: Term, body: Term };
export const Let = (plicity: Plicity, name: Name, val: Term, body: Term): Let => ({ tag: 'Let', plicity, name, val, body });
export type Pi = { tag: 'Pi', plicity: Plicity, name: Name, type: Term, body: Term };
export const Pi = (plicity: Plicity, name: Name, type: Term, body: Term): Pi => ({ tag: 'Pi', plicity, name, type, body });
export type Type = { tag: 'Type' };
export const Type: Type = { tag: 'Type' };
export type Ann = { tag: 'Ann', term: Term, type: Term };
export const Ann = (term: Term, type: Term): Ann => ({ tag: 'Ann', term, type });
export type Hole = { tag: 'Hole', name: Name | null };
export const HoleN: Hole = { tag: 'Hole', name: null };
export const Hole = (name: Name): Hole => ({ tag: 'Hole', name });
export type Meta = { tag: 'Meta', index: Ix };
export const Meta = (index: Ix): Meta => ({ tag: 'Meta', index });
export type Inter = { tag: 'Inter', name: Name, type: Term, body: Term };
export const Inter = (name: Name, type: Term, body: Term): Inter => ({ tag: 'Inter', name, type, body });
export type Both = { tag: 'Both', fst: Term, snd: Term };
export const Both = (fst: Term, snd: Term): Both => ({ tag: 'Both', fst, snd });
export type Fst = { tag: 'Fst', term: Term };
export const Fst = (term: Term): Fst => ({ tag: 'Fst', term });
export type Snd = { tag: 'Snd', term: Term };
export const Snd = (term: Term): Snd => ({ tag: 'Snd', term });

export const showTerm = (t: Term): string => {
  if (t.tag === 'Var') return `${t.index}`;
  if (t.tag === 'Meta') return `?${t.index}`;
  if (t.tag === 'Global') return t.name;
  if (t.tag === 'Hole') return `_${t.name || ''}`;
  if (t.tag === 'App') return `(${showTerm(t.left)} ${t.plicity.erased ? '-' : ''}${showTerm(t.right)})`;
  if (t.tag === 'Abs')
    return t.type ? `(\\(${t.plicity.erased ? '-' : ''}${t.name} : ${showTerm(t.type)}). ${showTerm(t.body)})` : `(\\${t.plicity.erased ? '-' : ''}${t.name}. ${showTerm(t.body)})`;
  if (t.tag === 'Let') return `(let ${t.plicity.erased ? '-' : ''}${t.name} = ${showTerm(t.val)} in ${showTerm(t.body)})`;
  if (t.tag === 'Pi') return `(/(${t.plicity.erased ? '-' : ''}${t.name} : ${showTerm(t.type)}). ${showTerm(t.body)})`;
  if (t.tag === 'Type') return '*';
  if (t.tag === 'Ann') return `(${showTerm(t.term)} : ${showTerm(t.type)})`;
  if (t.tag === 'Inter') return `(iota (${t.name} : ${showTerm(t.type)}). ${showTerm(t.body)})`;
  if (t.tag === 'Both') return `[${showTerm(t.fst)}, ${showTerm(t.snd)}]`;
  if (t.tag === 'Fst') return `(fst ${showTerm(t.term)})`;
  if (t.tag === 'Snd') return `(snd ${showTerm(t.term)})`;
  return t;
};

export const toSurface = (t: S.Term, ns: List<[Name, Ix]> = Nil, k: Ix = 0): Term => {
  if (t.tag === 'Var') {
    const l = lookup(ns, t.name);
    return l === null ? Global(t.name) : Var(k - l - 1);
  }
  if (t.tag === 'Hole') return t.name ? Hole(t.name) : HoleN;
  if (t.tag === 'Meta') return Meta(t.index);
  if (t.tag === 'App') return App(toSurface(t.left, ns, k), t.plicity, toSurface(t.right, ns, k));
  if (t.tag === 'Abs') return Abs(t.plicity, t.name, t.type && toSurface(t.type, ns, k), toSurface(t.body, Cons([t.name, k], ns), k + 1));
  if (t.tag === 'Let') return Let(t.plicity, t.name, toSurface(t.val, ns, k), toSurface(t.body, Cons([t.name, k], ns), k + 1));
  if (t.tag === 'Pi') return Pi(t.plicity, t.name, toSurface(t.type, ns, k), toSurface(t.body, Cons([t.name, k], ns), k + 1));
  if (t.tag === 'Type') return Type;
  if (t.tag === 'Ann') return Ann(toSurface(t.term, ns, k), toSurface(t.type, ns, k));
  if (t.tag === 'Inter') return Inter(t.name, toSurface(t.type, ns, k), toSurface(t.body, Cons([t.name, k], ns), k + 1));
  if (t.tag === 'Both') return Both(toSurface(t.fst, ns, k), toSurface(t.snd, ns, k));
  if (t.tag === 'Fst') return Fst(toSurface(t.term, ns, k));
  if (t.tag === 'Snd') return Snd(toSurface(t.term, ns, k));
  return t;
};

const globalUsed = (k: Name, t: Term): boolean => {
  if (t.tag === 'App') return globalUsed(k, t.left) || globalUsed(k, t.right);
  if (t.tag === 'Abs') return (t.type && globalUsed(k, t.type)) || globalUsed(k, t.body);
  if (t.tag === 'Let') return globalUsed(k, t.val) || globalUsed(k, t.body);
  if (t.tag === 'Pi') return globalUsed(k, t.type) || globalUsed(k, t.body);
  if (t.tag === 'Inter') return globalUsed(k, t.type) || globalUsed(k, t.body);
  if (t.tag === 'Ann') return globalUsed(k, t.term) || globalUsed(k, t.type);
  if (t.tag === 'Both') return globalUsed(k, t.fst) || globalUsed(k, t.snd);
  if (t.tag === 'Fst') return globalUsed(k, t.term);
  if (t.tag === 'Snd') return globalUsed(k, t.term);
  if (t.tag === 'Global') return t.name === k;
  if (t.tag === 'Var') return false;
  if (t.tag === 'Type') return false;
  if (t.tag === 'Hole') return false;
  if (t.tag === 'Meta') return false;
  return t;
};

const indexUsed = (k: Ix, t: Term): boolean => {
  if (t.tag === 'Var') return t.index === k;
  if (t.tag === 'App') return indexUsed(k, t.left) || indexUsed(k, t.right);
  if (t.tag === 'Abs') return (t.type && indexUsed(k, t.type)) || indexUsed(k + 1, t.body);
  if (t.tag === 'Let') return indexUsed(k, t.val) || indexUsed(k + 1, t.body);
  if (t.tag === 'Pi') return indexUsed(k, t.type) || indexUsed(k + 1, t.body);
  if (t.tag === 'Inter') return indexUsed(k, t.type) || indexUsed(k + 1, t.body);
  if (t.tag === 'Ann') return indexUsed(k, t.term) || indexUsed(k, t.type);
  if (t.tag === 'Both') return indexUsed(k, t.fst) || indexUsed(k, t.snd);
  if (t.tag === 'Fst') return indexUsed(k, t.term);
  if (t.tag === 'Snd') return indexUsed(k, t.term);
  if (t.tag === 'Global') return false;
  if (t.tag === 'Type') return false;
  if (t.tag === 'Hole') return false;
  if (t.tag === 'Meta') return false;
  return t;
};

export const isUnsolved = (t: Term): boolean => {
  if (t.tag === 'Hole') return true;
  if (t.tag === 'Meta') return true;
  if (t.tag === 'App') return isUnsolved(t.left) || isUnsolved(t.right);
  if (t.tag === 'Abs') return (t.type && isUnsolved(t.type)) || isUnsolved( t.body);
  if (t.tag === 'Let') return isUnsolved(t.val) || isUnsolved(t.body);
  if (t.tag === 'Pi') return isUnsolved(t.type) || isUnsolved(t.body);
  if (t.tag === 'Inter') return isUnsolved(t.type) || isUnsolved(t.body);
  if (t.tag === 'Ann') return isUnsolved(t.term) || isUnsolved(t.type);
  if (t.tag === 'Both') return isUnsolved(t.fst) || isUnsolved(t.snd);
  if (t.tag === 'Fst') return isUnsolved(t.term);
  if (t.tag === 'Snd') return isUnsolved(t.term);
  if (t.tag === 'Global') return false;
  if (t.tag === 'Type') return false;
  if (t.tag === 'Var') return false;
  return t;
};

const decideName = (x: Name, t: Term, ns: List<Name>): Name => {
  if (x === '_') return x;
  const a = indecesOf(ns, x).map(i => indexUsed(i + 1, t)).reduce((x, y) => x || y, false);
  const g = globalUsed(x, t);
  return a || g ? decideName(nextName(x), t, ns) : x;
};

export const fromSurface = (t: Term, ns: List<Name> = Nil): S.Term => {
  if (t.tag === 'Var') {
    const l = index(ns, t.index);
    return l ? S.Var(l) : impossible(`var index out of range in fromSurface: ${t.index}`);
  }
  if (t.tag === 'Meta') return S.Meta(t.index);
  if (t.tag === 'Type') return S.Type;
  if (t.tag === 'Hole') return t.name ? S.Hole(t.name) : S.HoleN;
  if (t.tag === 'Global') return S.Var(t.name);
  if (t.tag === 'App') return S.App(fromSurface(t.left, ns), t.plicity, fromSurface(t.right, ns));
  if (t.tag === 'Ann') return S.Ann(fromSurface(t.term, ns), fromSurface(t.type, ns));
  if (t.tag === 'Both') return S.Both(fromSurface(t.fst, ns), fromSurface(t.snd, ns));
  if (t.tag === 'Abs') {
    const x = decideName(t.name, t.body, ns);
    return S.Abs(t.plicity, x, t.type && fromSurface(t.type, ns), fromSurface(t.body, Cons(x, ns)));
  }
  if (t.tag === 'Let') {
    const x = decideName(t.name, t.body, ns);
    return S.Let(t.plicity, x, fromSurface(t.val, ns), fromSurface(t.body, Cons(x, ns)));
  }
  if (t.tag === 'Pi') {
    const x = decideName(t.name, t.body, ns);
    return S.Pi(t.plicity, x, fromSurface(t.type, ns), fromSurface(t.body, Cons(x, ns)));
  }
  if (t.tag === 'Inter') {
    const x = decideName(t.name, t.body, ns);
    return S.Inter(x, fromSurface(t.type, ns), fromSurface(t.body, Cons(x, ns)));
  }
  if (t.tag === 'Fst') return S.Fst(fromSurface(t.term, ns));
  if (t.tag === 'Snd') return S.Snd(fromSurface(t.term, ns));
  return t;
};

export const showFromSurface = (t: Term, ns: List<Name> = Nil): string =>
  S.showTerm(fromSurface(t, ns));
export const showFromSurfaceZ = (t: Term, ns: List<Name> = Nil, vs: EnvV = Nil, k: Ix = 0): string =>
  S.showTerm(fromSurface(zonk(t, vs, k, false), ns));

export const shift = (d: Ix, c: Ix, t: Term): Term => {
  if (t.tag === 'Var') return t.index < c ? t : Var(t.index + d);
  if (t.tag === 'Abs') return Abs(t.plicity, t.name, t.type && shift(d, c, t.type), shift(d, c + 1, t.body));
  if (t.tag === 'App') return App(shift(d, c, t.left), t.plicity, shift(d, c, t.right));
  if (t.tag === 'Let') return Let(t.plicity, t.name, shift(d, c, t.val), shift(d, c + 1, t.body));
  if (t.tag === 'Pi') return Pi(t.plicity, t.name, shift(d, c, t.type), shift(d, c + 1, t.body));
  if (t.tag === 'Inter') return Inter(t.name, shift(d, c, t.type), shift(d, c + 1, t.body));
  if (t.tag === 'Ann') return Ann(shift(d, c, t.term), shift(d, c, t.type));
  if (t.tag === 'Both') return Both(shift(d, c, t.fst), shift(d, c, t.snd));
  if (t.tag === 'Fst') return Fst(shift(d, c, t.term));
  if (t.tag === 'Snd') return Snd(shift(d, c, t.term));
  return t;
};

export const flattenPi = (t: Term): [[Name, Plicity, Term][], Term] => {
  const r: [Name, Plicity, Term][] = [];
  while (t.tag === 'Pi') {
    r.push([t.name, t.plicity, t.type]);
    t = t.body;
  }
  return [r, t];
};
