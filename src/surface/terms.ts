import * as C from '../core/terms';
import { Val } from './vals';

export type Name = string;
export type Var = { tag: 'Var', name: Name };
export type MetaId = number;
export type Meta = { tag: 'Meta', id: MetaId, val: Val | null };
export type Term
  = Var
  | { tag: 'App', left: Term, impl: boolean, right: Term }
  | { tag: 'Abs', name: Name, type: Term | null, impl: boolean, body: Term }
  | { tag: 'Pi', name: Name, type: Term, impl: boolean, body: Term }
  | { tag: 'Let', name: Name, type: Term | null, impl: boolean, val: Term, body: Term }
  | { tag: 'Ann', term: Term, type: Term }
  | { tag: 'Type' }
  | { tag: 'Hole' }
  | Meta;

export const Var = (name: Name): Var => ({ tag: 'Var', name });
export const App = (left: Term, impl: boolean, right: Term): Term => ({ tag: 'App', left, impl, right });
export const Abs = (name: Name, type: Term | null, impl: boolean, body: Term): Term =>
  ({ tag: 'Abs', name, type, impl, body });
export const Pi = (name: Name, type: Term, impl: boolean, body: Term): Term =>
  ({ tag: 'Pi', name, type, impl, body });
export const Let = (name: Name, type: Term | null, impl: boolean, val: Term, body: Term): Term =>
  ({ tag: 'Let', name, type, impl, val, body });
export const Ann = (term: Term, type: Term): Term =>
  ({ tag: 'Ann', term, type });
export const Type: Term = C.Type as Term;
export const Hole: Term = { tag: 'Hole' };

let tmetaId: MetaId = 0;
export const Meta = (): Meta => ({ tag: 'Meta', id: tmetaId++, val: null });

export const flattenApp = (t: Term): [Term, [boolean, Term][]] => {
  const r: [boolean, Term][] = [];
  while (t.tag === 'App') {
    r.push([t.impl, t.right]);
    t = t.left;
  }
  return [t, r.reverse()];
};
export const flattenAbs = (t: Term): [[Name, boolean, Term | null][], Term] => {
  const r: [Name, boolean, Term | null][] = [];
  while (t.tag === 'Abs') {
    r.push([t.name, t.impl, t.type]);
    t = t.body;
  }
  return [r, t];
};
export const flattenPi = (t: Term): [[Name, boolean, Term][], Term] => {
  const r: [Name, boolean, Term][] = [];
  while (t.tag === 'Pi') {
    r.push([t.name, t.impl, t.type]);
    t = t.body;
  }
  return [r, t];
};

export const showTermP = (b: boolean, t: Term): string =>
  b ? `(${showTerm(t)})` : showTerm(t);
export const showTerm = (t: Term): string => {
  if (t.tag === 'Type') return '*';
  if (t.tag === 'Hole') return '_';
  if (t.tag === 'Var') return `${t.name}`;
  if (t.tag === 'Meta') return `?${t.val ? '!' : ''}${t.id}`;
  if (t.tag === 'App') {
    const [f, as] = flattenApp(t);
    return `${showTermP(f.tag === 'Abs' || f.tag === 'Pi' || f.tag === 'App' || f.tag === 'Let' || f.tag === 'Ann', f)} ${
      as.map(([im, t], i) =>
        im ? `{${showTerm(t)}}` :
          `${showTermP(t.tag === 'App' || t.tag === 'Ann' || (t.tag === 'Let' && i < as.length - 1) || (t.tag === 'Abs' && i < as.length - 1) || (t.tag === 'Pi' && i < as.length - 1), t)}`).join(' ')}`;
  }
  if (t.tag === 'Abs') {
    const [as, b] = flattenAbs(t);
    return `\\${as.map(([x, im, t]) => im ? `{${x}${t ? ` : ${showTermP(t.tag === 'Ann', t)}` : ''}}` : !t ? x : `(${x} : ${showTermP(t.tag === 'Ann', t)})`).join(' ')}. ${showTermP(b.tag === 'Ann', b)}`;
  }
  if (t.tag === 'Pi') {
    const [as, b] = flattenPi(t);
    return `/${as.map(([x, im, t]) => im ? `{${x} : ${showTermP(t.tag === 'Ann', t)}}` : `(${x} : ${showTermP(t.tag === 'Ann', t)})`).join(' ')}. ${showTermP(b.tag === 'Ann', b)}`;
  }
  if (t.tag === 'Let')
    return t.type ?
      `let ${t.impl ? `{${t.name} : ${showTermP(t.type.tag === 'Ann', t.type)}}` : `${t.name} : ${showTermP(t.type.tag === 'Ann', t.type)}`} = ${showTerm(t.val)} in ${showTermP(t.body.tag === 'Ann', t.body)}` :
      `let ${t.name} = ${showTerm(t.val)} in ${showTermP(t.body.tag === 'Ann', t.body)}`;
  if (t.tag === 'Ann')
    return `${showTerm(t.term)} : ${showTerm(t.type)}`;
  return t;
};
