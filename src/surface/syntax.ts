import { Name } from '../names';
import { TMetaId } from './metas';

export type Term
  = { tag: 'Var', name: Name }
  | { tag: 'App', left: Term, impl: boolean, right: Term }
  | { tag: 'Abs', name: Name, impl: boolean, type: Term | null, body: Term }
  | { tag: 'Pi', name: Name, impl: boolean, type: Term, body: Term }
  | { tag: 'Fix', name: Name, type: Term, body: Term }
  | { tag: 'Let', name: Name, impl: boolean, val: Term, body: Term }
  | { tag: 'Ann', term: Term, type: Term }
  | { tag: 'Type' }
  | { tag: 'Hole' }
  | { tag: 'Open', names: Name[], body: Term }
  | { tag: 'Meta', id: TMetaId };
  // TODO roll and unroll

export const Var = (name: Name): Term => ({ tag: 'Var', name });
export const App = (left: Term, impl: boolean, right: Term): Term =>
  ({ tag: 'App', left, impl, right });
export const Abs = (name: Name, impl: boolean, type: Term | null, body: Term): Term =>
  ({ tag: 'Abs', name, impl, type, body });
export const Pi = (name: Name, impl: boolean, type: Term, body: Term): Term =>
  ({ tag: 'Pi', name, impl, type, body });
export const Fix = (name: Name, type: Term, body: Term): Term =>
  ({ tag: 'Fix', name, type, body });
export const Let = (name: Name, impl: boolean, val: Term, body: Term): Term =>
  ({ tag: 'Let', name, impl, val, body });
export const Ann = (term: Term, type: Term): Term =>
  ({ tag: 'Ann', term, type });
export const Type: Term = { tag: 'Type' };
export const Hole: Term = { tag: 'Hole' };
export const Open = (names: Name[], body: Term): Term =>
  ({ tag: 'Open', names, body });
export const Meta = (id: TMetaId): Term => ({ tag: 'Meta', id });

export const showTermSimple = (t: Term): string => {
  if (t.tag === 'Var') return t.name;
  if (t.tag === 'App')
    return `(${showTermSimple(t.left)} ${t.impl ? '{' : ''}${showTermSimple(t.right)}${t.impl ? '}' : ''})`;
  if (t.tag === 'Abs')
    return t.type ?
      `(\\${t.impl ? '{' : '('}${t.name} : ${showTermSimple(t.type)}${t.impl ? '}' : ')'}. ${showTermSimple(t.body)})` :
      `(\\${t.impl ? '{' : ''}${t.name}${t.impl ? '}' : ''}. ${showTermSimple(t.body)})`;
  if (t.tag === 'Pi')
    return `(${t.impl ? '{' : '('}${t.name} : ${showTermSimple(t.type)}${t.impl ? '}' : ')'} -> ${showTermSimple(t.body)})`;
  if (t.tag === 'Fix')
    return `(fix (${t.name} : ${showTermSimple(t.type)}). ${showTermSimple(t.body)})`;
  if (t.tag === 'Let')
    return `(let ${t.impl ? '{' : ''}${t.name}${t.impl ? '}' : ''} = ${showTermSimple(t.val)} in ${showTermSimple(t.body)})`;
  if (t.tag === 'Ann')
    return `(${showTermSimple(t.term)} : ${showTermSimple(t.type)})`;
  if (t.tag === 'Type') return `*`;
  if (t.tag === 'Hole') return `_`;
  if (t.tag === 'Open')
    return `(open ${t.names.join(' ')} in ${showTermSimple(t.body)})`;
  if (t.tag === 'Meta') return `?${t.id}`;
  return t;
};

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
  if (t.tag === 'Meta') return `?${t.id}`;
  if (t.tag === 'App') {
    const [f, as] = flattenApp(t);
    return `${showTermP(f.tag === 'Abs' || f.tag === 'Pi' || f.tag === 'App' || f.tag === 'Let' || f.tag === 'Ann' || f.tag === 'Open', f)} ${
      as.map(([im, t], i) =>
        im ? `{${showTerm(t)}}` :
          `${showTermP(t.tag === 'App' || t.tag === 'Ann' || t.tag === 'Open' || t.tag === 'Let' || (t.tag === 'Abs' && i < as.length - 1) || t.tag === 'Pi', t)}`).join(' ')}`;
  }
  if (t.tag === 'Abs') {
    const [as, b] = flattenAbs(t);
    return `\\${as.map(([x, im, t]) => im ? `{${x}${t ? ` : ${showTermP(t.tag === 'Ann', t)}` : ''}}` : !t ? x : `(${x} : ${showTermP(t.tag === 'Ann', t)})`).join(' ')}. ${showTermP(b.tag === 'Ann', b)}`;
  }
  if (t.tag === 'Pi') {
    const [as, b] = flattenPi(t);
    return `${as.map(([x, im, t]) => x === '_' ? (im ? `${im ? '{' : ''}${showTerm(t)}${im ? '}' : ''}` : `${showTermP(t.tag === 'Ann' || t.tag === 'Abs' || t.tag === 'Let' || t.tag === 'Pi' || t.tag === 'Open', t)}`) : `${im ? '{' : '('}${x} : ${showTermP(t.tag === 'Ann', t)}${im ? '}' : ')'}`).join(' -> ')} -> ${showTermP(b.tag === 'Ann', b)}`;
  }
  if (t.tag === 'Fix')
    return `(fix (${t.name} : ${showTerm(t.type)}). ${showTerm(t.body)})`;
  if (t.tag === 'Let')
    return `let ${t.impl ? `{${t.name}}` : t.name} = ${showTermP(t.val.tag === 'Let' || t.val.tag === 'Open', t.val)} in ${showTermP(t.body.tag === 'Ann', t.body)}`;
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
  if (t.tag === 'Fix') return isUnsolved(t.type) || isUnsolved(t.body);
  if (t.tag === 'Let') return isUnsolved(t.val) || isUnsolved(t.body);
  if (t.tag === 'Ann') return isUnsolved(t.term) || isUnsolved(t.type);
  if (t.tag === 'Open') return isUnsolved(t.body);
  return t;
};

export const erase = (t: Term): Term => {
  if (t.tag === 'Meta') return t;
  if (t.tag === 'Hole') return t;
  if (t.tag === 'Type') return t;
  if (t.tag === 'Var') return t;
  if (t.tag === 'App')
    return t.impl ? erase(t.left) : App(erase(t.left), false, erase(t.right));
  if (t.tag === 'Abs')
    return t.impl ? erase(t.body) : Abs(t.name, t.impl, null, erase(t.body));
  if (t.tag === 'Pi') return Type;
  if (t.tag === 'Fix') return Type;
  if (t.tag === 'Let')
    return t.impl ? erase(t.body) : Let(t.name, t.impl, erase(t.val), erase(t.body));
  if (t.tag === 'Ann') return erase(t.term);
  if (t.tag === 'Open') return Open(t.names, erase(t.body));
  return t;
};
