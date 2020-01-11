import { Name, Ix } from '../names';
import { List, Cons, toString, Nil, foldr, index } from '../list';
import { Lazy, mapLazy, forceLazy } from '../lazy';
import { showTerm, Pi, Abs, Term, Type, App, Var, Global } from '../rewrite/syntax';
import { impossible } from '../util';
import { getEnv } from './env';

export type Head
  = { tag: 'HVar', index: Ix }
  | { tag: 'HGlobal', name: Name };
export type Clos = (val: Val) => Val;
export type Val
  = { tag: 'VNe', head: Head, args: List<Val> }
  | { tag: 'VGlued', head: Head, args: List<Val>, val: Lazy<Val> }
  | { tag: 'VAbs', name: Name, type: Val, body: Clos }
  | { tag: 'VPi', name: Name, type: Val, body: Clos }
  | { tag: 'VType' };

export type EnvV = List<Val>;
export const extendV = (vs: EnvV, val: Val): EnvV => Cons(val, vs);
export const showEnvV = (l: EnvV, k: Ix = 0, full: boolean = false): string =>
  toString(l, v => showTerm(quote(v, k, full)));

export const HVar = (index: Ix): Head => ({ tag: 'HVar', index });
export const HGlobal = (name: Name): Head => ({ tag: 'HGlobal', name });

export const VNe = (head: Head, args: List<Val> = Nil): Val =>
  ({ tag: 'VNe', head, args });
export const VGlued = (head: Head, args: List<Val>, val: Lazy<Val>): Val =>
  ({ tag: 'VGlued', head, args, val });
export const VAbs = (name: Name, type: Val, body: Clos): Val =>
  ({ tag: 'VAbs', name, type, body});
export const VPi = (name: Name, type: Val, body: Clos): Val =>
  ({ tag: 'VPi', name, type, body});
export const VType: Val = { tag: 'VType' };

export const VVar = (index: Ix): Val => VNe(HVar(index));
export const VGlobal = (name: Name): Val => VNe(HGlobal(name));

export const vapp = (a: Val, b: Val): Val => {
  if (a.tag === 'VAbs') return a.body(b);
  if (a.tag === 'VNe') return VNe(a.head, Cons(b, a.args));
  if (a.tag === 'VGlued')
    return VGlued(a.head, Cons(b, a.args), mapLazy(a.val, v => vapp(v, b)));
  return impossible('vapp');
};

export const evaluate = (t: Term, vs: EnvV = Nil): Val => {
  if (t.tag === 'Type') return VType;
  if (t.tag === 'Var') {
    const v = index(vs, t.index) || impossible(`evaluate ${t.index}`);
    return VGlued(HVar(t.index), Nil, Lazy(() => v));
  }
  if (t.tag === 'Global') {
    const v = getEnv(t.name) || impossible(`evaluate ${t.name}`);
    const val = v.val;
    return VGlued(HGlobal(t.name), Nil, Lazy(() => val));
  }
  if (t.tag === 'App')
    return vapp(evaluate(t.left, vs), evaluate(t.right, vs));
  if (t.tag === 'Abs')
    return VAbs(t.name, evaluate(t.type, vs), v => evaluate(t.body, extendV(vs, v)));
  if (t.tag === 'Pi')
    return VPi(t.name, evaluate(t.type, vs), v => evaluate(t.body, extendV(vs, v)));
  if (t.tag === 'Let')
    return evaluate(t.body, extendV(vs, evaluate(t.val)));
  if (t.tag === 'Ann')
    return evaluate(t.term);
  return t;
};

export const quote = (v: Val, k: Ix = 0, full: boolean = false): Term => {
  if (v.tag === 'VType') return Type;
  if (v.tag === 'VNe')
    return foldr(
      (x, y) => App(y, quote(x, k, full)),
      v.head.tag === 'HVar' ? Var(k - (v.head.index + 1)) : Global(v.head.name),
      v.args,
    );
  if (v.tag === 'VGlued')
    return full ? quote(forceLazy(v.val), k, full) : foldr(
      (x, y) => App(y, quote(x, k, full)),
      v.head.tag === 'HVar' ? Var(k - (v.head.index + 1)) : Global(v.head.name),
      v.args,
    );
  if (v.tag === 'VAbs')
    return Abs(v.name, quote(v.type, k, full), quote(v.body(VVar(k)), k + 1, full));
  if (v.tag === 'VPi')
    return Pi(v.name, quote(v.type, k, full), quote(v.body(VVar(k)), k + 1, full));
  return v;
};

export const normalize = (t: Term, vs: EnvV = Nil, k: Ix = 0, full: boolean = false): Term =>
  quote(evaluate(t, vs), k, full);
