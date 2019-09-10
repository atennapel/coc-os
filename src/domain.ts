import { List, Nil } from './list';
import { Term, Type, Var } from './terms';

export type Env = List<Domain>;

export interface Clos {
  readonly body: Term;
  readonly env: Env;
}
export const Clos = (body: Term, env: Env): Clos => ({ body, env });

export type Domain = DAbs | DNeutral | DPi | Type;

export interface DAbs {
  readonly tag: 'DAbs';
  readonly type: Domain;
  readonly clos: Clos;
}
export const DAbs = (type: Domain, clos: Clos): DAbs =>
  ({ tag: 'DAbs', type, clos });

export interface DNeutral {
  readonly tag: 'DNeutral';
  readonly head: Var;
  readonly args: List<Domain>; // reverse order
}
export const DNeutral = (head: Var, args: List<Domain> = Nil): DNeutral =>
  ({ tag: 'DNeutral', head, args });
export const DVar = (index: number): DNeutral => DNeutral(Var(index));

export interface DPi {
  readonly tag: 'DPi';
  readonly type: Domain;
  readonly clos: Clos;
}
export const DPi = (type: Domain, clos: Clos): DPi =>
  ({ tag: 'DPi', type, clos });
