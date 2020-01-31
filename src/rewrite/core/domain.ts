import { Ix, Name } from '../../names';
import { List, Cons, Nil, toString, index, foldr } from '../../list';
import { Term, showTerm, Type, Var, App, Abs, Pi, Fix, Roll, Unroll, Meta, eqMeta, Global } from './syntax';
import { impossible } from '../../util';
import { globalGet } from './globalenv';
import { Lazy, mapLazy, forceLazy } from '../../lazy';

export type Head = HVar | HGlobal;

export type HVar = { tag: 'HVar', index: Ix };
export const HVar = (index: Ix): HVar => ({ tag: 'HVar', index });
export type HGlobal = { tag: 'HGlobal', name: Name };
export const HGlobal = (name: Name): HGlobal => ({ tag: 'HGlobal', name });

export type Elim = EApp | EUnroll

export type EApp = { tag: 'EApp', meta: Meta, arg: Val };
export const EApp = (meta: Meta, arg: Val): EApp => ({ tag: 'EApp', meta, arg });
export type EUnroll = { tag: 'EUnroll' };
export const EUnroll: EUnroll = { tag: 'EUnroll' };

export type Clos = (val: Val) => Val;
export type Val = VNe | VGlued | VAbs | VRoll | VPi | VFix | VType;

export type VNe = { tag: 'VNe', head: Head, args: List<Elim> };
export const VNe = (head: Head, args: List<Elim>): VNe => ({ tag: 'VNe', head, args });
export type VGlued = { tag: 'VGlued', head: Head, args: List<Elim>, val: Lazy<Val> };
export const VGlued = (head: Head, args: List<Elim>, val: Lazy<Val>): VGlued => ({ tag: 'VGlued', head, args, val });
export type VAbs = { tag: 'VAbs', meta: Meta, type: Val, body: Clos };
export const VAbs = (meta: Meta, type: Val, body: Clos): VAbs => ({ tag: 'VAbs', meta, type, body});
export type VRoll = { tag: 'VRoll', type: Val, term: Val };
export const VRoll = (type: Val, term: Val): VRoll => ({ tag: 'VRoll', type, term });
export type VPi = { tag: 'VPi', meta: Meta, type: Val, body: Clos };
export const VPi = (meta: Meta, type: Val, body: Clos): VPi => ({ tag: 'VPi', meta, type, body});
export type VFix = { tag: 'VFix', type: Val, body: Clos };
export const VFix = (type: Val, body: Clos): VFix => ({ tag: 'VFix', type, body});
export type VType = { tag: 'VType' };
export const VType: VType = { tag: 'VType' };

export const VVar = (index: Ix): VNe => VNe(HVar(index), Nil);
export const VGlobal = (name: Name): VNe => VNe(HGlobal(name), Nil);

export type EnvV = List<Val>;
export const extendV = (vs: EnvV, val: Val): EnvV => Cons(val, vs);
export const showEnvV = (l: EnvV, k: Ix = 0, full: boolean = false): string => toString(l, v => showTerm(quote(v, k, full)));

export const vapp = (a: Val, meta: Meta, b: Val): Val => {
  if (a.tag === 'VAbs' && eqMeta(a.meta, meta)) return a.body(b);
  if (a.tag === 'VNe') return VNe(a.head, Cons(EApp(meta, b), a.args));
  if (a.tag === 'VGlued')
    return VGlued(a.head, Cons(EApp(meta, b), a.args), mapLazy(a.val, v => vapp(v, meta, b)));
  return impossible(`vapp: ${a.tag}`);
};
export const vunroll = (v: Val): Val => {
  if (v.tag === 'VRoll') return v.term;
  if (v.tag === 'VNe') return VNe(v.head, Cons(EUnroll, v.args));
  if (v.tag === 'VGlued')
    return VGlued(v.head, Cons(EUnroll, v.args), mapLazy(v.val, v => vunroll(v)));
  return impossible(`vunroll: ${v.tag}`);
};
export const evaluate = (t: Term, vs: EnvV =Nil): Val => {
  if (t.tag === 'Type') return VType;
  if (t.tag === 'Var')
    return index(vs, t.index) || impossible(`evaluate: var ${t.index} has no value`);
  if (t.tag === 'Global') {
    const entry = globalGet(t.name) || impossible(`evaluate: global ${t.name} has no value`);
    return VGlued(HGlobal(t.name), Nil, Lazy(() => entry.val));
  }
  if (t.tag === 'App')
    return vapp(evaluate(t.left, vs), t.meta, evaluate(t.right, vs));
  if (t.tag === 'Abs')
    return VAbs(t.meta, evaluate(t.type, vs), v => evaluate(t.body, extendV(vs, v)));
  if (t.tag === 'Let')
    return evaluate(t.body, extendV(vs, evaluate(t.val, vs)));
  if (t.tag === 'Roll')
    return VRoll(evaluate(t.type, vs), evaluate(t.term, vs));
  if (t.tag === 'Unroll')
    return vunroll(evaluate(t.term, vs));
  if (t.tag === 'Pi')
    return VPi(t.meta, evaluate(t.type, vs), v => evaluate(t.body, extendV(vs, v)));
  if (t.tag === 'Fix')
    return VFix(evaluate(t.type, vs), v => evaluate(t.body, extendV(vs, v)));
  return t;
};

const quoteHead = (h: Head, k: Ix): Term => {
  if (h.tag === 'HVar') return Var(k - (h.index + 1));
  if (h.tag === 'HGlobal') return Global(h.name);
  return h;
};
const quoteElim = (t: Term, e: Elim, k: Ix, full: boolean): Term => {
  if (e.tag === 'EApp') return App(t, e.meta, quote(e.arg, k, full));
  if (e.tag === 'EUnroll') return Unroll(t);
  return e;
};
export const quote = (v: Val, k: Ix, full: boolean): Term => {
  if (v.tag === 'VType') return Type;
  if (v.tag === 'VNe')
    return foldr(
      (x, y) => quoteElim(y, x, k, full),
      quoteHead(v.head, k),
      v.args,
    );
  if (v.tag === 'VGlued')
    return full ? quote(forceLazy(v.val), k, full) : foldr(
      (x, y) => quoteElim(y, x, k, full),
      quoteHead(v.head, k),
      v.args,
    );
  if (v.tag === 'VAbs')
    return Abs(v.meta, quote(v.type, k, full), quote(v.body(VVar(k)), k + 1, full));
  if (v.tag === 'VPi')
    return Pi(v.meta, quote(v.type, k, full), quote(v.body(VVar(k)), k + 1, full));
  if (v.tag === 'VFix')
    return Fix(quote(v.type, k, full), quote(v.body(VVar(k)), k + 1, full));
  if (v.tag === 'VRoll')
    return Roll(quote(v.type, k, full), quote(v.term, k, full));
  return v;
};

export const normalize = (t: Term, vs: EnvV, k: Ix, full: boolean): Term =>
  quote(evaluate(t, vs), k, full);