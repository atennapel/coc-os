import { impossible } from './util';
import { Type, Var } from './terms';
import { List, Nil, lookup, Cons } from './list';

export type STerm = SVar | Var | SAbs | SApp | SPi | Type | SAnn | SFix | SLet;

export interface SVar {
  readonly tag: 'SVar';
  readonly name: string;
}
export const SVar = (name: string): SVar => ({ tag: 'SVar', name });

export interface SAbs {
  readonly tag: 'SAbs';
  readonly name: string;
  readonly body: STerm;
  readonly type: STerm | null;
}
export const SAbs = (name: string, body: STerm, type: STerm | null = null): SAbs =>
  ({ tag: 'SAbs', name, body, type });
export const sabs = (ns: string[], body: STerm): STerm =>
  ns.reduceRight((x, y) => SAbs(y, x), body);

export interface SApp {
  readonly tag: 'SApp';
  readonly left: STerm;
  readonly right: STerm;
}
export const SApp = (left: STerm, right: STerm): SApp =>
  ({ tag: 'SApp', left, right });
export const sappFrom = (ts: STerm[]): STerm => ts.reduce(SApp);
export const sapp = (...ts: STerm[]): STerm => sappFrom(ts);

export interface SPi {
  readonly tag: 'SPi';
  readonly name: string;
  readonly type: STerm;
  readonly body: STerm;
}
export const SPi = (name: string, type: STerm, body: STerm): SPi =>
  ({ tag: 'SPi', name, type, body });
export const spi = (ts: [string, STerm][], body: STerm): STerm =>
  ts.reduceRight((x, [y, t]) => SPi(y, t, x), body);
export const sfunFrom = (ts: STerm[]): STerm =>
  ts.reduceRight((x, y) => SPi('_', y, x));
export const sfun = (...ts: STerm[]): STerm => sfunFrom(ts);

export interface SFix {
  readonly tag: 'SFix';
  readonly name: string;
  readonly type: STerm;
  readonly body: STerm;
}
export const SFix = (name: string, type: STerm, body: STerm): SFix =>
  ({ tag: 'SFix', name, type, body });

export interface SAnn {
  readonly tag: 'SAnn';
  readonly term: STerm;
  readonly type: STerm;
}
export const SAnn = (term: STerm, type: STerm): SAnn =>
  ({ tag: 'SAnn', term, type });

export interface SLet {
  readonly tag: 'SLet';
  readonly name: string;
  readonly type: STerm;
  readonly value: STerm;
  readonly body: STerm;
}
export const SLet = (name: string, type: STerm, value: STerm, body: STerm): SLet =>
  ({ tag: 'SLet', name, type, value, body });

export const showSTerm = (t: STerm): string => {
  if (t.tag === 'SVar') return t.name;
  if (t.tag === 'Var') return `${t.index}`;
  if (t.tag === 'SAbs') return `(\\${t.type ? `(${t.name}:${showSTerm(t.type)})` : t.name}.${showSTerm(t.body)})`;
  if (t.tag === 'SFix') return `(fix(${t.name}:${showSTerm(t.type)}).${showSTerm(t.body)})`;
  if (t.tag === 'SApp') return `(${showSTerm(t.left)} ${showSTerm(t.right)})`;
  if (t.tag === 'SAnn') return `(${showSTerm(t.term)} : ${showSTerm(t.type)})`;
  if (t.tag === 'SPi') return `((${t.name}:${showSTerm(t.type)}) -> ${showSTerm(t.body)})`;
  if (t.tag === 'Type') return '*';
  if (t.tag === 'SLet') return `(let ${t.name} : ${showSTerm(t.type)} = ${showSTerm(t.value)} in ${showSTerm(t.body)})`;
  return impossible('showTerm');
};

export const toNameless = (t: STerm, k: number = 0, ns: List<[string, number]> = Nil): STerm => {
  if (t.tag === 'SVar') {
    const i = lookup(ns, t.name);
    return typeof i === 'number' ? Var(k - i - 1) : t;
  }
  if (t.tag === 'SAbs') return SAbs(t.name, toNameless(t.body, k + 1, Cons([t.name, k], ns)), t.type && toNameless(t.type, k, ns));
  if (t.tag === 'SFix') return SFix(t.name, toNameless(t.type, k, ns), toNameless(t.body, k + 1, Cons([t.name, k], ns)));
  if (t.tag === 'SPi') return SPi(t.name, toNameless(t.type, k, ns), toNameless(t.body, k + 1, Cons([t.name, k], ns)));
  if (t.tag === 'SApp') return SApp(toNameless(t.left, k, ns), toNameless(t.right, k, ns));
  if (t.tag === 'SAnn') return SAnn(toNameless(t.term, k, ns), toNameless(t.type, k, ns));
  if (t.tag === 'SLet')
    return SLet(t.name, toNameless(t.type, k, ns), toNameless(t.value, k, ns), toNameless(t.body, k + 1, Cons([t.name, k], ns)));
  return t;
};
