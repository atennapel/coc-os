import { List } from './list';
import { Term, Type, Var } from './terms';

export type Env = List<Domain>;

export interface Clos {
  readonly body: Term;
  readonly env: Env;
}
export const Clos = (body: Term, env: Env): Clos => ({ body, env });

export type Domain = Var | DAbs | DApp | DPi | Type;

export interface DAbs {
  readonly tag: 'DAbs';
  readonly type: Domain;
  readonly clos: Clos;
}
export const DAbs = (type: Domain, clos: Clos): DAbs =>
  ({ tag: 'DAbs', type, clos });

export interface DApp {
  readonly tag: 'DApp';
  readonly left: Domain;
  readonly right: Domain;
}
export const DApp = (left: Domain, right: Domain): DApp =>
  ({ tag: 'DApp', left, right });

export interface DPi {
  readonly tag: 'DPi';
  readonly type: Domain;
  readonly clos: Clos;
}
export const DPi = (type: Domain, clos: Clos): DPi =>
  ({ tag: 'DPi', type, clos });
