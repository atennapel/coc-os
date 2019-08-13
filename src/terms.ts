import { impossible, HashString, Id } from './util';
import { Type, showTypeP, isTypeAtom, eqType, showType, hashesType } from './types';
import { Kind, eqKind, isKindAtom, showKindP } from './kinds';

export type Term
  = Var
  | Hash
  | Abs
  | App
  | AbsT
  | AppT
  | Con
  | Decon
  | Const;

export interface Var {
  readonly tag: 'Var';
  readonly id: Id;
}
export const VarC = (id: Id): Var => ({ tag: 'Var', id });

type VarMap = { [key: number]: Var };
const varMap: VarMap = {};
export const Var = (id: Id): Var =>
  varMap[id] || (varMap[id] = VarC(id));

export interface Hash {
  readonly tag: 'Hash';
  readonly hash: HashString;
}
export const Hash = (hash: HashString): Hash => ({ tag: 'Hash', hash });

export interface Abs {
  readonly tag: 'Abs';
  readonly type: Type;
  readonly body: Term;
}
export const Abs = (type: Type, body: Term): Abs =>
  ({ tag: 'Abs', type, body });
export const abs = (ts: Type[], body: Term): Term =>
  ts.reduceRight((x, y) => Abs(y, x), body);
export const flattenAbs = (t: Term): [Type[], Term] => {
  const a: Type[] = [];
  while (t.tag === 'Abs') {
    a.push(t.type);
    t = t.body;
  }
  return [a, t];
};

export interface App {
  readonly tag: 'App';
  readonly left: Term;
  readonly right: Term;
}
export const App = (left: Term, right: Term): App =>
  ({ tag: 'App', left, right });
export const appFrom = (ts: Term[]): Term => ts.reduce(App);
export const app = (...ts: Term[]): Term => appFrom(ts);
export const flattenApp = (t: Term): Term[] => {
  const a: Term[] = [];
  while (t.tag === 'App') {
    a.push(t.right);
    t = t.left;
  }
  a.push(t);
  return a.reverse();
};

export interface AbsT {
  readonly tag: 'AbsT';
  readonly kind: Kind;
  readonly body: Term;
}
export const AbsT = (kind: Kind, body: Term): AbsT =>
  ({ tag: 'AbsT', kind, body });
export const absT = (ts: Kind[], body: Term): Term =>
  ts.reduceRight((x, y) => AbsT(y, x), body);
export const flattenAbsT = (t: Term): [Kind[], Term] => {
  const a: Kind[] = [];
  while (t.tag === 'AbsT') {
    a.push(t.kind);
    t = t.body;
  }
  return [a, t];
};

export interface AppT {
  readonly tag: 'AppT';
  readonly left: Term;
  readonly right: Type;
}
export const AppT = (left: Term, right: Type): AppT =>
  ({ tag: 'AppT', left, right });
export const appT = (t: Term, ts: Type[]): Term => ts.reduce(AppT, t);
export const flattenAppT = (t: Term): [Term, Type[]] => {
  const a: Type[] = [];
  while (t.tag === 'AppT') {
    a.push(t.right);
    t = t.left;
  }
  return [t, a.reverse()];
};

export interface Con {
  readonly tag: 'Con';
  readonly con: HashString;
}
export const Con = (con: HashString): Con => ({ tag: 'Con', con });

export interface Decon {
  readonly tag: 'Decon';
  readonly con: HashString;
}
export const Decon = (con: HashString): Decon => ({ tag: 'Decon', con });

export type ConstName
  = 'returnIO'
  | 'bindIO'
  | 'beepIO';
export interface Const {
  readonly tag: 'Const';
  readonly name: ConstName;
}
export const Const = (name: ConstName): Const =>
  ({ tag: 'Const', name });

export const ReturnIO = Const('returnIO');
export const BindIO = Const('bindIO');
export const BeepIO = Const('beepIO');

export const isTermAtom = (t: Term): boolean =>
  t.tag === 'Var' || t.tag === 'Hash' || t.tag === 'Con' || t.tag === 'Decon' ||
    t.tag === 'Const';

