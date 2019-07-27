import { impossible } from './util';

export type Id = number;

export type Term
  = Var
  | Hash
  | Abs
  | Pi
  | App
  | Sort;

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
  readonly hash: string;
}
export const Hash = (hash: string): Hash => ({ tag: 'Hash', hash });

export interface Sort {
  readonly tag: 'Sort';
  readonly name: string;
}
export const Sort = (name: string): Sort => ({ tag: 'Sort', name });
export const Star = Sort('*');
export const Box = Sort('**');

export interface Abs {
  readonly tag: 'Abs';
  readonly type: Term;
  readonly body: Term;
}
export const Abs = (type: Term, body: Term): Abs =>
  ({ tag: 'Abs', type, body });
export const abs = (ts: Term[], body: Term): Term =>
  ts.reduceRight((x, y) => Abs(y, x), body);
export const flattenAbs = (t: Term): [Term[], Term] => {
  const a: Term[] = [];
  while (t.tag === 'Abs') {
    a.push(t.type);
    t = t.body;
  }
  return [a, t];
};

export interface Pi {
  readonly tag: 'Pi';
  readonly type: Term;
  readonly body: Term;
}
export const Pi = (type: Term, body: Term): Pi =>
  ({ tag: 'Pi', type, body });
export const pi = (ts: Term[], body: Term): Term =>
  ts.reduceRight((x, y) => Pi(y, x), body);
export const flattenPi = (t: Term): [Term[], Term] => {
  const a: Term[] = [];
  while (t.tag === 'Pi') {
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

export const isAtom = (t: Term): boolean =>
  t.tag === 'Var' || t.tag === 'Sort' || t.tag === 'Hash';

const showTermP = (b: boolean, t: Term): string =>
  b ? `(${showTerm(t)})` : showTerm(t);
export const showTerm = (t: Term): string => {
  if (t.tag === 'Sort') return t.name;
  if (t.tag === 'Var') return `${t.id}`;
  if (t.tag === 'Hash') return `#${t.hash}`;
  if (t.tag === 'Abs') {
    const [ns, b] = flattenAbs(t);
    return `\\${ns.map(x => showTermP(!isAtom(x), x)).join(' ')}. ${showTerm(b)}`;
  }
  if (t.tag === 'Pi') {
    const [ns, b] = flattenPi(t);
    return `/${ns.map(x => showTermP(!isAtom(x), x)).join(' ')}. ${showTerm(b)}`;
  }
  if (t.tag === 'App')
    return flattenApp(t).map(x => showTermP(!isAtom(x), x)).join(' ');
  return impossible('showTerm');
};

export const eqTerm = (a: Term, b: Term): boolean => {
  if (a === b) return true;
  if (a.tag === 'Sort') return b.tag === 'Sort' && a.name === b.name;
  if (a.tag === 'Var') return b.tag === 'Var' && a.id === b.id;
  if (a.tag === 'Hash') return b.tag === 'Hash' && a.hash === b.hash;
  if (a.tag === 'Abs')
    return b.tag === 'Abs' && eqTerm(a.type, b.type) && eqTerm(a.body, b.body);
  if (a.tag === 'Pi')
    return b.tag === 'Pi' && eqTerm(a.type, b.type) && eqTerm(a.body, b.body);
  if (a.tag === 'App')
    return b.tag === 'App' && eqTerm(a.left, b.left) && eqTerm(a.right, b.right);
  return false;
};
