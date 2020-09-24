import { Ix, Name } from './names';

export type Term = Var | App | Abs | Let | Type | Pi;

export type Var = { tag: 'Var', index: Ix };
export const Var = (index: Ix): Var => ({ tag: 'Var', index });
export type App = { tag: 'App', left: Term, right: Term };
export const App = (left: Term, right: Term): App => ({ tag: 'App', left, right });
export type Abs = { tag: 'Abs', name: Name, type: Term, body: Term };
export const Abs = (name: Name, type: Term, body: Term): Abs => ({ tag: 'Abs', name, type, body });
export type Let = { tag: 'Let', name: Name, type: Term, val: Term, body: Term };
export const Let = (name: Name, type: Term, val: Term, body: Term): Let => ({ tag: 'Let', name, type, val, body });
export type Type = { tag: 'Type' };
export const Type: Type = { tag: 'Type' };
export type Pi = { tag: 'Pi', name: Name, type: Term, body: Term };
export const Pi = (name: Name, type: Term, body: Term): Pi => ({ tag: 'Pi', name, type, body });

export const show = (t: Term): string => {
  if (t.tag === 'Var') return `${t.index}`;
  if (t.tag === 'App') return `(${show(t.left)} ${show(t.right)})`;
  if (t.tag === 'Abs') return `(\\(${t.name} : ${show(t.type)}). ${show(t.body)})`;
  if (t.tag === 'Let') return `(let ${t.name} : ${show(t.type)} = ${show(t.val)} in ${show(t.body)})`;
  if (t.tag === 'Type') return '*';
  if (t.tag === 'Pi') return `(/(${t.name} : ${show(t.type)}). ${show(t.body)})`;
  return t;
};
