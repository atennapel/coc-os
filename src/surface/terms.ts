import * as C from '../core/terms';

export type Name = string;

export type Term
  = { tag: 'Var', name: Name }
  | { tag: 'App', left: Term, impl: boolean, right: Term }
  | { tag: 'Abs', name: Name, type: Term | null, impl: boolean, body: Term }
  | { tag: 'Pi', name: Name, type: Term, impl: boolean, body: Term }
  | { tag: 'Let', name: Name, type: Term | null, impl: boolean, val: Term, body: Term }
  | { tag: 'Type' }
  | { tag: 'Hole' }
  // TODO: meta;

export const Var = (name: Name): Term => ({ tag: 'Var', name });
export const App = (left: Term, impl: boolean, right: Term): Term => ({ tag: 'App', left, impl, right });
export const Abs = (name: Name, type: Term | null, impl: boolean, body: Term): Term =>
  ({ tag: 'Abs', name, type, impl, body });
export const Pi = (name: Name, type: Term, impl: boolean, body: Term): Term =>
  ({ tag: 'Pi', name, type, impl, body });
export const Let = (name: Name, type: Term | null, impl: boolean, val: Term, body: Term): Term =>
  ({ tag: 'Let', name, type, impl, val, body });
export const Type: Term = C.Type as Term;
export const Hole: Term = { tag: 'Hole' };

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
  if (t.tag === 'App') {
    const [f, as] = flattenApp(t);
    return `${showTermP(f.tag === 'Abs' || f.tag === 'Pi' || f.tag === 'App' || f.tag === 'Let', f)} ${
      as.map(([im, t], i) =>
        im ? `{${showTerm(t)}}` :
          `${showTermP(t.tag === 'App' || (t.tag === 'Let' && i < as.length - 1) || (t.tag === 'Abs' && i < as.length - 1) || (t.tag === 'Pi' && i < as.length - 1), t)}`).join(' ')}`;
  }
  if (t.tag === 'Abs') {
    const [as, b] = flattenAbs(t);
    return `λ${as.map(([x, im, t]) => im ? `{${x}${t ? ` : ${showTerm(t)}` : ''}}` : !t ? x : `(${x} : ${showTermP(t.tag === 'Abs' || t.tag === 'Pi' || t.tag === 'App' || t.tag === 'Let', t)})`).join(' ')}. ${showTerm(b)}`;
  }
  if (t.tag === 'Pi') {
    const [as, b] = flattenPi(t);
    return `π${as.map(([x, im, t]) => im ? `{${x} : ${showTerm(t)}}` : `(${x} : ${showTermP(t.tag === 'Abs' || t.tag === 'Pi' || t.tag === 'App' || t.tag === 'Let', t)})`).join(' ')}. ${showTerm(b)}`;
  }
  if (t.tag === 'Let')
    return t.type ?
      `let ${t.impl ? `{${t.name} : ${showTerm(t.type)}}` : `${t.name} : ${showTermP(t.type.tag === 'Abs' || t.type.tag === 'Pi' || t.type.tag === 'App' || t.type.tag === 'Let', t.type)}`} = ${showTerm(t.val)} in ${showTerm(t.body)}` :
      `let ${t.name} = ${showTerm(t.val)} in ${showTerm(t.body)}`;
  return t;
};
