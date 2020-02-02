import { Ix, Name } from '../names';
import { Meta } from '../syntax';
import * as S from '../surface/syntax';

export type Term = Var | Global | App | Abs | Let | Roll | Unroll | Pi | Fix | Type;

export type Var = { tag: 'Var', index: Ix };
export const Var = (index: Ix): Var => ({ tag: 'Var', index });
export type Global = { tag: 'Global', name: Name };
export const Global = (name: Name): Global => ({ tag: 'Global', name });
export type App = { tag: 'App', left: Term, meta: Meta, right: Term };
export const App = (left: Term, meta: Meta, right: Term): App => ({ tag: 'App', left, meta, right });
export type Abs = { tag: 'Abs', meta: Meta, type: Term, body: Term };
export const Abs = (meta: Meta, type: Term, body: Term): Abs => ({ tag: 'Abs', meta, type, body });
export type Let = { tag: 'Let', meta: Meta, val: Term, body: Term };
export const Let = (meta: Meta, val: Term, body: Term): Let => ({ tag: 'Let', meta, val, body });
export type Roll = { tag: 'Roll', type: Term, term: Term };
export const Roll = (type: Term, term: Term): Roll => ({ tag: 'Roll', type, term });
export type Unroll = { tag: 'Unroll', term: Term };
export const Unroll = (term: Term): Unroll => ({ tag: 'Unroll', term });
export type Pi = { tag: 'Pi', meta: Meta, type: Term, body: Term };
export const Pi = (meta: Meta, type: Term, body: Term): Pi => ({ tag: 'Pi', meta, type, body });
export type Fix = { tag: 'Fix', type: Term, body: Term };
export const Fix = (type: Term, body: Term): Fix => ({ tag: 'Fix', type, body });
export type Type = { tag: 'Type' };
export const Type: Type = { tag: 'Type' };

export const showTerm = (t: Term): string => {
  if (t.tag === 'Var') return `${t.index}`;
  if (t.tag === 'Global') return t.name;
  if (t.tag === 'App') return `(${showTerm(t.left)} ${t.meta.erased ? '-' : ''}${showTerm(t.right)})`;
  if (t.tag === 'Abs') return `(\\${t.meta.erased ? '-' : ''}${showTerm(t.type)}. ${showTerm(t.body)})`;
  if (t.tag === 'Let') return `(let ${t.meta.erased ? '-' : ''}${showTerm(t.val)} in ${showTerm(t.body)})`;
  if (t.tag === 'Roll') return `(roll ${showTerm(t.type)} ${showTerm(t.term)})`;
  if (t.tag === 'Unroll') return `(unroll ${showTerm(t.term)})`;
  if (t.tag === 'Pi') return `(/${t.meta.erased ? '-' : ''}${showTerm(t.type)}. ${showTerm(t.body)})`;
  if (t.tag === 'Fix') return `(fix ${showTerm(t.type)}. ${showTerm(t.body)})`;
  if (t.tag === 'Type') return '*';
  return t;
};

export const toCore = (t: S.Term): Term => {
  if (t.tag === 'Var') return Var(t.index);
  if (t.tag === 'Global') return Global(t.name);
  if (t.tag === 'App') return App(toCore(t.left), t.meta, toCore(t.right));
  if (t.tag === 'Abs') return Abs(t.meta, toCore(t.type), toCore(t.body));
  if (t.tag === 'Let') return Let(t.meta, toCore(t.val), toCore(t.body));
  if (t.tag === 'Roll') return Roll(toCore(t.type), toCore(t.term));
  if (t.tag === 'Unroll') return Unroll(toCore(t.term));
  if (t.tag === 'Pi') return Pi(t.meta, toCore(t.type), toCore(t.body));
  if (t.tag === 'Fix') return Fix(toCore(t.type), toCore(t.body));
  if (t.tag === 'Type') return Type;
  if (t.tag === 'Ann') return toCore(t.term);
  return t;
};
