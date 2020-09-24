import { Ix, Name } from './names';

export type Mode = Expl | ImplUnif;
export type Expl = 'Expl';
export const Expl: Expl = 'Expl';
export type ImplUnif = 'ImplUnif';
export const ImplUnif: ImplUnif = 'ImplUnif';

export type Term = Var | App | Abs | Let | Type | Pi | Meta;

export type Var = { tag: 'Var', index: Ix };
export const Var = (index: Ix): Var => ({ tag: 'Var', index });
export type App = { tag: 'App', left: Term, mode: Mode, right: Term };
export const App = (left: Term, mode: Mode, right: Term): App => ({ tag: 'App', left, mode, right });
export type Abs = { tag: 'Abs', mode: Mode, name: Name, type: Term, body: Term };
export const Abs = (mode: Mode, name: Name, type: Term, body: Term): Abs => ({ tag: 'Abs', name, mode, type, body });
export type Let = { tag: 'Let', name: Name, type: Term, val: Term, body: Term };
export const Let = (name: Name, type: Term, val: Term, body: Term): Let => ({ tag: 'Let', name, type, val, body });
export type Type = { tag: 'Type' };
export const Type: Type = { tag: 'Type' };
export type Pi = { tag: 'Pi', mode: Mode, name: Name, type: Term, body: Term };
export const Pi = (mode: Mode, name: Name, type: Term, body: Term): Pi => ({ tag: 'Pi', mode, name, type, body });
export type Meta = { tag: 'Meta', index: Ix };
export const Meta = (index: Ix): Meta => ({ tag: 'Meta', index });

export const showMode = (m: Mode): string => m === 'ImplUnif' ? 'impl' : '';

export const show = (t: Term): string => {
  if (t.tag === 'Var') return `${t.index}`;
  if (t.tag === 'Meta') return `?${t.index}`;
  if (t.tag === 'App') return `(${show(t.left)} ${t.mode === ImplUnif ? 'impl' : ''} ${show(t.right)})`;
  if (t.tag === 'Abs') return `(\\(${t.mode === ImplUnif ? 'impl ' : ''}${t.name} : ${show(t.type)}). ${show(t.body)})`;
  if (t.tag === 'Let') return `(let ${t.name} : ${show(t.type)} = ${show(t.val)} in ${show(t.body)})`;
  if (t.tag === 'Type') return '*';
  if (t.tag === 'Pi') return `(/(${t.mode === ImplUnif ? 'impl ' : ''}${t.name} : ${show(t.type)}). ${show(t.body)})`;
  return t;
};
