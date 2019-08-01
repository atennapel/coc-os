import { impossible, Id } from './util';

export type ETerm
  = EVar
  | EAbs
  | EApp
  | EReturnIO
  | EBindIO
  | EBeepIO;

export interface EVar {
  readonly tag: 'EVar';
  readonly id: Id;
}
export const EVarC = (id: Id): EVar => ({ tag: 'EVar', id });

type EVarMap = { [key: number]: EVar };
const evarMap: EVarMap = {};
export const EVar = (id: Id): EVar =>
  evarMap[id] || (evarMap[id] = EVarC(id));

export interface EAbs {
  readonly tag: 'EAbs';
  readonly body: ETerm;
}
export const EAbs = (body: ETerm): EAbs =>
  ({ tag: 'EAbs', body });

export interface EApp {
  readonly tag: 'EApp';
  readonly left: ETerm;
  readonly right: ETerm;
}
export const EApp = (left: ETerm, right: ETerm): EApp =>
  ({ tag: 'EApp', left, right });
export const eappFrom = (ts: ETerm[]): ETerm => ts.reduce(EApp);
export const eapp = (...ts: ETerm[]): ETerm => eappFrom(ts);
export const flattenEApp = (t: ETerm): ETerm[] => {
  const a: ETerm[] = [];
  while (t.tag === 'EApp') {
    a.push(t.right);
    t = t.left;
  }
  a.push(t);
  return a.reverse();
};

export interface EReturnIO { readonly tag: 'EReturnIO' }
export const EReturnIO: EReturnIO = { tag: 'EReturnIO' };

export interface EBindIO { readonly tag: 'EBindIO' }
export const EBindIO: EBindIO = { tag: 'EBindIO' };

export interface EBeepIO { readonly tag: 'EBeepIO' }
export const EBeepIO: EBeepIO = { tag: 'EBeepIO' };

export const isETermAtom = (t: ETerm): boolean =>
  t.tag === 'EVar' || t.tag === 'EReturnIO' || t.tag === 'EBeepIO' || t.tag === 'EBindIO';

const showETermP = (b: boolean, t: ETerm): string =>
  b ? `(${showETerm(t)})` : showETerm(t);
export const showETerm = (t: ETerm): string => {
  if (t.tag === 'EVar') return `${t.id}`;
  if (t.tag === 'EAbs')
    return `λ${showETermP(t.body.tag === 'EApp', t.body)}`;
  if (t.tag === 'EApp')
    return flattenEApp(t).map(x => showETermP(!isETermAtom(x), x)).join(' ');
  if (t.tag === 'EReturnIO') return 'returnIO';
  if (t.tag === 'EBindIO') return 'bindIO';
  if (t.tag === 'EBeepIO') return 'beepIO';
  return impossible('showETerm');
};

export const eqETerm = (a: ETerm, b: ETerm): boolean => {
  if (a === b) return true;
  if (a.tag === 'EVar') return b.tag === 'EVar' && a.id === b.id;
  if (a.tag === 'EAbs')
    return b.tag === 'EAbs' && eqETerm(a.body, b.body);
  if (a.tag === 'EApp')
    return b.tag === 'EApp' && eqETerm(a.left, b.left) && eqETerm(a.right, b.right);
  if (a.tag === 'EReturnIO') return b.tag === 'EReturnIO';
  if (a.tag === 'EBindIO') return b.tag === 'EBindIO';
  if (a.tag === 'EBeepIO') return b.tag === 'EBeepIO';
  return false;
};

export const shiftETerm = (d: Id, c: Id, t: ETerm): ETerm => {
  if (t.tag === 'EVar') return t.id < c ? t : EVar(t.id + d);
  if (t.tag === 'EAbs') {
    const b = shiftETerm(d, c + 1, t.body);
    return b === t.body ? t : EAbs(b);
  }
  if (t.tag === 'EApp') {
    const l = shiftETerm(d, c, t.left);
    const r = shiftETerm(d, c, t.right);
    return l === t.left && r === t.right ? t : EApp(l, r);
  }
  return t;
};

export const substETerm = (j: Id, s: ETerm, t: ETerm): ETerm => {
  if (t.tag === 'EVar') {
    const k = t.id;
    return k === j ? s : k < j ? t : EVar(k - 1);
  }
  if (t.tag === 'EAbs') {
    const b = substETerm(j + 1, shiftETerm(1, 0, s), t.body);
    return b === t.body ? t : EAbs(b);
  }
  if (t.tag === 'EApp') {
    const l = substETerm(j, s, t.left);
    const r = substETerm(j, s, t.right);
    return l === t.left && r === t.right ? t : EApp(l, r);
  }
  return t;
};

export const openEAbs = (t: EAbs, s: ETerm): ETerm =>
  substETerm(0, s, t.body);

export const stepFull = (t: ETerm): ETerm | null => {
  if (t.tag === 'EApp') {
    const f = stepFull(t.left);
    if (f) return EApp(f, t.right);
    const a = stepFull(t.right);
    if (a) return EApp(t.left, a);
    return t.left.tag === 'EAbs' ? openEAbs(t.left, t.right) : null;
  }
  if (t.tag === 'EAbs') {
    const b = stepFull(t.body);
    return b ? EAbs(b) : null;
  }
  return null;
};

export const stepCBV = (t: ETerm): ETerm | null => {
  if (t.tag === 'EApp') {
    const f = stepCBV(t.left);
    if (f) return EApp(f, t.right);
    const a = stepCBV(t.right);
    if (a) return EApp(t.left, a);
    return t.left.tag === 'EAbs' ? openEAbs(t.left, t.right) : null;
  }
  return null;
};

export const stepCBN = (t: ETerm): ETerm | null => {
  if (t.tag === 'EApp') {
    const f = stepCBN(t.left);
    if (f) return EApp(f, t.right);
    if (t.left.tag === 'EAbs') return openEAbs(t.left, t.right);
    const a = stepCBN(t.right);
    if (a) return EApp(t.left, a);
    return null;
  }
  return null;
};

export const step = (t: ETerm, st: (t: ETerm) => ETerm | null): ETerm =>
  st(t) || t;
export const steps = (t: ETerm, step: (t: ETerm) => ETerm | null): ETerm => {
  let c: ETerm | null = t;
  let p = c;
  while (c) {
    p = c;
    c = step(c);
  }
  return p;
};

export const normalizeFull = (t: ETerm) => steps(t, stepFull);
export const normalizeCBV = (t: ETerm) => steps(t, stepCBV);
export const normalizeCBN = (t: ETerm) => steps(t, stepCBN);
