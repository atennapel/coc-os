import { Ix, Name } from '../names';
import { List, Cons, Nil, toString, index, foldr } from '../list';
import { Term, showTerm, Type, Var, App, Abs, Pi, Fix, Roll, Unroll, Global, Ind, IndFix } from './syntax';
import { impossible } from '../util';
import { globalGet } from './globalenv';
import { Lazy, mapLazy, forceLazy } from '../lazy';
import { Plicity, eqPlicity, PlicityR, PlicityE } from '../syntax';

export type Head = HVar | HGlobal;

export type HVar = { tag: 'HVar', index: Ix };
export const HVar = (index: Ix): HVar => ({ tag: 'HVar', index });
export type HGlobal = { tag: 'HGlobal', name: Name };
export const HGlobal = (name: Name): HGlobal => ({ tag: 'HGlobal', name });

export type Elim = EApp | EUnroll | EInd | EIndFix;

export type EApp = { tag: 'EApp', plicity: Plicity, arg: Val };
export const EApp = (plicity: Plicity, arg: Val): EApp => ({ tag: 'EApp', plicity, arg });
export type EUnroll = { tag: 'EUnroll' };
export const EUnroll: EUnroll = { tag: 'EUnroll' };
export type EInd = { tag: 'EInd', type: Val };
export const EInd = (type: Val): EInd => ({ tag: 'EInd', type });
export type EIndFix = { tag: 'EIndFix', type: Val };
export const EIndFix = (type: Val): EIndFix => ({ tag: 'EIndFix', type });

export type Clos = (val: Val) => Val;
export type Val = VNe | VGlued | VAbs | VRoll | VPi | VFix | VType;

export type VNe = { tag: 'VNe', head: Head, args: List<Elim> };
export const VNe = (head: Head, args: List<Elim>): VNe => ({ tag: 'VNe', head, args });
export type VGlued = { tag: 'VGlued', head: Head, args: List<Elim>, val: Lazy<Val> };
export const VGlued = (head: Head, args: List<Elim>, val: Lazy<Val>): VGlued => ({ tag: 'VGlued', head, args, val });
export type VAbs = { tag: 'VAbs', plicity: Plicity, type: Val, body: Clos };
export const VAbs = (plicity: Plicity, type: Val, body: Clos): VAbs => ({ tag: 'VAbs', plicity, type, body});
export type VRoll = { tag: 'VRoll', type: Val, term: Val };
export const VRoll = (type: Val, term: Val): VRoll => ({ tag: 'VRoll', type, term });
export type VPi = { tag: 'VPi', plicity: Plicity, type: Val, body: Clos };
export const VPi = (plicity: Plicity, type: Val, body: Clos): VPi => ({ tag: 'VPi', plicity, type, body});
export type VFix = { tag: 'VFix', type: Val, body: Clos };
export const VFix = (type: Val, body: Clos): VFix => ({ tag: 'VFix', type, body});
export type VType = { tag: 'VType' };
export const VType: VType = { tag: 'VType' };

export const VVar = (index: Ix): VNe => VNe(HVar(index), Nil);
export const VGlobal = (name: Name): VNe => VNe(HGlobal(name), Nil);

export type EnvV = List<Val>;
export const extendV = (vs: EnvV, val: Val): EnvV => Cons(val, vs);
export const showEnvV = (l: EnvV, k: Ix = 0, full: boolean = false): string => toString(l, v => showTerm(quote(v, k, full)));

export const force = (v: Val): Val => {
  if (v.tag === 'VGlued') return force(forceLazy(v.val));
  return v;
};