const showTermP = (b: boolean, t: Term): string =>
  b ? `(${showTerm(t)})` : showTerm(t);
export const showTerm = (t: Term): string => {
  if (t.tag === 'Var') return `${t.id}`;
  if (t.tag === 'Hash') return `#${t.hash}`;
  if (t.tag === 'Abs') {
    const [ns, b] = flattenAbs(t);
    return `λ${ns.map(x => showTypeP(!isTypeAtom(x), x)).join(' ')}. ${showTerm(b)}`;
  }
  if (t.tag === 'App')
    return flattenApp(t).map((x, i) => showTermP(!(isTermAtom(x) || (i === 0 && x.tag === 'AppT')), x)).join(' ');
  if (t.tag === 'AbsT') {
    const [ns, b] = flattenAbsT(t);
    return `Λ${ns.map(x => showKindP(!isKindAtom(x), x)).join(' ')}. ${showTerm(b)}`;
  }
  if (t.tag === 'AppT') {
    const [f, as] = flattenAppT(t);
    return `${showTermP(!(isTermAtom(f) || f.tag === 'App'), f)} ${as.map(t => `[${showType(t)}]`).join(' ')}`;
  }
  if (t.tag === 'Con') return `@${t.con}`;
  if (t.tag === 'Decon') return `~${t.con}`;
  if (t.tag === 'Const') return t.name;
  return impossible('showTerm');
};

export const eqTerm = (a: Term, b: Term): boolean => {
  if (a === b) return true;
  if (a.tag === 'Var') return b.tag === 'Var' && a.id === b.id;
  if (a.tag === 'Hash') return b.tag === 'Hash' && a.hash === b.hash;
  if (a.tag === 'Abs')
    return b.tag === 'Abs' && eqType(a.type, b.type) && eqTerm(a.body, b.body);
  if (a.tag === 'App')
    return b.tag === 'App' && eqTerm(a.left, b.left) && eqTerm(a.right, b.right);
  if (a.tag === 'AbsT')
    return b.tag === 'AbsT' && eqKind(a.kind, b.kind) && eqTerm(a.body, b.body);
  if (a.tag === 'AppT')
    return b.tag === 'AppT' && eqTerm(a.left, b.left) && eqType(a.right, b.right);
  if (a.tag === 'Con') return b.tag === 'Con' && a.con === b.con;
  if (a.tag === 'Decon') return b.tag === 'Decon' && a.con === b.con;
  if (a.tag === 'Const') return b.tag === 'Const' && a.name === b.name;
  return false;
};

export type HashSet = { [key: string]: true };
export const hashesTerm = (t: Term, set: HashSet = {}): HashSet => {
  if (t.tag === 'Var') return set;
  if (t.tag === 'Hash') return set[t.hash] = true, set;
  if (t.tag === 'Abs') return hashesTerm(t.body, set);
  if (t.tag === 'App') return hashesTerm(t.right, hashesTerm(t.left, set));
  if (t.tag === 'AbsT') return hashesTerm(t.body, set);
  if (t.tag === 'AppT') return hashesTerm(t.left, set);
  if (t.tag === 'Con') return set;
  if (t.tag === 'Decon') return set;
  if (t.tag === 'Const') return set;
  return impossible('hashesTerm');
};

export const hashesTypeInTerm = (t: Term, set: HashSet = {}): HashSet => {
  if (t.tag === 'Var') return set;
  if (t.tag === 'Hash') return set;
  if (t.tag === 'Abs') return hashesType(t.type, set);
  if (t.tag === 'App') return hashesTypeInTerm(t.right, hashesTypeInTerm(t.left, set));
  if (t.tag === 'AbsT') return hashesTypeInTerm(t.body, set);
  if (t.tag === 'AppT') return hashesType(t.right, set);
  if (t.tag === 'Con') return set[t.con] = true, set;
  if (t.tag === 'Decon') return set[t.con] = true, set;
  if (t.tag === 'Const') return set;
  return impossible('hashesTypeInTerm');
};
