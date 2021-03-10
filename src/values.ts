import { App, Core, Var, show as showCore, Abs, Pi, Global, Meta, Let, Type } from './core';
import { getMeta, MetaVar } from './metas';
import { Ix, Lvl, Name } from './names';
import { Lazy } from './utils/Lazy';
import { cons, List, Nil, nil } from './utils/List';
import { impossible } from './utils/utils';
import { getGlobal } from './globals';

export type Elim = EApp;

export interface EApp { readonly tag: 'EApp'; readonly erased: boolean; readonly arg: Val }
export const EApp = (erased: boolean, arg: Val): EApp => ({ tag: 'EApp', erased, arg });

export type Spine = List<Elim>;
export type EnvV = List<Val>;
export type Clos = (val: Val) => Val;

export type Val = VType | VRigid | VFlex | VGlobal | VAbs | VPi;

export interface VType { readonly tag: 'VType'; readonly index: Ix }
export const VType = (index: Ix): VType => ({ tag: 'VType', index });
export interface VRigid { readonly tag: 'VRigid'; readonly head: Lvl; readonly spine: Spine }
export const VRigid = (head: Lvl, spine: Spine): VRigid => ({ tag: 'VRigid', head, spine });
export interface VFlex { readonly tag: 'VFlex'; readonly head: MetaVar; readonly spine: Spine }
export const VFlex = (head: MetaVar, spine: Spine): VFlex => ({ tag: 'VFlex', head, spine });
export interface VGlobal { readonly tag: 'VGlobal'; readonly name: Name; readonly spine: Spine; readonly val: Lazy<Val> };
export const VGlobal = (name: Name, spine: Spine, val: Lazy<Val>): VGlobal => ({ tag: 'VGlobal', name, spine, val });
export interface VAbs { readonly tag: 'VAbs'; readonly erased: boolean; readonly name: Name; readonly type: Val; readonly clos: Clos }
export const VAbs = (erased: boolean, name: Name, type: Val, clos: Clos): VAbs => ({ tag: 'VAbs', erased, name, type, clos });
export interface VPi { readonly tag: 'VPi'; readonly erased: boolean; readonly name: Name; readonly type: Val; readonly clos: Clos }
export const VPi = (erased: boolean, name: Name, type: Val, clos: Clos): VPi => ({ tag: 'VPi', erased, name, type, clos });

export type ValWithClosure = Val & { tag: 'VAbs' | 'VPi' };
export const vinst = (val: ValWithClosure, arg: Val): Val => val.clos(arg);

export const VVar = (level: Lvl, spine: Spine = nil): Val => VRigid(level, spine);
export const VMeta = (meta: MetaVar, spine: Spine = nil): Val => VFlex(meta, spine);

export const isVVar = (v: Val): v is VRigid & { spine: Nil } =>
  v.tag === 'VRigid' && v.spine.isNil();

export const force = (v: Val, forceGlobal: boolean = true): Val => {
  if (v.tag === 'VGlobal' && forceGlobal) return force(v.val.get(), forceGlobal);
  if (v.tag === 'VFlex') {
    const e = getMeta(v.head);
    return e.tag === 'Solved' ? force(velimSpine(e.solution, v.spine), forceGlobal) : v;
  }
  return v;
};

export const velim = (e: Elim, t: Val): Val => {
  if (e.tag === 'EApp') return vapp(t, e.erased, e.arg);
  return e.tag;
};

export const velimSpine = (t: Val, sp: Spine): Val => sp.foldr(velim, t);

export const vapp = (left: Val, erased: boolean, right: Val): Val => {
  if (left.tag === 'VAbs') return vinst(left, right);
  if (left.tag === 'VRigid') return VRigid(left.head, cons(EApp(erased, right), left.spine));
  if (left.tag === 'VFlex') return VFlex(left.head, cons(EApp(erased, right), left.spine));
  if (left.tag === 'VGlobal') return VGlobal(left.name, cons(EApp(erased, right), left.spine), left.val.map(v => vapp(v, erased, right)));
  return impossible(`vapp: ${left.tag}`);
};

export const velimBD = (env: EnvV, v: Val, s: List<boolean>): Val => {
  if (env.isNil() && s.isNil()) return v;
  if (env.isCons() && s.isCons())
    return s.head ? vapp(velimBD(env.tail, v, s.tail), false, env.head) : velimBD(env.tail, v, s.tail); // TODO: erasure?
  return impossible('velimBD');
};

