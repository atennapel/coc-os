import { impossible } from './util';

export type Term = Var | Abs | App | Pi | Type | Fix;

export interface Var {
  readonly tag: 'Var';
  readonly index: number;
}
export const Var = (index: number): Var => ({ tag: 'Var', index });

export interface Abs {
  readonly tag: 'Abs';
  readonly type: Term;
  readonly body: Term;
}
export const Abs = (type: Term, body: Term): Abs =>
  ({ tag: 'Abs', type, body });
export const abs = (ts: Term[], body: Term): Term =>
  ts.reduceRight((x, y) => Abs(y, x), body);

export interface App {
  readonly tag: 'App';
  readonly left: Term;
  readonly right: Term;
}
export const App = (left: Term, right: Term): App =>
  ({ tag: 'App', left, right });
export const appFrom = (ts: Term[]): Term => ts.reduce(App);
export const app = (...ts: Term[]): Term => appFrom(ts);

export interface Pi {
  readonly tag: 'Pi';
  readonly type: Term;
  readonly body: Term;
}
export const Pi = (type: Term, body: Term): Pi =>
  ({ tag: 'Pi', type, body });
export const pi = (ts: Term[], body: Term): Term =>
  ts.reduceRight((x, y) => Pi(y, x), body);
export const funFrom = (ts: Term[]): Term =>
  ts.reduceRight((x, y) => Pi(y, x));
export const fun = (...ts: Term[]): Term => funFrom(ts);

export interface Fix {
  readonly tag: 'Fix';
  readonly type: Term;
  readonly body: Term;
}
export const Fix = (type: Term, body: Term): Fix =>
  ({ tag: 'Fix', type, body });

export interface Type {
  readonly tag: 'Type';
}
export const Type: Type = { tag: 'Type' };

export const showTerm = (t: Term): string => {
  if (t.tag === 'Var') return `${t.index}`;
  if (t.tag === 'Abs') return `(\\${showTerm(t.type)}.${showTerm(t.body)})`;
  if (t.tag === 'Fix') return `(fix ${showTerm(t.type)}.${showTerm(t.body)})`;
  if (t.tag === 'App') return `(${showTerm(t.left)} ${showTerm(t.right)})`;
  if (t.tag === 'Pi') return `(${showTerm(t.type)} -> ${showTerm(t.body)})`;
  if (t.tag === 'Type') return '*';
  return impossible('showTerm');
};
