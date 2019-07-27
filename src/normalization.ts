import { Id, Term, Var, Abs, Pi, App } from './terms';

export const shift = (d: Id, c: Id, t: Term): Term => {
  if (t.tag === 'Var') return t.id < c ? t : Var(t.id + d);
  if (t.tag === 'Abs') {
    const ty = shift(d, c, t.type);
    const b = shift(d, c + 1, t.body);
    return ty === t.type && b === t.body ? t : Abs(ty, b);
  }
  if (t.tag === 'Pi') {
    const ty = shift(d, c, t.type);
    const b = shift(d, c + 1, t.body);
    return ty === t.type && b === t.body ? t : Pi(ty, b);
  }
  if (t.tag === 'App') {
    const l = shift(d, c, t.left);
    const r = shift(d, c, t.right);
    return l === t.left && r === t.right ? t : App(l, r);
  }
  return t;
};

export const subst = (j: Id, s: Term, t: Term): Term => {
  if (t.tag === 'Var') {
    const k = t.id;
    return k === j ? s : k < j ? t : Var(k - 1);
  }
  if (t.tag === 'Abs') {
    const ty = subst(j, s, t.type);
    const b = subst(j + 1, shift(1, 0, s), t.body);
    return ty === t.type && b === t.body ? t : Abs(ty, b);
  }
  if (t.tag === 'Pi') {
    const ty = subst(j, s, t.type);
    const b = subst(j + 1, shift(1, 0, s), t.body);
    return ty === t.type && b === t.body ? t : Pi(ty, b);
  }
  if (t.tag === 'App') {
    const l = subst(j, s, t.left);
    const r = subst(j, s, t.right);
    return l === t.left && r === t.right ? t : App(l, r);
  }
  return t;
};

export const beta = (a: Abs | Pi, s: Term): Term => subst(0, s, a.body);

export const normalize = (t: Term): Term => {
  if (t.tag === 'Abs') {
    const ty = normalize(t.type);
    const b = normalize(t.body);
    return ty === t.type && b === t.body ? t : Abs(ty, b);
  }
  if (t.tag === 'Pi') {
    const ty = normalize(t.type);
    const b = normalize(t.body);
    return ty === t.type && b === t.body ? t : Pi(ty, b);
  }
  if (t.tag === 'App') {
    const l = normalize(t.left);
    const r = normalize(t.right);
    return l.tag === 'Abs' ? beta(l, r) :
      l === t.left && r === t.right ? t : App(l, r);
  }
  return t;
};

export const whnf = (t: Term): Term => {
  if (t.tag === 'App') {
    const f = whnf(t.left);
    return f.tag === 'Abs' ? beta(f, t.right) :
      f === t.left ? t : App(f, t.right);
  }
  return t;
};
