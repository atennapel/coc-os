import { Ix, Term, Abs, Var, App, Pi } from './terms';
import { List, Nil, Cons, index, foldr } from '../list';
import { impossible } from './util';

export type Head = Ix;
export type Clos = (val: Val) => Val;
export type Val
  = { tag: 'VNe', head: Head, args: List<[boolean, Val]> }
  | { tag: 'VAbs', type: Val, impl: boolean, body: Clos }
  | { tag: 'VPi', type: Val, impl: boolean, body: Clos }
  | { tag: 'Type' };

export type EnvV = List<Val>;

export const VNe = (head: Head, args: List<[boolean, Val]> = Nil): Val =>
  ({ tag: 'VNe', head, args });
export const VAbs = (type: Val, impl: boolean, body: Clos): Val =>
  ({ tag: 'VAbs', type, impl, body});
export const VPi = (type: Val, impl: boolean, body: Clos): Val =>
  ({ tag: 'VPi', type, impl, body});

export const VVar = (index: Ix): Val => VNe(index);

export const vapp = (a: Val, impl: boolean, b: Val): Val => {
  if (a.tag === 'VAbs') return a.body(b);
  if (a.tag === 'VNe') return VNe(a.head, Cons([impl, b], a.args));
  return impossible('vapp');
};

export const evaluate = (t: Term, vs: EnvV = Nil): Val => {
  if (t.tag === 'Type') return t;
  if (t.tag === 'Var')
    return index(vs, t.index) || impossible(`eval ${t.index}`)
  if (t.tag === 'App')
    return vapp(evaluate(t.left, vs), t.impl, evaluate(t.right, vs));
  if (t.tag === 'Abs')
    return VAbs(evaluate(t.type, vs), t.impl, v => evaluate(t.body, Cons(v, vs)));
  if (t.tag === 'Pi')
    return VPi(evaluate(t.type, vs), t.impl, v => evaluate(t.body, Cons(v, vs)));
  if (t.tag === 'Let')
    return evaluate(t.body, Cons(evaluate(t.val), vs));
  return t;
};

export const quote = (v: Val, k: number = 0): Term => {
  if (v.tag === 'Type') return v;
  if (v.tag === 'VNe')
    return foldr(
      ([impl, x], y) => App(y, impl, quote(x, k)),
      Var(k - (v.head + 1)),
      v.args,
    );
  if (v.tag === 'VAbs')
    return Abs(quote(v.type, k), v.impl, quote(v.body(VVar(k)), k + 1));
  if (v.tag === 'VPi')
    return Pi(quote(v.type, k), v.impl, quote(v.body(VVar(k)), k + 1));
  return v;
};

export const normalize = (t: Term, vs: EnvV = Nil, k: number = 0): Term =>
  quote(evaluate(t, vs), k);