export const vapp = (a: Val, plicity: Plicity, b: Val): Val => {
  if (a.tag === 'VAbs' && eqPlicity(a.plicity, plicity)) return a.body(b);
  if (a.tag === 'VNe') return VNe(a.head, Cons(EApp(plicity, b), a.args));
  if (a.tag === 'VGlued')
    return VGlued(a.head, Cons(EApp(plicity, b), a.args), mapLazy(a.val, v => vapp(v, plicity, b)));
  return impossible(`core vapp: ${a.tag}`);
};
export const vunroll = (v: Val): Val => {
  if (v.tag === 'VRoll') return v.term;
  if (v.tag === 'VNe') return VNe(v.head, Cons(EUnroll, v.args));
  if (v.tag === 'VGlued')
    return VGlued(v.head, Cons(EUnroll, v.args), mapLazy(v.val, v => vunroll(v)));
  return impossible(`vunroll: ${v.tag}`);
};
export const vinduction = (ty: Val, v: Val): Val => {
  if (v.tag === 'VAbs' && v.plicity.erased)
    return VAbs(PlicityE, VPi(PlicityR, ty, _ => VType), P => vapp(v, PlicityE, vapp(P, PlicityR, v)));
  if (v.tag === 'VNe') return VNe(v.head, Cons(EInd(ty), v.args));
  if (v.tag === 'VGlued')
    return VGlued(v.head, Cons(EInd(ty), v.args), mapLazy(v.val, v => vinduction(ty, v)));
  return impossible(`vinduction: ${v.tag}`);
};
export const vinductionfix = (ty: Val, v: Val): Val => {
  // {f : * -> *} -> (x : Fix f) ->
  //  (map : {a b : *} -> (a -> b) -> f a -> f b) -> {P : Fix f} ->
  //  (((h : Fix f) -> P h) -> (y : f (Fix f)) -> P y) -> P x
  // inductionFix {f} (roll {fix (r : *). f r} t) ~>
  //  {P : Fix f} (rec : ((h : Fix f) -> P h) -> (y : f (Fix f)) -> P (roll {Fix f} y)).
  //    rec (\y. inductionFix {f} y {P} rec) (unroll x)
  if (v.tag === 'VRoll') {
    const fixF = VFix(VType, r => vapp(ty, PlicityR, r));
    return VAbs(PlicityE, VPi(PlicityR, fixF, _ => VType), P =>
      VAbs(PlicityR, VPi(PlicityR, VPi(PlicityR, fixF, h => vapp(P, PlicityR, h)), _ => VPi(PlicityR, vapp(ty, PlicityR, fixF), y => vapp(P, PlicityR, VRoll(fixF, y)))), rec =>
      vapp(vapp(rec, PlicityR, VAbs(PlicityR, fixF, y => vapp(vapp(vinductionfix(ty, y), PlicityE, P), PlicityR, rec))), PlicityR, vunroll(v))));
  }
  if (v.tag === 'VNe') return VNe(v.head, Cons(EIndFix(ty), v.args));
  if (v.tag === 'VGlued')
    return VGlued(v.head, Cons(EIndFix(ty), v.args), mapLazy(v.val, v => vinductionfix(ty, v)));
  return impossible(`vinductionfix: ${v.tag}`);
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
    return vapp(evaluate(t.left, vs), t.plicity, evaluate(t.right, vs));
  if (t.tag === 'Abs')
    return VAbs(t.plicity, evaluate(t.type, vs), v => evaluate(t.body, extendV(vs, v)));
  if (t.tag === 'Let')
    return evaluate(t.body, extendV(vs, evaluate(t.val, vs)));
  if (t.tag === 'Roll')
    return VRoll(evaluate(t.type, vs), evaluate(t.term, vs));
  if (t.tag === 'Unroll')
    return vunroll(evaluate(t.term, vs));
  if (t.tag === 'Pi')
    return VPi(t.plicity, evaluate(t.type, vs), v => evaluate(t.body, extendV(vs, v)));
  if (t.tag === 'Fix')
    return VFix(evaluate(t.type, vs), v => evaluate(t.body, extendV(vs, v)));
  if (t.tag === 'Ind')
    return vinduction(evaluate(t.type, vs), evaluate(t.term, vs));
  if (t.tag === 'IndFix')
    return vinductionfix(evaluate(t.type, vs), evaluate(t.term, vs));
  return t;
};

const quoteHead = (h: Head, k: Ix): Term => {
  if (h.tag === 'HVar') return Var(k - (h.index + 1));
  if (h.tag === 'HGlobal') return Global(h.name);
  return h;
};
const quoteElim = (t: Term, e: Elim, k: Ix, full: boolean): Term => {
  if (e.tag === 'EApp') return App(t, e.plicity, quote(e.arg, k, full));
  if (e.tag === 'EUnroll') return Unroll(t);
  if (e.tag === 'EInd') return Ind(quote(e.type, k, full), t);
  if (e.tag === 'EIndFix') return IndFix(quote(e.type, k, full), t);
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
    return Abs(v.plicity, quote(v.type, k, full), quote(v.body(VVar(k)), k + 1, full));
  if (v.tag === 'VPi')
    return Pi(v.plicity, quote(v.type, k, full), quote(v.body(VVar(k)), k + 1, full));
  if (v.tag === 'VFix')
    return Fix(quote(v.type, k, full), quote(v.body(VVar(k)), k + 1, full));
  if (v.tag === 'VRoll')
    return Roll(quote(v.type, k, full), quote(v.term, k, full));
  return v;
};

export const normalize = (t: Term, vs: EnvV, k: Ix, full: boolean): Term =>
  quote(evaluate(t, vs), k, full);

export const showTermQ = (v: Val, k: number = 0, full: boolean = false): string => showTerm(quote(v, k, full));
