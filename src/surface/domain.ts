import { Ix, Name } from '../names';
import { List, Cons, Nil, toString, index, foldr } from '../list';
import { Term, showTerm, Type, Var, App, Abs, Pi, Fix, Roll, Unroll, Global, fromSurface, Meta, Let, Ann } from './syntax';
import { impossible } from '../util';
import { globalGet } from './globalenv';
import { Lazy, mapLazy, forceLazy } from '../lazy';
import { Plicity, eqPlicity } from '../syntax';
import { showTerm as showTermS } from '../syntax';
import { metaGet } from './metas';

export type Head = HVar | HGlobal | HMeta;

export type HVar = { tag: 'HVar', index: Ix };
export const HVar = (index: Ix): HVar => ({ tag: 'HVar', index });
export type HGlobal = { tag: 'HGlobal', name: Name };
export const HGlobal = (name: Name): HGlobal => ({ tag: 'HGlobal', name });
export type HMeta = { tag: 'HMeta', index: Ix };
export const HMeta = (index: Ix): HMeta => ({ tag: 'HMeta', index });

export type Elim = EApp | EUnroll

export type EApp = { tag: 'EApp', plicity: Plicity, arg: Val };
export const EApp = (plicity: Plicity, arg: Val): EApp => ({ tag: 'EApp', plicity, arg });
export type EUnroll = { tag: 'EUnroll' };
export const EUnroll: EUnroll = { tag: 'EUnroll' };

export type Clos = (val: Val) => Val;
export type Val = VNe | VGlued | VAbs | VRoll | VPi | VFix | VType;

export type VNe = { tag: 'VNe', head: Head, args: List<Elim> };
export const VNe = (head: Head, args: List<Elim>): VNe => ({ tag: 'VNe', head, args });
export type VGlued = { tag: 'VGlued', head: Head, args: List<Elim>, val: Lazy<Val> };
export const VGlued = (head: Head, args: List<Elim>, val: Lazy<Val>): VGlued => ({ tag: 'VGlued', head, args, val });
export type VAbs = { tag: 'VAbs', plicity: Plicity, name: Name, type: Val, body: Clos };
export const VAbs = (plicity: Plicity, name: Name, type: Val, body: Clos): VAbs => ({ tag: 'VAbs', name, plicity, type, body});
export type VRoll = { tag: 'VRoll', type: Val, term: Val };
export const VRoll = (type: Val, term: Val): VRoll => ({ tag: 'VRoll', type, term });
export type VPi = { tag: 'VPi', plicity: Plicity, name: Name, type: Val, body: Clos };
export const VPi = (plicity: Plicity, name: Name, type: Val, body: Clos): VPi => ({ tag: 'VPi', name, plicity, type, body});
export type VFix = { tag: 'VFix', name: Name, type: Val, body: Clos };
export const VFix = (name: Name, type: Val, body: Clos): VFix => ({ tag: 'VFix', name, type, body});
export type VType = { tag: 'VType' };
export const VType: VType = { tag: 'VType' };

export const VVar = (index: Ix): VNe => VNe(HVar(index), Nil);
export const VGlobal = (name: Name): VNe => VNe(HGlobal(name), Nil);
export const VMeta = (index: Ix): VNe => VNe(HMeta(index), Nil);

export type EnvV = List<Val>;
export const extendV = (vs: EnvV, val: Val): EnvV => Cons(val, vs);
export const showEnvV = (l: EnvV, k: Ix = 0, full: boolean = false): string => toString(l, v => showTerm(quote(v, k, full)));

