import { List, Nil, Cons, index, foldr } from '../list';
import { impossible } from '../util';
import { Ix } from '../core/terms';
import { Erased, EApp, EVar, EAbs, EType } from './terms';

export type Head = Ix;
export type Clos = (val: Val) => Val;
export type Val
  = { tag: 'VNe', head: Head, args: List<Val> }
  | { tag: 'VAbs', body: Clos }
  | { tag: 'Type' };

export type EnvV = List<Val>;

export const VType = EType as Val;
export const VNe = (head: Head, args: List<Val> = Nil): Val =>
  ({ tag: 'VNe', head, args });
export const VAbs = (body: Clos): Val =>
  ({ tag: 'VAbs', body});

export const VVar = (index: Ix): Val => VNe(index);

export const vapp = (a: Val, b: Val): Val => {
  if (a.tag === 'VAbs') return a.body(b);
  if (a.tag === 'VNe') return VNe(a.head, Cons(b, a.args));
  return impossible('vapp');
};

export const evaluate = (t: Erased, vs: EnvV = Nil): Val => {
  if (t.tag === 'Type') return t;
  if (t.tag === 'Var')
    return index(vs, t.index) || impossible(`evaluate ${t.index}`)
  if (t.tag === 'EApp')
    return vapp(evaluate(t.left, vs), evaluate(t.right, vs));
  if (t.tag === 'EAbs')
    return VAbs(v => evaluate(t.body, Cons(v, vs)));
  if (t.tag === 'ELet')
    return evaluate(t.body, Cons(evaluate(t.val), vs));
  return t;
};

export const quote = (v: Val, k: number = 0): Erased => {
  if (v.tag === 'Type') return v;
  if (v.tag === 'VNe')
    return foldr(
      (x, y) => EApp(y, quote(x, k)),
      EVar(k - (v.head + 1)),
      v.args,
    );
  if (v.tag === 'VAbs')
    return EAbs(quote(v.body(VVar(k)), k + 1));
  return v;
};

export const normalize = (t: Erased, vs: EnvV = Nil, k: number = 0): Erased =>
  quote(evaluate(t, vs), k);