export const evaluate = (t: Core, vs: EnvV): Val => {
  if (t.tag === 'Type') return VType(t.index);
  if (t.tag === 'Abs') return VAbs(t.erased, t.name, evaluate(t.type, vs), v => evaluate(t.body, cons(v, vs)));
  if (t.tag === 'Pi') return VPi(t.erased, t.name, evaluate(t.type, vs), v => evaluate(t.body, cons(v, vs)));
  if (t.tag === 'Var') return vs.index(t.index) || impossible(`evaluate: var ${t.index} has no value`);
  if (t.tag === 'Meta') return VMeta(t.id);
  if (t.tag === 'InsertedMeta') return velimBD(vs, VMeta(t.id), t.spine);
  if (t.tag === 'App') return vapp(evaluate(t.fn, vs), t.erased, evaluate(t.arg, vs));
  if (t.tag === 'Let') return evaluate(t.body, cons(evaluate(t.val, vs), vs));
  if (t.tag === 'Global') {
    const entry = getGlobal(t.name);
    if (!entry) return impossible(`tried to load undefined global ${t.name}`);
    const val = entry.value;
    return VGlobal(t.name, nil, Lazy.of(val));
  }
  return t;
};

const quoteElim = (t: Core, e: Elim, k: Lvl, full: boolean): Core => {
  if (e.tag === 'EApp') return App(t, e.erased, quote(e.arg, k, full));
  return e.tag;
};
export const quote = (v_: Val, k: Lvl, full: boolean = false): Core => {
  const v = force(v_, false);
  if (v.tag === 'VType') return Type(v.index);
  if (v.tag === 'VRigid')
    return v.spine.foldr(
      (x, y) => quoteElim(y, x, k, full),
      Var(k - (v.head + 1)) as Core,
    );
  if (v.tag === 'VFlex')
    return v.spine.foldr(
      (x, y) => quoteElim(y, x, k, full),
      Meta(v.head) as Core,
    );
  if (v.tag === 'VGlobal') {
    if (full) return quote(v.val.get(), k, full);
    return v.spine.foldr(
      (x, y) => quoteElim(y, x, k, full),
      Global(v.name) as Core,
    );
  }
  if (v.tag === 'VAbs') return Abs(v.erased, v.name, quote(v.type, k, full), quote(vinst(v, VVar(k)), k + 1, full));
  if (v.tag === 'VPi') return Pi(v.erased, v.name, quote(v.type, k, full), quote(vinst(v, VVar(k)), k + 1, full));
  return v;
};

export const normalize = (t: Core, k: Lvl = 0, vs: EnvV = nil, full: boolean = false): Core => quote(evaluate(t, vs), k, full);
export const show = (v: Val, k: Lvl = 0, full: boolean = false): string => showCore(quote(v, k, full));

type S = [false, Val] | [true, Core];
const zonkSpine = (tm: Core, vs: EnvV, k: Lvl, full: boolean): S => {
  if (tm.tag === 'Meta') {
    const s = getMeta(tm.id);
    if (s.tag === 'Unsolved') return [true, zonk(tm, vs, k, full)];
    return [false, s.solution];
  }
  if (tm.tag === 'App') {
    const spine = zonkSpine(tm.fn, vs, k, full);
    return spine[0] ?
      [true, App(spine[1], tm.erased, zonk(tm.arg, vs, k, full))] :
      [false, vapp(spine[1], tm.erased, evaluate(tm.arg, vs))];
  }
  return [true, zonk(tm, vs, k, full)];
};
const vzonkBD = (env: EnvV, v: Val, s: List<boolean>): Val => {
  if (env.isNil() && s.isNil()) return v;
  if (env.isCons() && s.isCons())
    return s.head ? vapp(velimBD(env.tail, v, s.tail), false, env.head) : velimBD(env.tail, v, s.tail); // TODO: erasure?
  return impossible('vzonkBD');
};
export const zonk = (tm: Core, vs: EnvV = nil, k: Lvl = 0, full: boolean = false): Core => {
  if (tm.tag === 'Meta') {
    const s = getMeta(tm.id);
    return s.tag === 'Solved' ? quote(s.solution, k, full) : tm;
  }
  if (tm.tag === 'InsertedMeta') {
    const s = getMeta(tm.id);
    if (s.tag === 'Unsolved') return tm;
    return quote(vzonkBD(vs, s.solution, tm.spine), k, full);
  }
  if (tm.tag === 'Pi')
    return Pi(tm.erased, tm.name, zonk(tm.type, vs, k, full), zonk(tm.body, cons(VVar(k), vs), k + 1, full));
  if (tm.tag === 'Let')
    return Let(tm.erased, tm.name, zonk(tm.type, vs, k, full), zonk(tm.val, vs, k, full), zonk(tm.body, cons(VVar(k), vs), k + 1, full));
  if (tm.tag === 'Abs')
    return Abs(tm.erased, tm.name, zonk(tm.type, vs, k, full), zonk(tm.body, cons(VVar(k), vs), k + 1, full));
  if (tm.tag === 'App') {
    const spine = zonkSpine(tm.fn, vs, k, full);
    return spine[0] ?
      App(spine[1], tm.erased, zonk(tm.arg, vs, k, full)) :
      quote(vapp(spine[1], tm.erased, evaluate(tm.arg, vs)), k, full);
  }
  return tm;
};
