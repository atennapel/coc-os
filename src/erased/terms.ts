import { Ix, Term, Var, Type } from '../core/terms';

export type Erased
  = { tag: 'Var', index: Ix }
  | { tag: 'EApp', left: Erased, right: Erased }
  | { tag: 'EAbs', body: Erased }
  | { tag: 'ELet', val: Erased, body: Erased }
  | { tag: 'Type' };

export const EVar = (index: Ix): Erased => Var(index) as Erased;
export const EApp = (left: Erased, right: Erased): Erased => ({ tag: 'EApp', left, right });
export const EAbs = (body: Erased): Erased => ({ tag: 'EAbs', body });
export const ELet = (val: Erased, body: Erased): Erased => ({ tag: 'ELet', val, body });
export const EType = Type as Erased;

export const flattenEApp = (t: Erased): [Erased, Erased[]] => {
  const r: Erased[] = [];
  while (t.tag === 'EApp') {
    r.push(t.right);
    t = t.left;
  }
  return [t, r.reverse()];
};

export const showETermP = (b: boolean, t: Erased): string =>
  b ? `(${showETerm(t)})` : showETerm(t);
export const showETerm = (t: Erased): string => {
  if (t.tag === 'Type') return '*';
  if (t.tag === 'Var') return `${t.index}`;
  if (t.tag === 'EApp') {
    const [f, as] = flattenEApp(t);
    return `${showETermP(f.tag === 'EAbs' || f.tag === 'EApp' || f.tag === 'ELet', f)} ${
      as.map((t, i) =>
          `${showETermP(t.tag === 'EApp' || (t.tag === 'ELet' && i < as.length - 1) || (t.tag === 'EAbs' && i < as.length - 1), t)}`).join(' ')}`;
  }
  if (t.tag === 'EAbs') return `λ${showETerm(t.body)}`;
  if (t.tag === 'ELet')
    return `let ${showETerm(t.val)} in ${showETerm(t.body)}`;
  return t;
};

export const shift = (d: Ix, c: Ix, t: Erased): Erased => {
  if (t.tag === 'Var') return t.index < c ? t : EVar(t.index + d);
  if (t.tag === 'EAbs') return EAbs(shift(d, c + 1, t.body));
  if (t.tag === 'ELet') return ELet(shift(d, c, t.val), shift(d, c + 1, t.body));
  if (t.tag === 'EApp') return EApp(shift(d, c, t.left), shift(d, c, t.right));
  return t;
};

export const erase = (t: Term): Erased => {
  if (t.tag === 'Type') return EType;
  if (t.tag === 'Pi') return EType;
  if (t.tag === 'Var') return EVar(t.index);
  if (t.tag === 'App') return t.impl ? erase(t.left) : EApp(erase(t.left), erase(t.right));
  if (t.tag === 'Abs') return t.impl ? shift(-1, 0, erase(t.body)) : EAbs(erase(t.body));
  if (t.tag === 'Let')
    return t.impl ? shift(-1, 0, erase(t.body)) : ELet(erase(t.val), erase(t.body));
  return t;
};
