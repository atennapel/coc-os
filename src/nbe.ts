import { Val, VNe, VVar, VAbs, VPi } from './values';
import { impossible } from './util';
import { Cons, Nil, foldr } from './list';
import { EnvV, fresh, DefV, BoundV, lookupV } from './env';
import { Term, Abs, Pi, App, Var } from './terms';

export const vapp = (a: Val, b: Val): Val => {
  if (a.tag === 'VAbs') return a.body(b);
  if (a.tag === 'VNe') return VNe(a.head, Cons(b, a.args));
  return impossible('vapp');
};

export const evaluate = (t: Term, vs: EnvV = Nil): Val => {
  if (t.tag === 'Type') return t;
  if (t.tag === 'Var') {
    const v = lookupV(vs, t.name);
    return v ? (v.tag === 'DefV' ? v.value : VVar(t.name)) :
      impossible('evaluate var');
  }
  if (t.tag === 'App')
    return vapp(evaluate(t.left, vs), evaluate(t.right, vs));
  if (t.tag === 'Abs' && t.type)
    return VAbs(t.name, evaluate(t.type, vs),
      v => evaluate(t.body, Cons(DefV(t.name, v), vs)));
  if (t.tag === 'Pi')
    return VPi(t.name, evaluate(t.type, vs),
      v => evaluate(t.body, Cons(DefV(t.name, v), vs)));
  if (t.tag === 'Let')
    return evaluate(t.body, Cons(DefV(t.name, evaluate(t.value ,vs)), vs));
  return impossible('evaluate');
};

export const quote = (v: Val, vs: EnvV = Nil): Term => {
  if (v.tag === 'Type') return v;
  if (v.tag === 'VNe')
    return foldr((v, a) => App(a, quote(v, vs)), Var(v.head) as Term, v.args);
  if (v.tag === 'VAbs') {
    const x = fresh(vs, v.name);
    return Abs(x, quote(v.type, vs), quote(v.body(VVar(x)), Cons(BoundV(x), vs)));
  }
  if (v.tag === 'VPi') {
    const x = fresh(vs, v.name);
    return Pi(x, quote(v.type, vs), quote(v.body(VVar(x)), Cons(BoundV(x), vs)));
  }
  return impossible('quote');
};

export const normalize = (t: Term, vs: EnvV = Nil): Term =>
  quote(evaluate(t, vs), vs);
