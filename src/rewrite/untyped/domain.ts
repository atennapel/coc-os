import { Ix } from '../../names';
import { List, Cons, Nil, toString, index, foldr } from '../../list';
import { Term, showTerm, Var, App, Abs, shift } from './syntax';
import { impossible } from '../../util';

export type Head = HVar;

export type HVar = { tag: 'HVar', index: Ix };
export const HVar = (index: Ix): HVar => ({ tag: 'HVar', index });

export type Clos = (val: Val) => Val;
export type Val = VNe | VAbs;

export type VNe = { tag: 'VNe', head: Head, args: List<Val> };
export const VNe = (head: Head, args: List<Val>): VNe => ({ tag: 'VNe', head, args });
export type VAbs = { tag: 'VAbs', body: Clos };
export const VAbs = (body: Clos): VAbs => ({ tag: 'VAbs', body});

export const VVar = (index: Ix): VNe => VNe(HVar(index), Nil);

export type EnvV = List<Val>;
export const extendV = (vs: EnvV, val: Val): EnvV => Cons(val, vs);
export const showEnvV = (l: EnvV, k: Ix = 0): string => toString(l, v => showTerm(quote(v, k)));

export const vapp = (a: Val, b: Val): Val => {
  if (a.tag === 'VAbs') return a.body(b);
  if (a.tag === 'VNe') return VNe(a.head, Cons(b, a.args));
  return a;
};

export const evaluate = (t: Term, vs: EnvV): Val => {
  if (t.tag === 'Var')
    return index(vs, t.index) || impossible(`evaluate ${t.index}`);
  if (t.tag === 'App')
    return vapp(evaluate(t.left, vs), evaluate(t.right, vs));
  if (t.tag === 'Abs')
    return VAbs(v => evaluate(t.body, extendV(vs, v)));
  return t;
};

export const quote = (v: Val, k: Ix): Term => {
  if (v.tag === 'VNe')
    return foldr(
      (x, y) => App(y, quote(x, k)),
      Var(k - (v.head.index + 1)) as Term,
      v.args,
    );
  if (v.tag === 'VAbs') {
    const body = quote(v.body(VVar(k)), k + 1);
    return body.tag === 'App' && body.right.tag === 'Var' && body.right.index === 0 ? shift(-1, 0, body.left) : Abs(body);
  }
  return v;
};

export const normalize = (t: Term, vs: EnvV, k: Ix): Term =>
  quote(evaluate(t, vs), k);