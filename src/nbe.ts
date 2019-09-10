import { Clos, Domain, Env, DAbs, DPi, DNeutral, DVar } from './domain';
import { Cons, Nil, index, foldr, map } from './list';
import { Term, Var, Abs, App, Pi } from './terms';
import { impossible } from './util';

export const capp = (c: Clos, d: Domain): Domain =>
  evaluate(c.body, Cons(d, c.env));

export const dapp = (a: Domain, b: Domain): Domain => {
  if (a.tag === 'DAbs') return capp(a.clos, b);
  if (a.tag === 'DNeutral') return DNeutral(a.head, Cons(b, a.args));
  return impossible('vapp');
};

export const evaluate = (t: Term, env: Env = Nil): Domain => {
  if (t.tag === 'Var')
    return index(env, t.index) || impossible(`out of range var ${t.index} in evaluate`);
  if (t.tag === 'Abs')
    return DAbs(evaluate(t.type, env), Clos(t.body, env));
  if (t.tag === 'Pi')
    return DPi(evaluate(t.type, env), Clos(t.body, env));
  if (t.tag === 'App')
    return dapp(evaluate(t.left, env), evaluate(t.right, env));
  return t;
};

export const quote = (d: Domain, k: number = 0): Term => {
  if (d.tag === 'DAbs')
    return Abs(quote(d.type, k), quote(capp(d.clos, DVar(k)), k + 1));
  if (d.tag === 'DPi')
    return Pi(quote(d.type, k), quote(capp(d.clos, DVar(k)), k + 1));
  if (d.tag === 'DNeutral')
    return foldr(
      (x, y) => App(y, x),
      Var(k - (d.head.index + 1)) as Term,
      map(d.args, x => quote(x, k))
    );
  return d;
};

export const nf = (t: Term, e: Env = Nil, k: number = 0): Term =>
  quote(evaluate(t, e), k);
