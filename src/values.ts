import { getMeta } from './context';
import { Abs, App, Let, Meta, Pi, show, Term, Var, Mode, Sigma, Pair, Proj, PrimName, PrimNameElim, Prim, AppE, Expl, ImplUnif } from './core';
import { Ix, Name } from './names';
import { Cons, foldr, index, List, Nil } from './utils/list';
import { impossible } from './utils/utils';

export type Head = HVar | HPrim | HMeta;

export type HVar = { tag: 'HVar', index: Ix };
export const HVar = (index: Ix): HVar => ({ tag: 'HVar', index });
export type HPrim = { tag: 'HPrim', name: PrimName };
export const HPrim = (name: PrimName): HPrim => ({ tag: 'HPrim', name });
export type HMeta = { tag: 'HMeta', index: Ix };
export const HMeta = (index: Ix): HMeta => ({ tag: 'HMeta', index });

export type Elim = EApp | EProj | EPrim;

export type EApp = { tag: 'EApp', mode: Mode, right: Val };
export const EApp = (mode: Mode, right: Val): EApp => ({ tag: 'EApp', mode, right });
export type EProj = { tag: 'EProj', proj: 'fst' | 'snd' };
export const EProj = (proj: 'fst' | 'snd'): EProj => ({ tag: 'EProj', proj });
export type EPrim = { tag: 'EPrim', name: PrimNameElim, args: Val[] };
export const EPrim = (name: PrimNameElim, args: Val[]): EPrim => ({ tag: 'EPrim', name, args });

export type Spine = List<Elim>;
export type EnvV = List<Val>;
export type Clos = (val: Val) => Val;

export type Val = VNe | VAbs | VPair | VPi | VSigma;

export type VNe = { tag: 'VNe', head: Head, spine: Spine };
export const VNe = (head: Head, spine: Spine): VNe => ({ tag: 'VNe', head, spine });
export type VAbs = { tag: 'VAbs', mode: Mode, name: Name, type: Val, clos: Clos };
export const VAbs = (mode: Mode, name: Name, type: Val, clos: Clos): VAbs => ({ tag: 'VAbs', mode, name, type, clos });
export type VPair = { tag: 'VPair', fst: Val, snd: Val, type: Val };
export const VPair = (fst: Val, snd: Val, type: Val): VPair => ({ tag: 'VPair', fst, snd, type });
export type VPi = { tag: 'VPi', mode: Mode, name: Name, type: Val, clos: Clos };
export const VPi = (mode: Mode, name: Name, type: Val, clos: Clos): VPi => ({ tag: 'VPi', mode, name, type, clos });
export type VSigma = { tag: 'VSigma', name: Name, type: Val, clos: Clos };
export const VSigma = (name: Name, type: Val, clos: Clos): VSigma => ({ tag: 'VSigma', name, type, clos });

export const VVar = (index: Ix, spine: Spine = Nil): VNe => VNe(HVar(index), spine);
export const VPrim = (name: PrimName, spine: Spine = Nil): VNe => VNe(HPrim(name), spine);
export const VMeta = (index: Ix, spine: Spine = Nil): VNe => VNe(HMeta(index), spine);

export const isVPrim = (name: PrimName, v: Val): boolean =>
  v.tag === 'VNe' && v.head.tag === 'HPrim' && v.head.name === name;

export const VType = VPrim('Type');
export const VB = VPrim('B');
export const V0 = VPrim('0');
export const V1 = VPrim('1');

export const VPiE = (name: Name, type: Val, clos: Clos): VPi => VPi(Expl, name, type, clos);
export const VPiU = (name: Name, type: Val, clos: Clos): VPi => VPi(ImplUnif, name, type, clos);
export const VAbsE = (name: Name, type: Val, clos: Clos): VAbs => VAbs(Expl, name, type, clos);
export const VAbsU = (name: Name, type: Val, clos: Clos): VAbs => VAbs(ImplUnif, name, type, clos);

export const vinst = (val: VAbs | VPi | VSigma, arg: Val): Val => val.clos(arg);

export const force = (v: Val): Val => {
  if (v.tag === 'VNe' && v.head.tag === 'HMeta') {
    const val = getMeta(v.head.index);
    if (val.tag === 'Unsolved') return v;
    return force(foldr((elim, y) =>
      elim.tag === 'EProj' ? vproj(elim.proj, y) :
      elim.tag === 'EPrim' ? velimprim(elim.name, y, elim.args) :
      vapp(y, elim.mode, elim.right), val.val, v.spine));
  }
  return v;
};

export const vapp = (left: Val, mode: Mode, right: Val): Val => {
  if (left.tag === 'VAbs') return vinst(left, right);
  if (left.tag === 'VNe') return VNe(left.head, Cons(EApp(mode, right), left.spine));
  return impossible(`vapp: ${left.tag}`);
};
export const vappE = (left: Val, right: Val): Val => vapp(left, Expl, right);
export const vappU = (left: Val, right: Val): Val => vapp(left, ImplUnif, right);
export const vproj= (proj: 'fst' | 'snd', v: Val): Val => {
  if (v.tag === 'VPair') return proj === 'fst' ? v.fst : v.snd;
  if (v.tag === 'VNe') return VNe(v.head, Cons(EProj(proj), v.spine));
  return impossible(`vproj: ${v.tag}`);
};

export const velimprim = (name: PrimNameElim, v: Val, args: Val[]): Val => {
  if (name === 'elimB') {
    if (isVPrim('0', v)) return args[1];
    if (isVPrim('1', v)) return args[2];
  }
  if (v.tag === 'VNe') return VNe(v.head, Cons(EPrim(name, args), v.spine));
  return impossible(`velimprim ${name}: ${v.tag}`);
};

