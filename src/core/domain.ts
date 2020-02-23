import { Ix, Name } from '../names';
import { List, Cons, Nil, toString, index, foldr } from '../list';
import { Term, showTerm, Type, Var, App, Abs, Pi, Global, fromSurface, Meta, Let, Ann, Inter, Both, Snd, Fst } from './syntax';
import { impossible, terr } from '../util';
import { globalGet } from './globalenv';
import { Lazy, mapLazy, forceLazy } from '../lazy';
import { Plicity, PlicityR } from '../syntax';
import { showTerm as showTermS } from '../syntax';
import { metaGet } from './metas';

export type Head = HVar | HGlobal | HMeta;

export type HVar = { tag: 'HVar', index: Ix };
export const HVar = (index: Ix): HVar => ({ tag: 'HVar', index });
export type HGlobal = { tag: 'HGlobal', name: Name };
export const HGlobal = (name: Name): HGlobal => ({ tag: 'HGlobal', name });
export type HMeta = { tag: 'HMeta', index: Ix };
export const HMeta = (index: Ix): HMeta => ({ tag: 'HMeta', index });

export type Elim = EApp;

export type EApp = { tag: 'EApp', arg: Val };
export const EApp = (arg: Val): EApp => ({ tag: 'EApp', arg });

export type Clos = (val: Val) => Val;
export type Val = VNe | VGlued | VAbs | VPi | VType | VInter;

export type VNe = { tag: 'VNe', head: Head, args: List<Elim> };
export const VNe = (head: Head, args: List<Elim>): VNe => ({ tag: 'VNe', head, args });
export type VGlued = { tag: 'VGlued', head: Head, args: List<Elim>, val: Lazy<Val> };
export const VGlued = (head: Head, args: List<Elim>, val: Lazy<Val>): VGlued => ({ tag: 'VGlued', head, args, val });
export type VAbs = { tag: 'VAbs', name: Name, body: Clos };
export const VAbs = (name: Name, body: Clos): VAbs => ({ tag: 'VAbs', name, body});
export type VPi = { tag: 'VPi', plicity: Plicity, name: Name, type: Val, body: Clos };
export const VPi = (plicity: Plicity, name: Name, type: Val, body: Clos): VPi => ({ tag: 'VPi', name, plicity, type, body});
export type VInter = { tag: 'VInter', name: Name, type: Val, body: Clos };
export const VInter = (name: Name, type: Val, body: Clos): VInter => ({ tag: 'VInter', name, type, body});
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
    return force(foldr((elim, y) => vapp(y, elim.arg), val.val, v.args));
  }
  return v;
};
export const forceGlue = (v: Val): Val => {
  if (v.tag === 'VGlued') return VGlued(v.head, v.args, mapLazy(v.val, forceGlue));
  if (v.tag === 'VNe' && v.head.tag === 'HMeta') {
    const val = metaGet(v.head.index);
    if (val.tag === 'Unsolved') return v;
    const delayed = Lazy(() => forceGlue(foldr((elim, y) => vapp(y, elim.arg), val.val, v.args)));
    return VGlued(v.head, v.args, delayed);
  }
  return v;
};

export const vapp = (a: Val, b: Val): Val => {
  if (a.tag === 'VAbs') return a.body(b);
  if (a.tag === 'VNe') return VNe(a.head, Cons(EApp(b), a.args));
  if (a.tag === 'VGlued')
    return VGlued(a.head, Cons(EApp(b), a.args), mapLazy(a.val, v => vapp(v, b)));
  return impossible(`vapp: ${a.tag}`);
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
    return t.plicity.erased ? evaluate(t.left, vs) : vapp(evaluate(t.left, vs), evaluate(t.right, vs));
  if (t.tag === 'Abs')
    return t.plicity.erased ? evaluate(t.body, vs) :
      VAbs(t.name, v => evaluate(t.body, extendV(vs, v)));
  if (t.tag === 'Let')
    return t.plicity.erased ? evaluate(t.body, vs) : evaluate(t.body, extendV(vs, evaluate(t.val, vs)));
  if (t.tag === 'Pi')
    return VPi(t.plicity, t.name, evaluate(t.type, vs), v => evaluate(t.body, extendV(vs, v)));
  if (t.tag === 'Inter')
    return VInter(t.name, evaluate(t.type, vs), v => evaluate(t.body, extendV(vs, v)));
  if (t.tag === 'Ann')
    return evaluate(t.term, vs);
  if (t.tag === 'Both')
    return evaluate(t.fst, vs);
  if (t.tag === 'Hole')
    return terr(`unable to evaluate hole ${showTerm(t)}`);
  if (t.tag === 'Fst')
    return evaluate(t.term, vs);
  if (t.tag === 'Snd')
    return evaluate(t.term, vs);
  return t;
};

