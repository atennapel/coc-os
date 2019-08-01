import { Term, Abs, Var, App, AbsT, AppT } from './terms';
import { Id } from './util';
import { shiftType, Type, substType } from './types';

export const shiftTerm = (d: Id, c: Id, t: Term): Term => {
  if (t.tag === 'Var') return t.id < c ? t : Var(t.id + d);
  if (t.tag === 'Abs') {
    const b = shiftTerm(d, c + 1, t.body);
    return b === t.body ? t : Abs(t.type, b);
  }
  if (t.tag === 'App') {
    const l = shiftTerm(d, c, t.left);
    const r = shiftTerm(d, c, t.right);
    return l === t.left && r === t.right ? t : App(l, r);
  }
  if (t.tag === 'AbsT') {
    const b = shiftTerm(d, c, t.body);
    return b === t.body ? t : AbsT(t.kind, b);
  }
  if (t.tag === 'AppT') {
    const l = shiftTerm(d, c, t.left);
    return l === t.left ? t : AppT(l, t.right);
  }
  return t;
};

export const shiftTypeInTerm = (d: Id, c: Id, t: Term): Term => {
  if (t.tag === 'Abs') {
    const b = shiftTypeInTerm(d, c, t.body);
    const ty = shiftType(d, c, t.type);
    return b === t.body && ty === t.type ? t : Abs(ty, b);
  }
  if (t.tag === 'App') {
    const l = shiftTypeInTerm(d, c, t.left);
    const r = shiftTypeInTerm(d, c, t.right);
    return l === t.left && r === t.right ? t : App(l, r);
  }
  if (t.tag === 'AbsT') {
    const b = shiftTypeInTerm(d, c + 1, t.body);
    return b === t.body ? t : AbsT(t.kind, b);
  }
  if (t.tag === 'AppT') {
    const l = shiftTypeInTerm(d, c, t.left);
    const ty = shiftType(d, c, t.right);
    return l === t.left && ty === t.right ? t : AppT(l, ty);
  }
  return t;
};

export const substTerm = (j: Id, s: Term, t: Term): Term => {
  if (t.tag === 'Var') {
    const k = t.id;
    return k === j ? s : k < j ? t : Var(k - 1);
  }
  if (t.tag === 'Abs') {
    const b = substTerm(j + 1, shiftTerm(1, 0, s), t.body);
    return b === t.body ? t : Abs(t.type, b);
  }
  if (t.tag === 'App') {
    const l = substTerm(j, s, t.left);
    const r = substTerm(j, s, t.right);
    return l === t.left && r === t.right ? t : App(l, r);
  }
  if (t.tag === 'AbsT') {
    const b = substTerm(j, s, t.body);
    return b === t.body ? t : AbsT(t.kind, b);
  }
  if (t.tag === 'AppT') {
    const l = substTerm(j, s, t.left);
    return l === t.left ? t : AppT(l, t.right);
  }
  return t;
};

export const substTypeInTerm = (j: Id, s: Type, t: Term): Term => {
  if (t.tag === 'Abs') {
    const b = substTypeInTerm(j, s, t.body);
    const ty = substType(j, s, t.type);
    return b === t.body && ty === t.type ? t : Abs(ty, b);
  }
  if (t.tag === 'App') {
    const l = substTypeInTerm(j, s, t.left);
    const r = substTypeInTerm(j, s, t.right);
    return l === t.left && r === t.right ? t : App(l, r);
  }
  if (t.tag === 'AbsT') {
    const b = substTypeInTerm(j + 1, shiftType(1, 0, s), t.body);
    return b === t.body ? t : AbsT(t.kind, b);
  }
  if (t.tag === 'AppT') {
    const l = substTypeInTerm(j, s, t.left);
    const ty = substType(j, s, t.right);
    return l === t.left && ty === t.right ? t : AppT(l, ty);
  }
  return t;
};

export const openAbs = (t: Abs, s: Term): Term =>
  substTerm(0, s, t.body);
export const openAbsT = (t: AbsT, s: Type): Term =>
  substTypeInTerm(0, s, t.body);

export const stepFull = (t: Term): Term | null => {
  if (t.tag === 'App') {
    const f = stepFull(t.left);
    if (f) return App(f, t.right);
    const a = stepFull(t.right);
    if (a) return App(t.left, a);
    return t.left.tag === 'Abs' ? openAbs(t.left, t.right) : null;
  }
  if (t.tag === 'Abs') {
    const b = stepFull(t.body);
    return b ? Abs(t.type, b) : null;
  }
  if (t.tag === 'AbsT') {
    const b = stepFull(t.body);
    return b ? AbsT(t.kind, b) : null;
  }
  if (t.tag === 'AppT') {
    const f = stepFull(t.left);
    if (f) return AppT(f, t.right);
    return t.left.tag === 'AbsT' ? openAbsT(t.left, t.right) : null;
  }
  return null;
};

export const stepCBV = (t: Term): Term | null => {
  if (t.tag === 'App') {
    const f = stepCBV(t.left);
    if (f) return App(f, t.right);
    const a = stepCBV(t.right);
    if (a) return App(t.left, a);
    return t.left.tag === 'Abs' ? openAbs(t.left, t.right) : null;
  }
  if (t.tag === 'AppT') {
    const f = stepCBV(t.left);
    if (f) return AppT(f, t.right);
    return t.left.tag === 'AbsT' ? openAbsT(t.left, t.right) : null;
  }
  return null;
};
  
export const stepCBN = (t: Term): Term | null => {
  if (t.tag === 'App') {
    const f = stepCBN(t.left);
    if (f) return App(f, t.right);
    if (t.left.tag === 'Abs') return openAbs(t.left, t.right);
    const a = stepCBN(t.right);
    if (a) return App(t.left, a);
    return null;
  }
  if (t.tag === 'AppT') {
    const f = stepCBV(t.left);
    if (f) return AppT(f, t.right);
    return t.left.tag === 'AbsT' ? openAbsT(t.left, t.right) : null;
  }
  return null;
};

export const step = (t: Term, st: (t: Term) => Term | null): Term =>
  st(t) || t;
export const steps = (t: Term, step: (t: Term) => Term | null): Term => {
  let c: Term | null = t;
  let p = c;
  while (c) {
    p = c;
    c = step(c);
  }
  return p;
};

export const normalizeFull = (t: Term) => steps(t, stepFull);
export const normalizeCBV = (t: Term) => steps(t, stepCBV);
export const normalizeCBN = (t: Term) => steps(t, stepCBN);
