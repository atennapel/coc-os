import { Clos, Domain, Env, DAbs, DPi, DNeutral, DVar, DFix } from './domain';
import { Cons, Nil, index, foldr, map } from './list';
import { Term, Var, Abs, App, Pi, Fix } from './terms';
import { impossible } from './util';
import { constenv } from './typecheck';

export const capp = (c: Clos, d: Domain): Domain =>
  evaluate(c.body, Cons(d, c.env));

export const dapp = (a: Domain, b: Domain): Domain => {
  if (a.tag === 'DAbs') return capp(a.clos, b);
  if (a.tag === 'DFix') return dapp(capp(a.clos, a), b);
  if (a.tag === 'DNeutral') return DNeutral(a.head, Cons(b, a.args));
  return impossible('vapp');
};

export const force = (v: Domain): Domain => {
  if (v.tag === 'DNeutral' && v.head.tag === 'Meta' && v.head.term)
    return force(foldr((x, y) => dapp(y, x), v.head.term, v.args));
  return v;
};

export const evaluate = (t: Term, env: Env = Nil): Domain => {
  if (t.tag === 'Var')
    return index(env, t.index) || impossible(`out of range var ${t.index} in evaluate`);
  if (t.tag === 'Const') {
    const v = constenv[t.name];
    return v && v[1] ? v[1] : DNeutral(t);
  }
  if (t.tag === 'Abs')
    return DAbs(evaluate(t.type, env), Clos(t.body, env));
  if (t.tag === 'Pi')
    return DPi(evaluate(t.type, env), Clos(t.body, env));
  if (t.tag === 'Fix')
    return DFix(evaluate(t.type, env), Clos(t.body, env));
  if (t.tag === 'App')
    return dapp(evaluate(t.left, env), evaluate(t.right, env));
  if (t.tag === 'Let')
    return evaluate(t.body, Cons(evaluate(t.value, env), env));
  if (t.tag === 'Meta') return t.term || DNeutral(t);
  return t;
};

export const quote = (d: Domain, k: number = 0): Term => {
  if (d.tag === 'DAbs')
    return Abs(quote(d.type, k), quote(capp(d.clos, DVar(k)), k + 1));
  if (d.tag === 'DPi')
    return Pi(quote(d.type, k), quote(capp(d.clos, DVar(k)), k + 1));
  if (d.tag === 'DFix')
    return Fix(quote(d.type, k), quote(capp(d.clos, DVar(k)), k + 1));
  if (d.tag === 'DNeutral')
    return foldr(
      (x, y) => App(y, x),
      (d.head.tag === 'Const' || d.head.tag === 'Meta' ? d.head :
        Var(k - (d.head.index + 1))) as Term,
      map(d.args, x => quote(x, k))
    );
  return d;
};

export const nf = (t: Term, e: Env = Nil, k: number = 0): Term =>
  quote(evaluate(t, e), k);
