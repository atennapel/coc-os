import { Ix, Term, showTerm } from '../core/terms';

export type Erased
  = { tag: 'EVar', index: Ix }
  | { tag: 'EApp', left: Erased, right: Erased }
  | { tag: 'EAbs', body: Erased }
  | { tag: 'ELet', val: Erased, body: Erased }
  | { tag: 'EType' };

export const EVar = (index: Ix): Erased => ({ tag: 'EVar', index });
export const EApp = (left: Erased, right: Erased): Erased => ({ tag: 'EApp', left, right });
export const EAbs = (body: Erased): Erased => ({ tag: 'EAbs', body });
export const ELet = (val: Erased, body: Erased): Erased => ({ tag: 'ELet', val, body });
export const EType: Erased = { tag: 'EType' };

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
  if (t.tag === 'EType') return '*';
  if (t.tag === 'EVar') return `${t.index}`;
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

export const erase = (t: Term, k: number = 0, l: number = 0): Erased => {
  console.log(showTerm(t), ';', k, ';', l);
  if (t.tag === 'Type') return EType;
  if (t.tag === 'Pi') return EType;
  if (t.tag === 'Var') return EVar(t.index - (l - k) + 1);
  if (t.tag === 'App') return t.impl ? erase(t.left, k, l) : EApp(erase(t.left, k, l), erase(t.right, k, l));
  if (t.tag === 'Abs') return t.impl ? erase(t.body, k, l + 1) : EAbs(erase(t.body, k + 1, l + 1));
  if (t.tag === 'Let')
    return t.impl ? erase(t.body, k, l + 1) : ELet(erase(t.val, k, l), erase(t.body, k + 1, l + 1));
  return t;
};
