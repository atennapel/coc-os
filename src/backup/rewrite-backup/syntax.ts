import { Name, Ix } from '../../names';

export type Term
  = { tag: 'Var', index: Ix }
  | { tag: 'Global', name: Name }
  | { tag: 'App', left: Term, right: Term }
  | { tag: 'Abs', name: Name, type: Term, body: Term }
  | { tag: 'Let', name: Name, val: Term, body: Term }
  | { tag: 'Pi', name: Name, type: Term, body: Term }
  | { tag: 'Ann', term: Term, type: Term }
  | { tag: 'Type' };

export const Var = (index: Ix): Term =>
  ({ tag: 'Var', index });
export const Global = (name: Name): Term =>
  ({ tag: 'Global', name });
export const App = (left: Term, right: Term): Term =>
  ({ tag: 'App', left, right });
export const Abs = (name: Name, type: Term, body: Term): Term =>
  ({ tag: 'Abs', name, type, body });
export const Let = (name: Name, val: Term, body: Term): Term =>
  ({ tag: 'Let', name, val, body });
export const Pi = (name: Name, type: Term, body: Term): Term =>
  ({ tag: 'Pi', name, type, body });
export const Ann = (term: Term, type: Term): Term =>
  ({ tag: 'Ann', term, type });
export const Type: Term = { tag: 'Type' };

export const showTerm = (t: Term): string => {
  if (t.tag === 'Var') return `${t.index}`;
  if (t.tag === 'Global') return t.name;
  if (t.tag === 'App') return `(${showTerm(t.left)} ${showTerm(t.right)})`;
  if (t.tag === 'Abs') return `(\\(${t.name} : ${showTerm(t.type)}). ${showTerm(t.body)})`;
  if (t.tag === 'Let') return `(let ${t.name} = ${showTerm(t.val)} in ${showTerm(t.body)})`;
  if (t.tag === 'Pi') return `(/(${t.name} : ${showTerm(t.type)}). ${showTerm(t.body)})`;
  if (t.tag === 'Ann') return `(${showTerm(t.term)} : ${showTerm(t.type)})`;
  if (t.tag === 'Type') return '*';
  return t;
};