export const force = (v: Val): Val => {
  if (v.tag === 'VGlued') return force(forceLazy(v.val));
  if (v.tag === 'VNe' && v.head.tag === 'HMeta') {
    const val = metaGet(v.head.index);
    if (val.tag === 'Unsolved') return v;
    return force(foldr((elim, y) => elim.tag === 'EUnroll' ? vunroll(y) : vapp(y, elim.plicity, elim.arg), val.val, v.args));
  }
  return v;
};
export const forceGlue = (v: Val): Val => {
  if (v.tag === 'VGlued') return VGlued(v.head, v.args, mapLazy(v.val, forceGlue));
  if (v.tag === 'VNe' && v.head.tag === 'HMeta') {
    const val = metaGet(v.head.index);
    if (val.tag === 'Unsolved') return v;
    const delayed = Lazy(() => forceGlue(foldr((elim, y) => elim.tag === 'EUnroll' ? vunroll(y) : vapp(y, elim.plicity, elim.arg), val.val, v.args)));
    return VGlued(v.head, v.args, delayed);
  }
  return v;
};

export const vapp = (a: Val, plicity: Plicity, b: Val): Val => {
  if (a.tag === 'VAbs') {
    if (!eqPlicity(a.plicity, plicity))
      return impossible(`vapp VAbs plicity mismatch: ${showTermQ(a, 0, false)} ${plicity.erased ? '-' : ''}@ ${showTermQ(b, 0, false)}`);
    return a.body(b);
  }
  if (a.tag === 'VNe') return VNe(a.head, Cons(EApp(plicity, b), a.args));
  if (a.tag === 'VGlued')
    return VGlued(a.head, Cons(EApp(plicity, b), a.args), mapLazy(a.val, v => vapp(v, plicity, b)));
  return impossible(`vapp: ${a.tag}`);
};
export const vunroll = (v: Val): Val => {
  if (v.tag === 'VRoll') return v.term;
  if (v.tag === 'VNe') return VNe(v.head, Cons(EUnroll, v.args));
  if (v.tag === 'VGlued')
    return VGlued(v.head, Cons(EUnroll, v.args), mapLazy(v.val, v => vunroll(v)));
  return impossible(`vunroll: ${v.tag}`);
};
export const evaluate = (t: Term, vs: EnvV = Nil): Val => {
  if (t.tag === 'Type') return VType;
  if (t.tag === 'Var')
    return index(vs, t.index) || impossible(`evaluate: var ${t.index} has no value`);
  if (t.tag === 'Global') {
    const entry = globalGet(t.name) || impossible(`evaluate: global ${t.name} has no value`);
    return VGlued(HGlobal(t.name), Nil, Lazy(() => entry.val));
  }
  if (t.tag === 'Meta') {
    const s = metaGet(t.index);
    return s.tag === 'Solved' ? s.val : VMeta(t.index);
  }
  if (t.tag === 'App')
    return vapp(evaluate(t.left, vs), t.plicity, evaluate(t.right, vs));
  if (t.tag === 'Abs' && t.type)
    return VAbs(t.plicity, t.name, evaluate(t.type, vs), v => evaluate(t.body, extendV(vs, v)));
  if (t.tag === 'Let')
    return evaluate(t.body, extendV(vs, evaluate(t.val, vs)));
  if (t.tag === 'Roll' && t.type)
    return VRoll(evaluate(t.type, vs), evaluate(t.term, vs));
  if (t.tag === 'Unroll')
    return vunroll(evaluate(t.term, vs));
  if (t.tag === 'Pi')
    return VPi(t.plicity, t.name, evaluate(t.type, vs), v => evaluate(t.body, extendV(vs, v)));
  if (t.tag === 'Fix')
    return VFix(t.name, evaluate(t.type, vs), v => evaluate(t.body, extendV(vs, v)));
  if (t.tag === 'Ann')
    return evaluate(t.term, vs);
  return impossible(`cannot evaluate: ${showTerm(t)}`);
};

