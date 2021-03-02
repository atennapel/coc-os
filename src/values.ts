import { App, Core, Prim, SortType, Var, show as showCore, Abs, Pi, Sort, Global, Meta } from './core';
import { Hash } from './hash';
import { MetaVar } from './metas';
import { Lvl, Name } from './names';
import { primElim, PrimElimName, PrimName } from './prims';
import { Lazy } from './utils/Lazy';
import { cons, List, Nil, nil } from './utils/List';
import { impossible } from './utils/utils';

export type Head = HVar | HPrim;

export interface HVar { readonly tag: 'HVar'; readonly level: Lvl }
export const HVar = (level: Lvl): HVar => ({ tag: 'HVar', level });
export interface HPrim { readonly tag: 'HPrim'; readonly name: PrimName }
export const HPrim = (name: PrimName): HPrim => ({ tag: 'HPrim', name });

export type Elim = EApp | EPrimElim;

export interface EApp { readonly tag: 'EApp'; readonly erased: boolean; readonly arg: Val }
export const EApp = (erased: boolean, arg: Val): EApp => ({ tag: 'EApp', erased, arg });
export interface EPrimElim { readonly tag: 'EPrimElim'; name: PrimElimName; readonly args: Val[] }
export const EPrimElim = (name: PrimElimName, args: Val[]): EPrimElim => ({ tag: 'EPrimElim', name, args });

export type Spine = List<Elim>;
export type EnvV = List<Val>;
export type Clos = (val: Val) => Val;

export type Val = VSort | VRigid | VFlex | VGlobal | VAbs | VPi;

export interface VSort { readonly tag: 'VSort'; readonly sort: SortType }
export const VSort = (sort: SortType): VSort => ({ tag: 'VSort', sort });
export interface VRigid { readonly tag: 'VRigid'; readonly head: Head; readonly spine: Spine }
export const VRigid = (head: Head, spine: Spine): VRigid => ({ tag: 'VRigid', head, spine });
export interface VFlex { readonly tag: 'VFlex'; readonly head: MetaVar; readonly spine: Spine }
export const VFlex = (head: MetaVar, spine: Spine): VFlex => ({ tag: 'VFlex', head, spine });
export interface VGlobal { readonly tag: 'VGlobal'; readonly name: Name | null; readonly hash: Hash; readonly spine: Spine; readonly val: Lazy<Val> };
export const VGlobal = (name: Name | null, hash: Hash, spine: Spine, val: Lazy<Val>): VGlobal => ({ tag: 'VGlobal', name, hash, spine, val });
export interface VAbs { readonly tag: 'VAbs'; readonly erased: boolean; readonly name: Name; readonly type: Val; readonly clos: Clos }
export const VAbs = (erased: boolean, name: Name, type: Val, clos: Clos): VAbs => ({ tag: 'VAbs', erased, name, type, clos });
export interface VPi { readonly tag: 'VPi'; readonly erased: boolean; readonly name: Name; readonly type: Val; readonly clos: Clos }
export const VPi = (erased: boolean, name: Name, type: Val, clos: Clos): VPi => ({ tag: 'VPi', erased, name, type, clos });

export type ValWithClosure = Val & { tag: 'VAbs' | 'VPi' };
export const vinst = (val: ValWithClosure, arg: Val): Val => val.clos(arg);

export const VVar = (level: Lvl, spine: Spine = nil): Val => VRigid(HVar(level), spine);
export const VPrim = (name: PrimName, spine: Spine = nil): Val => VRigid(HPrim(name), spine);
export const VMeta = (meta: MetaVar, spine: Spine = nil): Val => VFlex(meta, spine);

export const isVVar = (v: Val): v is VRigid & { head: HVar, spine: Nil } =>
  v.tag === 'VRigid' && v.head.tag === 'HVar' && v.spine.isNil();

export const VType = VSort('*');
export const VBox = VSort('**');

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
  if (e.tag === 'EPrimElim') return vprimelim(e.name, t, e.args);
  return e;
};

export const velimSpine = (t: Val, sp: Spine): Val => sp.foldr(velim, t);