export const evaluate = (t: Term, vs: EnvV): Val => {
  if (t.tag === 'Abs')
    return VAbs(t.mode, t.name, evaluate(t.type, vs), v => evaluate(t.body, Cons(v, vs)));
  if (t.tag === 'Pair')
    return VPair(evaluate(t.fst, vs), evaluate(t.snd, vs), evaluate(t.type, vs));
  if (t.tag === 'Pi')
    return VPi(t.mode, t.name, evaluate(t.type, vs), v => evaluate(t.body, Cons(v, vs)));
  if (t.tag === 'Sigma')
    return VSigma(t.name, evaluate(t.type, vs), v => evaluate(t.body, Cons(v, vs)));
  if (t.tag === 'Meta') {
    const s = getMeta(t.index);
    return s.tag === 'Solved' ? s.val : VMeta(t.index);
  }
  if (t.tag === 'Var') 
    return index(vs, t.index) || impossible(`evaluate: var ${t.index} has no value`);
  if (t.tag === 'App')
    return vapp(evaluate(t.left, vs), t.mode, evaluate(t.right, vs));
  if (t.tag === 'Let')
    return evaluate(t.body, Cons(evaluate(t.val, vs), vs));
  if (t.tag === 'Proj')
    return vproj(t.proj, evaluate(t.term, vs));
  if (t.tag === 'Prim') {
    if (t.name === 'elimB') {
      return VAbsE('P', VPiE('_', VB, _ => VType), P =>
        VAbsE('f', vappE(P, V0), f =>
        VAbsE('t', vappE(P, V1), t =>
        VAbsE('b', VB, b =>
        velimprim('elimB', b, [P, f, t])))));
    }
    return VPrim(t.name);
  }
  return t;
};

const quoteHead = (h: Head, k: Ix): Term => {
  if (h.tag === 'HVar') return Var(k - (h.index + 1));
  if (h.tag === 'HPrim') return Prim(h.name);
  if (h.tag === 'HMeta') return Meta(h.index);
  return h;
};
const quoteElim = (t: Term, e: Elim, k: Ix): Term => {
  if (e.tag === 'EApp') return App(t, e.mode, quote(e.right, k));
  if (e.tag === 'EProj') return Proj(e.proj, t);
  if (e.tag === 'EPrim') return AppE(e.args.reduce((x, y) => AppE(x, quote(y, k)), Prim(e.name) as Term), t);
  return e;
};
export const quote = (v_: Val, k: Ix): Term => {
  const v = force(v_);
  if (v.tag === 'VNe')
    return foldr(
      (x, y) => quoteElim(y, x, k),
      quoteHead(v.head, k),
      v.spine,
    );
  if (v.tag === 'VPair')
    return Pair(quote(v.fst, k), quote(v.snd, k), quote(v.type, k));
  if (v.tag === 'VAbs')
    return Abs(v.mode, v.name, quote(v.type, k), quote(vinst(v, VVar(k)), k + 1));
  if (v.tag === 'VPi')
    return Pi(v.mode, v.name, quote(v.type, k), quote(vinst(v, VVar(k)), k + 1));
  if (v.tag === 'VSigma')
    return Sigma(v.name, quote(v.type, k), quote(vinst(v, VVar(k)), k + 1));
  return v;
};

export const normalize = (t: Term): Term => quote(evaluate(t, Nil), 0);

type S = [false, Val] | [true, Term];
const zonkSpine = (tm: Term, vs: EnvV, k: Ix): S => {
  if (tm.tag === 'Meta') {
    const s = getMeta(tm.index);
    if (s.tag === 'Unsolved') return [true, zonk(tm, vs, k)];
    return [false, s.val];
  }
  if (tm.tag === 'App') {
    const spine = zonkSpine(tm.left, vs, k);
    return spine[0] ?
      [true, App(spine[1], tm.mode, zonk(tm.right, vs, k))] :
      [false, vapp(spine[1], tm.mode, evaluate(tm.right, vs))];
  }
  return [true, zonk(tm, vs, k)];
};
export const zonk = (tm: Term, vs: EnvV = Nil, k: Ix = 0): Term => {
  if (tm.tag === 'Meta') {
    const s = getMeta(tm.index);
    return s.tag === 'Solved' ? quote(s.val, k) : tm;
  }
  if (tm.tag === 'Pi')
    return Pi(tm.mode, tm.name, zonk(tm.type, vs, k), zonk(tm.body, Cons(VVar(k), vs), k + 1));
  if (tm.tag === 'Sigma')
    return Sigma(tm.name, zonk(tm.type, vs, k), zonk(tm.body, Cons(VVar(k), vs), k + 1));
  if (tm.tag === 'Let')
    return Let(tm.name, zonk(tm.type, vs, k), zonk(tm.val, vs, k), zonk(tm.body, Cons(VVar(k), vs), k + 1));
  if (tm.tag === 'Abs')
    return Abs(tm.mode, tm.name, zonk(tm.type, vs, k), zonk(tm.body, Cons(VVar(k), vs), k + 1));
  if (tm.tag === 'Pair')
    return Pair(zonk(tm.fst, vs, k), zonk(tm.snd, vs, k), zonk(tm.type, vs, k));
  if (tm.tag === 'Proj')
    return Proj(tm.proj, zonk(tm.term, vs, k));
  if (tm.tag === 'App') {
    const spine = zonkSpine(tm.left, vs, k);
    return spine[0] ?
      App(spine[1], tm.mode, zonk(tm.right, vs, k)) :
      quote(vapp(spine[1], tm.mode, evaluate(tm.right, vs)), k);
  }
  return tm;
};

export const showVal = (v: Val, k: Ix) => show(quote(v, k));
export const showValZ = (v: Val, vs: EnvV = Nil, k: Ix) => show(zonk(quote(v, k), vs, k));
