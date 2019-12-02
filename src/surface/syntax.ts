import { Name } from '../names';
import { TMetaId } from './metas';

export type Term
  = { tag: 'Var', name: Name }
  | { tag: 'App', left: Term, right: Term }
  | { tag: 'Abs', name: Name, type: Term | null, body: Term }
  | { tag: 'Pi', name: Name, type: Term, body: Term }
  | { tag: 'Let', name: Name, val: Term, body: Term }
  | { tag: 'Ann', term: Term, type: Term }
  | { tag: 'Type' }
  | { tag: 'Hole' }
  | { tag: 'Meta', id: TMetaId };

export const Var = (name: Name): Term => ({ tag: 'Var', name });
export const App = (left: Term, right: Term): Term =>
  ({ tag: 'App', left, right });
export const Abs = (name: Name, type: Term | null, body: Term): Term =>
  ({ tag: 'Abs', name, type, body });
export const Pi = (name: Name, type: Term, body: Term): Term =>
  ({ tag: 'Pi', name, type, body });
export const Let = (name: Name, val: Term, body: Term): Term =>
  ({ tag: 'Let', name, val, body });
export const Ann = (term: Term, type: Term): Term =>
  ({ tag: 'Ann', term, type });
export const Type: Term = { tag: 'Type' };
export const Hole: Term = { tag: 'Hole' };
export const Meta = (id: TMetaId): Term => ({ tag: 'Meta', id });

export const showTerm = (t: Term): string => {
  if (t.tag === 'Var') return t.name;
  if (t.tag === 'App') return `(${showTerm(t.left)} ${showTerm(t.right)})`;
  if (t.tag === 'Abs')
    return t.type ?
      `(\\(${t.name} : ${showTerm(t.type)}). ${showTerm(t.body)})` :
      `(\\${t.name}. ${showTerm(t.body)})`;
  if (t.tag === 'Pi')
    return `((${t.name} : ${showTerm(t.type)}) -> ${showTerm(t.body)})`;
  if (t.tag === 'Let')
    return `(let ${t.name} = ${showTerm(t.val)} in ${showTerm(t.body)})`;
  if (t.tag === 'Ann')
    return `(${showTerm(t.term)} : ${showTerm(t.type)})`;
  if (t.tag === 'Type') return `*`;
  if (t.tag === 'Hole') return `_`;
  if (t.tag === 'Meta') return `?${t.id}`;
  return t;
};
