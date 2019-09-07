import { Clos, Domain, Env, DAbs, DPi, DApp } from './domain';
import { Cons, Nil, index } from './list';
import { Term, Var, Abs, App, Pi } from './terms';
import { impossible } from './util';

export const closappd = (c: Clos, d: Domain): Domain =>
  evaluate(c.body, Cons(d, c.env));
export const closapp = (e: Env, c: Clos, t: Term): Domain =>
  closappd(c, evaluate(t, e));

export const evaluate = (t: Term, env: Env = Nil): Domain => {
  if (t.tag === 'Var')
    return index(env, t.index) || impossible(`out of range var ${t.index} in evaluate`);
  if (t.tag === 'Abs')
    return DAbs(evaluate(t.type, env), Clos(t.body, env));
  if (t.tag === 'Pi')
    return DPi(evaluate(t.type, env), Clos(t.body, env));
  if (t.tag === 'App') {
    const l = evaluate(t.left, env);
    return l.tag === 'DAbs' ?
      closapp(env, l.clos, t.right) :
      DApp(l, evaluate(t.right, env));
  }
  return t;
};

export const quote = (d: Domain, k: number = 0): Term => {
  if (d.tag === 'Var') return Var(k - (d.index + 1));
  if (d.tag === 'DAbs')
    return Abs(quote(d.type, k), quote(closappd(d.clos, Var(k)), k + 1));
  if (d.tag === 'DPi')
    return Pi(quote(d.type, k), quote(closappd(d.clos, Var(k)), k + 1));
  if (d.tag === 'DApp')
    return App(quote(d.left, k), quote(d.right, k));
  return d;
};

export const nf = (t: Term, e: Env = Nil, k: number = 0): Term =>
  quote(evaluate(t, e), k);
