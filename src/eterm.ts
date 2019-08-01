import { impossible, HashString, Id } from './util';

export type ETerm
  = EVar
  | EHash
  | EAbs
  | EApp;

export interface EVar {
  readonly tag: 'EVar';
  readonly id: Id;
}
export const EVarC = (id: Id): EVar => ({ tag: 'EVar', id });

type EVarMap = { [key: number]: EVar };
const evarMap: EVarMap = {};
export const EVar = (id: Id): EVar =>
  evarMap[id] || (evarMap[id] = EVarC(id));

export interface EHash {
  readonly tag: 'EHash';
  readonly hash: HashString;
}
export const EHash = (hash: HashString): EHash =>
  ({ tag: 'EHash', hash });

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

export const isETermAtom = (t: ETerm): boolean =>
  t.tag === 'EVar' || t.tag === 'EHash';

const showETermP = (b: boolean, t: ETerm): string =>
  b ? `(${showETerm(t)})` : showETerm(t);
export const showETerm = (t: ETerm): string => {
  if (t.tag === 'EVar') return `${t.id}`;
  if (t.tag === 'EHash') return `#${t.hash}`;
  if (t.tag === 'EAbs')
    return `λ${showETermP(t.body.tag === 'EApp', t.body)}`;
  if (t.tag === 'EApp')
    return flattenEApp(t).map(x => showETermP(!isETermAtom(x), x)).join(' ');
  return impossible('showETerm');
};

export const eqETerm = (a: ETerm, b: ETerm): boolean => {
  if (a === b) return true;
  if (a.tag === 'EVar') return b.tag === 'EVar' && a.id === b.id;
  if (a.tag === 'EHash') return b.tag === 'EHash' && a.hash === b.hash;
  if (a.tag === 'EAbs')
    return b.tag === 'EAbs' && eqETerm(a.body, b.body);
  if (a.tag === 'EApp')
    return b.tag === 'EApp' && eqETerm(a.left, b.left) && eqETerm(a.right, b.right);
  return false;
};
