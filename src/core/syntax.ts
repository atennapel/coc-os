import { Ix, Name } from '../names';
import { Plicity } from '../syntax';
import * as S from '../surface/syntax';
import { impossible } from '../util';

export type Term = Var | Global | App | Abs | Let | Roll | Unroll | Pi | Fix | Type;

export type Var = { tag: 'Var', index: Ix };
export const Var = (index: Ix): Var => ({ tag: 'Var', index });
export type Global = { tag: 'Global', name: Name };
export const Global = (name: Name): Global => ({ tag: 'Global', name });
export type App = { tag: 'App', left: Term, plicity: Plicity, right: Term };
export const App = (left: Term, plicity: Plicity, right: Term): App => ({ tag: 'App', left, plicity, right });
export type Abs = { tag: 'Abs', plicity: Plicity, type: Term, body: Term };
export const Abs = (plicity: Plicity, type: Term, body: Term): Abs => ({ tag: 'Abs', plicity, type, body });
export type Let = { tag: 'Let', plicity: Plicity, val: Term, body: Term };
export const Let = (plicity: Plicity, val: Term, body: Term): Let => ({ tag: 'Let', plicity, val, body });
export type Roll = { tag: 'Roll', type: Term, term: Term };
export const Roll = (type: Term, term: Term): Roll => ({ tag: 'Roll', type, term });
export type Unroll = { tag: 'Unroll', term: Term };
export const Unroll = (term: Term): Unroll => ({ tag: 'Unroll', term });
export type Pi = { tag: 'Pi', plicity: Plicity, type: Term, body: Term };
export const Pi = (plicity: Plicity, type: Term, body: Term): Pi => ({ tag: 'Pi', plicity, type, body });
export type Fix = { tag: 'Fix', type: Term, body: Term };
export const Fix = (type: Term, body: Term): Fix => ({ tag: 'Fix', type, body });
export type Type = { tag: 'Type' };
export const Type: Type = { tag: 'Type' };

export const showTerm = (t: Term): string => {
  if (t.tag === 'Var') return `${t.index}`;
  if (t.tag === 'Global') return t.name;
  if (t.tag === 'App') return `(${showTerm(t.left)} ${t.plicity.erased ? '-' : ''}${showTerm(t.right)})`;
  if (t.tag === 'Abs') return `(\\${t.plicity.erased ? '-' : ''}${showTerm(t.type)}. ${showTerm(t.body)})`;
  if (t.tag === 'Let') return `(let ${t.plicity.erased ? '-' : ''}${showTerm(t.val)} in ${showTerm(t.body)})`;
  if (t.tag === 'Roll') return `(roll ${showTerm(t.type)} ${showTerm(t.term)})`;
  if (t.tag === 'Unroll') return `(unroll ${showTerm(t.term)})`;
  if (t.tag === 'Pi') return `(/${t.plicity.erased ? '-' : ''}${showTerm(t.type)}. ${showTerm(t.body)})`;
  if (t.tag === 'Fix') return `(fix ${showTerm(t.type)}. ${showTerm(t.body)})`;
  if (t.tag === 'Type') return '*';
  return t;
};

export const toCore = (t: S.Term): Term => {
  if (t.tag === 'Var') return Var(t.index);
  if (t.tag === 'Global') return Global(t.name);
  if (t.tag === 'App') return App(toCore(t.left), t.plicity, toCore(t.right));
  if (t.tag === 'Abs' && t.type) return Abs(t.plicity, toCore(t.type), toCore(t.body));
  if (t.tag === 'Let') return Let(t.plicity, toCore(t.val), toCore(t.body));
  if (t.tag === 'Roll' && t.type) return Roll(toCore(t.type), toCore(t.term));
  if (t.tag === 'Unroll') return Unroll(toCore(t.term));
  if (t.tag === 'Pi') return Pi(t.plicity, toCore(t.type), toCore(t.body));
  if (t.tag === 'Fix') return Fix(toCore(t.type), toCore(t.body));
  if (t.tag === 'Type') return Type;
  if (t.tag === 'Ann') return toCore(t.term);
  return impossible(`toCore failed on ${S.showTerm(t)}`);
};
