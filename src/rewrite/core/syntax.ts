import { Ix } from '../../names';
import * as U from '../untyped/syntax';

export type Term = Var | App | Abs | Let | Roll | Unroll | Pi | Fix | Type;

export type Var = { tag: 'Var', index: Ix };
export const Var = (index: Ix): Var => ({ tag: 'Var', index });
export type App = { tag: 'App', left: Term, right: Term };
export const App = (left: Term, right: Term): App => ({ tag: 'App', left, right });
export type Abs = { tag: 'Abs', type: Term, body: Term };
export const Abs = (type: Term, body: Term): Abs => ({ tag: 'Abs', type, body });
export type Let = { tag: 'Let', val: Term, body: Term };
export const Let = (val: Term, body: Term): Let => ({ tag: 'Let', val, body });
export type Roll = { tag: 'Roll', type: Term, term: Term };
export const Roll = (type: Term, term: Term): Roll => ({ tag: 'Roll', type, term });
export type Unroll = { tag: 'Unroll', term: Term };
export const Unroll = (term: Term): Unroll => ({ tag: 'Unroll', term });
export type Pi = { tag: 'Pi', type: Term, body: Term };
export const Pi = (type: Term, body: Term): Pi => ({ tag: 'Pi', type, body });
export type Fix = { tag: 'Fix', type: Term, body: Term };
export const Fix = (type: Term, body: Term): Fix => ({ tag: 'Fix', type, body });
export type Type = { tag: 'Type' };
export const Type: Type = { tag: 'Type' };

export const showTerm = (t: Term): string => {
  if (t.tag === 'Var') return `${t.index}`;
  if (t.tag === 'App') return `(${showTerm(t.left)} ${showTerm(t.right)})`;
  if (t.tag === 'Abs') return `(\\${showTerm(t.type)}. ${showTerm(t.body)})`;
  if (t.tag === 'Let') return `(let ${showTerm(t.val)} in ${showTerm(t.body)})`;
  if (t.tag === 'Roll') return `(roll ${showTerm(t.type)} ${showTerm(t.term)})`;
  if (t.tag === 'Unroll') return `(unroll ${showTerm(t.term)})`;
  if (t.tag === 'Pi') return `(/${showTerm(t.type)}. ${showTerm(t.body)})`;
  if (t.tag === 'Fix') return `(fix ${showTerm(t.type)}. ${showTerm(t.body)})`;
  if (t.tag === 'Type') return '*';
  return t;
};

export const erase = (t: Term): U.Term => {
  if (t.tag === 'Var') return U.Var(t.index);
  if (t.tag === 'App') return U.App(erase(t.left), erase(t.right));
  if (t.tag === 'Abs') return U.Abs(erase(t.body));
  if (t.tag === 'Let') return U.App(U.Abs(erase(t.body)), erase(t.val));
  if (t.tag === 'Roll') return erase(t.term);
  if (t.tag === 'Unroll') return erase(t.term);
  if (t.tag === 'Pi') return U.idTerm;
  if (t.tag === 'Fix') return U.idTerm;
  if (t.tag === 'Type') return U.idTerm;
  return t;
};
