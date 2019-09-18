import { Val, VNe, VVar, VAbs, VPi } from './values';
import { impossible } from '../util';
import { Cons, Nil, foldr } from '../list';
import { EnvV, fresh, DefV, BoundV, lookupV, HashEnv } from './env';
import { Term, Abs, Pi, App, Type } from './terms';

export const vapp = (a: Val, b: Val): Val => {
  if (a.tag === 'VAbs') return a.body(b);
  if (a.tag === 'VNe') return VNe(a.head, Cons(b, a.args));
  return impossible('vapp');
};

export const force = (v: Val): Val => {
  if (v.tag === 'VNe' && v.head.tag === 'Meta' && v.head.term)
    return force(foldr((x, y) => vapp(y, x), v.head.term, v.args));
  return v;
};

export const evaluate = (t: Term, henv: HashEnv, vs: EnvV = Nil, ignoreOpaque: boolean = false): Val => {
  if (t.tag === 'Type') return t;
  if (t.tag === 'Var') {
    const v = lookupV(vs, t.name);
    return v ? (v.tag === 'DefV' ? v.value : VNe(t)) :
      impossible('evaluate var');
  }
  if (t.tag === 'App')
    return vapp(evaluate(t.left, henv, vs, ignoreOpaque), evaluate(t.right, henv, vs, ignoreOpaque));
  if (t.tag === 'Abs')
  // TODO: fix when meta solving considers types
    return VAbs(t.name, t.type ? evaluate(t.type, henv, vs, ignoreOpaque) : Type,
      v => evaluate(t.body, henv, Cons(DefV(t.name, v), vs), ignoreOpaque));
  if (t.tag === 'Pi')
    return VPi(t.name, evaluate(t.type, henv, vs, ignoreOpaque),
      v => evaluate(t.body, henv, Cons(DefV(t.name, v), vs), ignoreOpaque));
  if (t.tag === 'Let')
    return evaluate(t.body, henv, Cons(DefV(t.name, evaluate(t.value, henv, vs, ignoreOpaque)), vs), ignoreOpaque);
  if (t.tag === 'Meta') return t.term || VNe(t);
  if (t.tag === 'Hash') {
    const r = henv[t.hash];
    if (!r) return VNe(t);
    return !ignoreOpaque && r.opaque ? VNe(t) : r.value;
  }
  return impossible('evaluate');
};

export const quote = (v_: Val, vs: EnvV = Nil): Term => {
  const v = force(v_);
  if (v.tag === 'Type') return v;
  if (v.tag === 'VNe')
    return foldr((v, a) => App(a, quote(v, vs)), v.head as Term, v.args);
  if (v.tag === 'VAbs') {
    const x = fresh(vs, v.name);
    return Abs(x, quote(v.body(VVar(x)), Cons(BoundV(x), vs)), quote(v.type, vs));
  }
  if (v.tag === 'VPi') {
    const x = fresh(vs, v.name);
    return Pi(x, quote(v.type, vs), quote(v.body(VVar(x)), Cons(BoundV(x), vs)));
  }
  return impossible('quote');
};

export const normalize = (t: Term, henv: HashEnv, ignoreOpaque: boolean = false, vs: EnvV = Nil): Term =>
  quote(evaluate(t, henv, vs, ignoreOpaque), vs);