const quoteHead = (h: Head, k: Ix): Term => {
  if (h.tag === 'HVar') return Var(k - (h.index + 1));
  if (h.tag === 'HGlobal') return Global(h.name);
  if (h.tag === 'HMeta') return Meta(h.index);
  return h;
};
const quoteElim = (t: Term, e: Elim, k: Ix, full: boolean): Term => {
  if (e.tag === 'EApp') return App(t, e.plicity, quote(e.arg, k, full));
  if (e.tag === 'EUnroll') return Unroll(t);
  return e;
};
export const quote = (v_: Val, k: Ix, full: boolean): Term => {
  const v = forceGlue(v_);
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
    return Abs(v.plicity, v.name, quote(v.type, k, full), quote(v.body(VVar(k)), k + 1, full));
  if (v.tag === 'VPi')
    return Pi(v.plicity, v.name, quote(v.type, k, full), quote(v.body(VVar(k)), k + 1, full));
  if (v.tag === 'VFix')
    return Fix(v.name, quote(v.type, k, full), quote(v.body(VVar(k)), k + 1, full));
  if (v.tag === 'VRoll')
    return Roll(quote(v.type, k, full), quote(v.term, k, full));
  return v;
};
export const quoteZ = (v: Val, k: Ix, full: boolean): Term =>
  zonk(quote(v, k, full), k, full);

export const normalize = (t: Term, vs: EnvV, k: Ix, full: boolean): Term =>
  quote(evaluate(t, vs), k, full);

export const showTermQ = (v: Val, k: number = 0, full: boolean = false): string => showTerm(quote(v, k, full));
export const showTermU = (v: Val, ns: List<Name> = Nil, k: number = 0, full: boolean = false): string =>
  showTermS(fromSurface(quote(v, k, full), ns));
export const showElimU = (e: Elim, ns: List<Name> = Nil, k: number = 0, full: boolean = false): string => {
  if (e.tag === 'EUnroll') return 'unroll';
  if (e.tag === 'EApp') return `${e.plicity.erased ? '{' : ''}${showTermU(e.arg, ns, k, full)}${e.plicity.erased ? '}' : ''}`;
  return e;
};

type S = [false, Val] | [true, Term];
const zonkSpine = (tm: Term, k: Ix, full: boolean): S => {
  if (tm.tag === 'Meta') {
    const s = metaGet(tm.index);
    if (s.tag === 'Unsolved') return [true, zonk(tm, k, full)];
    return [false, s.val];
  }
  if (tm.tag === 'App') {
    const spine = zonkSpine(tm.left, k, full);
    return spine[0] ?
      [true, App(spine[1], tm.plicity, zonk(tm.right, k, full))] :
      [false, vapp(spine[1], tm.plicity, evaluate(tm.right))];
  }
  return [true, zonk(tm, k, full)];
};
export const zonk = (tm: Term, k: Ix = 0, full: boolean = false): Term => {
  if (tm.tag === 'Meta') {
    const s = metaGet(tm.index);
    return s.tag === 'Solved' ? quote(s.val, k, full) : tm;
  }
  if (tm.tag === 'Pi')
    return Pi(tm.plicity, tm.name, zonk(tm.type, k, full), zonk(tm.body, k + 1, full));
  if (tm.tag === 'Fix')
    return Fix(tm.name, zonk(tm.type, k, full), zonk(tm.body, k + 1, full));
  if (tm.tag === 'Let')
    return Let(tm.plicity, tm.name, zonk(tm.val, k, full), zonk(tm.body, k + 1, full));
  if (tm.tag === 'Ann') return Ann(zonk(tm.term, k, full), zonk(tm.type, k, full));
  if (tm.tag === 'Unroll')
    return Unroll(zonk(tm.term, k, full));
  if (tm.tag === 'Roll')
    return Roll(tm.type && zonk(tm.type, k, full), zonk(tm.term, k, full));
  if (tm.tag === 'Abs')
    return Abs(tm.plicity, tm.name, tm.type && zonk(tm.type, k, full), zonk(tm.body, k + 1, full));
  if (tm.tag === 'App') {
    const spine = zonkSpine(tm.left, k, full);
    return spine[0] ?
      App(spine[1], tm.plicity, zonk(tm.right, k, full)) :
      quote(vapp(spine[1], tm.plicity, evaluate(tm.right)), k, full);
  }
  return tm;
};