const quoteHead = (h: Head, k: Ix): Term => {
  if (h.tag === 'HVar') return Var(k - (h.index + 1));
  if (h.tag === 'HGlobal') return Global(h.name);
  if (h.tag === 'HMeta') return Meta(h.index);
  return h;
};
const quoteElim = (t: Term, e: Elim, k: Ix, full: boolean): Term => {
  if (e.tag === 'EApp') return App(t, PlicityR, quote(e.arg, k, full));
  return e.tag;
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
    return Abs(PlicityR, v.name, null, quote(v.body(VVar(k)), k + 1, full));
  if (v.tag === 'VPi')
    return Pi(v.plicity, v.name, quote(v.type, k, full), quote(v.body(VVar(k)), k + 1, full));
  if (v.tag === 'VInter')
    return Inter(v.name, quote(v.type, k, full), quote(v.body(VVar(k)), k + 1, full));
  return v;
};
export const quoteZ = (v: Val, vs: EnvV = Nil, k: Ix = 0, full: boolean = false): Term =>
  zonk(quote(v, k, full), vs, k, full);

export const normalize = (t: Term, vs: EnvV, k: Ix, full: boolean): Term =>
  quote(evaluate(t, vs), k, full);

export const showTermQ = (v: Val, k: number = 0, full: boolean = false): string => showTerm(quote(v, k, full));
export const showTermU = (v: Val, ns: List<Name> = Nil, k: number = 0, full: boolean = false): string =>
  showTermS(fromSurface(quote(v, k, full), ns));
export const showTermUZ = (v: Val, ns: List<Name> = Nil, vs: EnvV = Nil, k: number = 0, full: boolean = false): string =>
  showTermS(fromSurface(quoteZ(v, vs, k, full), ns));
export const showElimU = (e: Elim, ns: List<Name> = Nil, k: number = 0, full: boolean = false): string => {
  if (e.tag === 'EApp') return showTermU(e.arg, ns, k, full);
  return e.tag;
};

// TODO: fix zonking
type S = [false, Val] | [true, Term];
const zonkSpine = (tm: Term, vs: EnvV, k: Ix, full: boolean): S => {
  if (tm.tag === 'Meta') {
    const s = metaGet(tm.index);
    if (s.tag === 'Unsolved') return [true, zonk(tm, vs, k, full)];
    return [false, s.val];
  }
  if (tm.tag === 'App') {
    const spine = zonkSpine(tm.left, vs, k, full);
    return spine[0] ?
      [true, App(spine[1], tm.plicity, zonk(tm.right, vs, k, full))] :
      [false, vapp(spine[1], evaluate(tm.right, vs))];
  }
  return [true, zonk(tm, vs, k, full)];
};
export const zonk = (tm: Term, vs: EnvV = Nil, k: Ix = 0, full: boolean = false): Term => {
  if (tm.tag === 'Meta') {
    const s = metaGet(tm.index);
    return s.tag === 'Solved' ? quote(s.val, k, full) : tm;
  }
  if (tm.tag === 'Pi')
    return Pi(tm.plicity, tm.name, zonk(tm.type, vs, k, full), zonk(tm.body, extendV(vs, VVar(k)), k + 1, full));
  if (tm.tag === 'Inter')
    return Inter(tm.name, zonk(tm.type, vs, k, full), zonk(tm.body, extendV(vs, VVar(k)), k + 1, full));
  if (tm.tag === 'Let')
    return Let(tm.plicity, tm.name, zonk(tm.val, vs, k, full), zonk(tm.body, extendV(vs, VVar(k)), k + 1, full));
  if (tm.tag === 'Ann') return Ann(zonk(tm.term, vs, k, full), zonk(tm.type, vs, k, full));
  if (tm.tag === 'Both') return Both(zonk(tm.fst, vs, k, full), zonk(tm.snd, vs, k, full));
  if (tm.tag === 'Abs')
    return Abs(tm.plicity, tm.name, tm.type && zonk(tm.type, vs, k, full), zonk(tm.body, extendV(vs, VVar(k)), k + 1, full));
  if (tm.tag === 'Fst') return Fst(zonk(tm.term, vs, k, full));
  if (tm.tag === 'Snd') return Snd(zonk(tm.term, vs, k, full));
  if (tm.tag === 'App') {
    const spine = zonkSpine(tm.left, vs, k, full);
    return spine[0] ?
      App(spine[1], tm.plicity, zonk(tm.right, vs, k, full)) :
      quote(vapp(spine[1], evaluate(tm.right, vs)), k, full);
  }
  return tm;
};