export const vapp = (left: Val, erased: boolean, right: Val): Val => {
  if (left.tag === 'VAbs') return vinst(left, right);
  if (left.tag === 'VRigid') return VRigid(left.head, cons(EApp(erased, right), left.spine));
  if (left.tag === 'VFlex') return VFlex(left.head, cons(EApp(erased, right), left.spine));
  if (left.tag === 'VGlobal') return VGlobal(left.name, left.hash, cons(EApp(erased, right), left.spine), left.val.map(v => vapp(v, erased, right)));
  return impossible(`vapp: ${left.tag}`);
};
export const vprimelim = (name: PrimElimName, scrut: Val, args: Val[]): Val => {
  const res = primElim(name, args);
  if (res) return res;
  if (scrut.tag === 'VRigid') return VRigid(scrut.head, cons(EPrimElim(name, args), scrut.spine));
  if (scrut.tag === 'VFlex') return VFlex(scrut.head, cons(EPrimElim(name, args), scrut.spine));
  if (scrut.tag === 'VGlobal')
    return VGlobal(scrut.name, scrut.hash, cons(EPrimElim(name, args), scrut.spine), scrut.val.map(v => vprimelim(name, v, args)));
  return impossible(`vprimelim (${name}): ${scrut.tag}`);
};

export const velimBD = (env: EnvV, v: Val, s: List<boolean>): Val => {
  if (env.isNil() && s.isNil()) return v;
  if (env.isCons() && s.isCons())
    return s.head ? vapp(velimBD(env.tail, v, s.tail), false, env.head) : velimBD(env.tail, v, s.tail); // TODO: erasure?
  return impossible('velimBD');
};

export const evaluate = (t: Core, vs: EnvV): Val => {
  if (t.tag === 'Sort') return VSort(t.sort);
  if (t.tag === 'Prim') return VPrim(t.name);
  if (t.tag === 'Abs') return VAbs(t.erased, t.name, evaluate(t.type, vs), v => evaluate(t.body, cons(v, vs)));
  if (t.tag === 'Pi') return VPi(t.erased, t.name, evaluate(t.type, vs), v => evaluate(t.body, cons(v, vs)));
  if (t.tag === 'Var') return vs.index(t.index) || impossible(`evaluate: var ${t.index} has no value`);
  if (t.tag === 'Meta') return VMeta(t.id);
  if (t.tag === 'InsertedMeta') return velimBD(vs, VMeta(t.id), t.spine);
  if (t.tag === 'Global') return VGlobal(HGlobal(t.name), nil, Lazy.from(() => {
    const e = globalLoad(t.name);
    if (!e) return terr(`failed to load global ${t.name}`);
    return e.val;
  }));
  if (t.tag === 'App') return vapp(evaluate(t.fn, vs), t.erased, evaluate(t.arg, vs));
  if (t.tag === 'Let') return evaluate(t.body, cons(evaluate(t.val, vs), vs));
  return t;
};

const quoteHead = (h: Head, k: Lvl): Core => {
  if (h.tag === 'HVar') return Var(k - (h.level + 1));
  if (h.tag === 'HPrim') return Prim(h.name);
  return h;
};
const quoteElim = (t: Core, e: Elim, k: Lvl, full: boolean): Core => {
  if (e.tag === 'EApp') return App(t, e.erased, quote(e.arg, k, full));
  if (e.tag === 'EPrimElim') return PrimElim(e.name, e.usage, quote(e.motive, k, full), t, e.cases.map(c => quote(c, k, full)));
  return e;
};
export const quote = (v_: Val, k: Lvl, full: boolean = false): Core => {
  const v = force(v_, false);
  if (v.tag === 'VSort') return Sort(v.sort);
  if (v.tag === 'VRigid')
    return v.spine.foldr(
      (x, y) => quoteElim(y, x, k, full),
      quoteHead(v.head, k),
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
      Global(v.name, v.hash) as Core,
    );
  }
  if (v.tag === 'VAbs') return Abs(v.erased, v.name, quote(v.type, k, full), quote(vinst(v, VVar(k)), k + 1, full));
  if (v.tag === 'VPi') return Pi(v.erased, v.name, quote(v.type, k, full), quote(vinst(v, VVar(k)), k + 1, full));
  return v;
};

export const normalize = (t: Core, k: Lvl = 0, vs: EnvV = nil, full: boolean = false): Core => quote(evaluate(t, vs), k, full);
export const show = (v: Val, k: Lvl = 0, full: boolean = false): string => showCore(quote(v, k, full));
