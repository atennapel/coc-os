import { Ix, Name, nextName } from './names';
import { Plicity } from './surface';
import * as S from './surface';
import { List, Cons, Nil, indecesOf, index } from './utils/list';
import { impossible } from './utils/util';

export type Term = Var | Global | App | Abs | Let | Pi | Type;

export type Var = { tag: 'Var', index: Ix };
export const Var = (index: Ix): Var => ({ tag: 'Var', index });
export type Global = { tag: 'Global', name: Name };
export const Global = (name: Name): Global => ({ tag: 'Global', name });
export type App = { tag: 'App', left: Term, plicity: Plicity, right: Term };
export const App = (left: Term, plicity: Plicity, right: Term): App => ({ tag: 'App', left, plicity, right });
export type Abs = { tag: 'Abs', plicity: Plicity, name: Name, type: Term, body: Term };
export const Abs = (plicity: Plicity, name: Name, type: Term, body: Term): Abs => ({ tag: 'Abs', plicity, name, type, body });
export type Let = { tag: 'Let', plicity: Plicity, name: Name, val: Term, body: Term };
export const Let = (plicity: Plicity, name: Name, val: Term, body: Term): Let => ({ tag: 'Let', plicity, name, val, body });
export type Pi = { tag: 'Pi', plicity: Plicity, name: Name, type: Term, body: Term };
export const Pi = (plicity: Plicity, name: Name, type: Term, body: Term): Pi => ({ tag: 'Pi', plicity, name, type, body });
export type Type = { tag: 'Type' };
export const Type: Type = { tag: 'Type' };

export const showTerm = (t: Term): string => {
  if (t.tag === 'Var') return `${t.index}`;
  if (t.tag === 'Global') return t.name;
  if (t.tag === 'App') return `(${showTerm(t.left)} ${t.plicity ? '-' : ''}${showTerm(t.right)})`;
  if (t.tag === 'Abs')
    return t.type ? `(\\(${t.plicity ? '-' : ''}${t.name} : ${showTerm(t.type)}). ${showTerm(t.body)})` : `(\\${t.plicity ? '-' : ''}${t.name}. ${showTerm(t.body)})`;
  if (t.tag === 'Let') return `(let ${t.plicity ? '-' : ''}${t.name} = ${showTerm(t.val)} in ${showTerm(t.body)})`;
  if (t.tag === 'Pi') return `(/(${t.plicity ? '-' : ''}${t.name} : ${showTerm(t.type)}). ${showTerm(t.body)})`;
  if (t.tag === 'Type') return '*';
  return t;
};

export const globalUsed = (k: Name, t: Term): boolean => {
  if (t.tag === 'Global') return t.name === k;
  if (t.tag === 'App') return globalUsed(k, t.left) || globalUsed(k, t.right);
  if (t.tag === 'Abs') return (t.type && globalUsed(k, t.type)) || globalUsed(k, t.body);
  if (t.tag === 'Let') return globalUsed(k, t.val) || globalUsed(k, t.body);
  if (t.tag === 'Pi') return globalUsed(k, t.type) || globalUsed(k, t.body);
  return false;
};
export const indexUsed = (k: Ix, t: Term): boolean => {
  if (t.tag === 'Var') return t.index === k;
  if (t.tag === 'App') return indexUsed(k, t.left) || indexUsed(k, t.right);
  if (t.tag === 'Abs') return (t.type && indexUsed(k, t.type)) || indexUsed(k + 1, t.body);
  if (t.tag === 'Let') return indexUsed(k, t.val) || indexUsed(k + 1, t.body);
  if (t.tag === 'Pi') return indexUsed(k, t.type) || indexUsed(k + 1, t.body);
  return false;
};

export const isUnsolved = (t: Term): boolean => {
  if (t.tag === 'App') return isUnsolved(t.left) || isUnsolved(t.right);
  if (t.tag === 'Abs') return (t.type && isUnsolved(t.type)) || isUnsolved(t.body);
  if (t.tag === 'Let') return isUnsolved(t.val) || isUnsolved(t.body);
  if (t.tag === 'Pi') return isUnsolved(t.type) || isUnsolved(t.body);
  return false;
};

const decideName = (x: Name, t: Term, ns: List<Name>): Name => {
  if (x === '_') return x;
  const a = indecesOf(ns, x).some(i => indexUsed(i + 1, t));
  const g = globalUsed(x, t);
  return a || g ? decideName(nextName(x), t, ns) : x;
};
export const toSurface = (t: Term, ns: List<Name> = Nil): S.Term => {
  if (t.tag === 'Var') {
    const l = index(ns, t.index);
    return l ? S.Var(l) : impossible(`var index out of range in toSurface: ${t.index}`);
  }
  if (t.tag === 'Type') return S.Type;
  if (t.tag === 'Global') return S.Var(t.name);
  if (t.tag === 'App') return S.App(toSurface(t.left, ns), t.plicity, toSurface(t.right, ns));
  if (t.tag === 'Abs') {
    const x = decideName(t.name, t.body, ns);
    return S.Abs(t.plicity, x, t.type && toSurface(t.type, ns), toSurface(t.body, Cons(x, ns)));
  }
  if (t.tag === 'Let') {
    const x = decideName(t.name, t.body, ns);
    return S.Let(t.plicity, x, toSurface(t.val, ns), toSurface(t.body, Cons(x, ns)));
  }
  if (t.tag === 'Pi') {
    const x = decideName(t.name, t.body, ns);
    return S.Pi(t.plicity, x, toSurface(t.type, ns), toSurface(t.body, Cons(x, ns)));
  }
  return t;
};
export const showSurface = (t: Term, ns: List<Name> = Nil): string => S.showTerm(toSurface(t, ns));
