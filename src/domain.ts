import { List, Nil, toString } from './list';
import { Term, Type, Var, showTerm } from './terms';
import { quote } from './nbe';

export type Env = List<Domain>;

export const showEnv = (e: Env, k: number = 0): string =>
  toString(e, d => showTerm(quote(d, k)));

export interface Clos {
  readonly body: Term;
  readonly env: Env;
}
export const Clos = (body: Term, env: Env): Clos => ({ body, env });

export type Domain = DAbs | DNeutral | DPi | Type | DFix;

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

export interface DFix {
  readonly tag: 'DFix';
  readonly type: Domain;
  readonly clos: Clos;
}
export const DFix = (type: Domain, clos: Clos): DFix =>
  ({ tag: 'DFix', type, clos });
