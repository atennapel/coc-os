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
  | { tag: 'Open', names: Name[], body: Term }
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
export const Open = (names: Name[], body: Term): Term =>
  ({ tag: 'Open', names, body });
export const Meta = (id: TMetaId): Term => ({ tag: 'Meta', id });

export const showTermSimple = (t: Term): string => {
  if (t.tag === 'Var') return t.name;
  if (t.tag === 'App') return `(${showTermSimple(t.left)} ${showTermSimple(t.right)})`;
  if (t.tag === 'Abs')
    return t.type ?
      `(\\(${t.name} : ${showTermSimple(t.type)}). ${showTermSimple(t.body)})` :
      `(\\${t.name}. ${showTermSimple(t.body)})`;
  if (t.tag === 'Pi')
    return `((${t.name} : ${showTermSimple(t.type)}) -> ${showTermSimple(t.body)})`;
  if (t.tag === 'Let')
    return `(let ${t.name} = ${showTermSimple(t.val)} in ${showTermSimple(t.body)})`;
  if (t.tag === 'Ann')
    return `(${showTermSimple(t.term)} : ${showTermSimple(t.type)})`;
  if (t.tag === 'Type') return `*`;
  if (t.tag === 'Hole') return `_`;
  if (t.tag === 'Open')
    return `(open ${t.names.join(' ')} in ${showTermSimple(t.body)})`;
  if (t.tag === 'Meta') return `?${t.id}`;
  return t;
};

export const flattenApp = (t: Term): [Term, Term[]] => {
  const r: Term[] = [];
  while (t.tag === 'App') {
    r.push(t.right);
    t = t.left;
  }
  return [t, r.reverse()];
};
export const flattenAbs = (t: Term): [[Name, Term | null][], Term] => {
  const r: [Name, Term | null][] = [];
  while (t.tag === 'Abs') {
    r.push([t.name, t.type]);
    t = t.body;
  }
  return [r, t];
};
export const flattenPi = (t: Term): [[Name, Term][], Term] => {
  const r: [Name, Term][] = [];
  while (t.tag === 'Pi') {
    r.push([t.name, t.type]);
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
  if (t.tag === 'Meta') return `?${t.id}`;
  if (t.tag === 'App') {
    const [f, as] = flattenApp(t);
    return `${showTermP(f.tag === 'Abs' || f.tag === 'Pi' || f.tag === 'App' || f.tag === 'Let' || f.tag === 'Ann' || f.tag === 'Open', f)} ${
      as.map((t, i) => `${showTermP(t.tag === 'App' || t.tag === 'Open' || t.tag === 'Ann' || (t.tag === 'Let' && i < as.length - 1) || (t.tag === 'Abs' && i < as.length - 1) || t.tag === 'Pi', t)}`).join(' ')}`;
  }
  if (t.tag === 'Abs') {
    const [as, b] = flattenAbs(t);
    return `\\${as.map(([x, t]) => !t ? x : `(${x} : ${showTermP(t.tag === 'Ann', t)})`).join(' ')}. ${showTermP(b.tag === 'Ann', b)}`;
  }
  if (t.tag === 'Pi') {
    const [as, b] = flattenPi(t);
    return `${as.map(([x, t]) => x === '_' ? showTermP(t.tag === 'Ann' || t.tag === 'Abs' || t.tag === 'Let' || t.tag === 'Pi' || t.tag === 'Open', t) : `(${x} : ${showTermP(t.tag === 'Ann', t)})`).join(' -> ')} -> ${showTermP(b.tag === 'Ann', b)}`;
  }
  if (t.tag === 'Let')
    return `let ${t.name} = ${showTermP(t.val.tag === 'Let' || t.val.tag === 'Open', t.val)} in ${showTermP(t.body.tag === 'Ann', t.body)}`;
  if (t.tag === 'Ann')
    return `${showTerm(t.term)} : ${showTerm(t.type)}`;
  if (t.tag === 'Open')
    return `open ${t.names.join(' ')} in ${showTerm(t.body)}`;
  return t;
};

export const isUnsolved = (t: Term): boolean => {
  if (t.tag === 'Meta') return true;
  if (t.tag === 'Hole') return true;
  if (t.tag === 'Type') return false;
  if (t.tag === 'Var') return false;
  if (t.tag === 'App') return isUnsolved(t.left) || isUnsolved(t.right);
  if (t.tag === 'Abs') {
    if (t.type && isUnsolved(t.type)) return true;
    return isUnsolved(t.body);
  }
  if (t.tag === 'Pi') return isUnsolved(t.type) || isUnsolved(t.body);
  if (t.tag === 'Let') return isUnsolved(t.val) || isUnsolved(t.body);
  if (t.tag === 'Ann') return isUnsolved(t.term) || isUnsolved(t.type);
  if (t.tag === 'Open') return isUnsolved(t.body);
  return t;
};
