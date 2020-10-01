import { getMeta } from './context';
import { Abs, App, Let, Meta, Pi, show, Term, Var, Mode, Sigma, Pair, Proj, PrimName, PrimNameElim, Prim, AppE, Expl, ImplUnif, Global } from './core';
import { getGlobal } from './globals';
import { Ix, Name } from './names';
import { forceLazy, Lazy, lazyOf, mapLazy } from './utils/lazy';
import { Cons, foldr, index, List, Nil, toArray } from './utils/list';
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

export type Val = VNe | VGlobal | VAbs | VPair | VPi | VSigma;

export type VNe = { tag: 'VNe', head: Head, spine: Spine };
export const VNe = (head: Head, spine: Spine): VNe => ({ tag: 'VNe', head, spine });
export type VGlobal = { tag: 'VGlobal', head: Name, args: List<Elim>, val: Lazy<Val> };
export const VGlobal = (head: Name, args: List<Elim>, val: Lazy<Val>): VGlobal => ({ tag: 'VGlobal', head, args, val });
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
export const vprimArgs = (v: Val): Val[] => {
  if (v.tag !== 'VNe') return impossible(`vprimArgs, not VNe: ${v.tag}`);
  return toArray(v.spine, e => {
    if (e.tag !== 'EApp') return impossible(`vprimArgs, not EApp: ${e.tag}`);
    return e.right;
  }).reverse();
};

export const VType = VPrim('Type');
export const VB = VPrim('B');
export const V0 = VPrim('0');
export const V1 = VPrim('1');
export const VHEq = VPrim('HEq');
export const VReflHEq = VPrim('ReflHEq');
export const vheq = (a: Val, b: Val, x: Val, y: Val) => vappE(vappE(vappE(vappE(VHEq, a), b), x), y);
export const vreflheq = (a: Val, x: Val) => vappE(vappE(VReflHEq, a), x);
export const VDesc = VPrim('Desc');
export const VRet = VPrim('Ret');
export const VRec = VPrim('Rec');
export const VArg = VPrim('Arg');
export const VFixD = VPrim('FixD');
export const VConD = VPrim('ConD');

export const VPiE = (name: Name, type: Val, clos: Clos): VPi => VPi(Expl, name, type, clos);
export const VPiU = (name: Name, type: Val, clos: Clos): VPi => VPi(ImplUnif, name, type, clos);
export const VAbsE = (name: Name, type: Val, clos: Clos): VAbs => VAbs(Expl, name, type, clos);
export const VAbsU = (name: Name, type: Val, clos: Clos): VAbs => VAbs(ImplUnif, name, type, clos);

export const vinst = (val: VAbs | VPi | VSigma, arg: Val): Val => val.clos(arg);

export const force = (v: Val, forceGlobal: boolean = true): Val => {
  if (v.tag === 'VGlobal' && forceGlobal) return force(forceLazy(v.val), forceGlobal);
  if (v.tag === 'VNe' && v.head.tag === 'HMeta') {
    const val = getMeta(v.head.index);
    if (val.tag === 'Unsolved') return v;
    return force(foldr((elim, y) =>
      elim.tag === 'EProj' ? vproj(elim.proj, y) :
      elim.tag === 'EPrim' ? velimprim(elim.name, y, elim.args) :
      vapp(y, elim.mode, elim.right), val.val, v.spine), forceGlobal);
  }
  return v;
};

export const vapp = (left: Val, mode: Mode, right: Val): Val => {
  if (left.tag === 'VAbs') return vinst(left, right);
  if (left.tag === 'VNe') return VNe(left.head, Cons(EApp(mode, right), left.spine));
  if (left.tag === 'VGlobal')
    return VGlobal(left.head, Cons(EApp(mode, right), left.args), mapLazy(left.val, v => vapp(v, mode, right)));
  return impossible(`vapp: ${left.tag}`);
};
export const vappE = (left: Val, right: Val): Val => vapp(left, Expl, right);
export const vappU = (left: Val, right: Val): Val => vapp(left, ImplUnif, right);
export const vproj = (proj: 'fst' | 'snd', v: Val): Val => {
  if (v.tag === 'VPair') return proj === 'fst' ? v.fst : v.snd;
  if (v.tag === 'VNe') return VNe(v.head, Cons(EProj(proj), v.spine));
  if (v.tag === 'VGlobal')
    return VGlobal(v.head, Cons(EProj(proj), v.args), mapLazy(v.val, v => vproj(proj, v)));
  return impossible(`vproj: ${v.tag}`);
};

export const velimprim = (name: PrimNameElim, v: Val, args: Val[]): Val => {
  if (name === 'elimB') {
    if (isVPrim('0', v)) return args[1];
    if (isVPrim('1', v)) return args[2];
  }
  if (name === 'elimHEq') {
    if (isVPrim('ReflHEq', v)) return args[3];
  }
  if (name === 'elimDesc') {
    const [P, ret, rec, arg] = args;
    // elimDesc P ret rec arg Ret ~> ret
    if (isVPrim('Ret', v)) return ret;
    // elimDesc P ret rec arg (Rec r) ~> rec r (elimDesc P ret rec arg r)
    if (isVPrim('Rec', v)) {
      const [r] = vprimArgs(v);
      return vappE(vappE(args[2], r), velimprim('elimDesc', r, [P, ret, rec, arg]));
    }
    // elimDesc P ret rec arg (Arg T f) ~> arg T f (\(x : T). elimDesc P ret rec arg (f x))
    if (isVPrim('Arg', v)) {
      const [T, f] = vprimArgs(v);
      return vappE(vappE(vappE(args[3], T), f), VAbsE('x', T, x => velimprim('elimDesc', vappE(f, x), [P, ret, rec, arg])));
    }
  }
  if (name === 'elimFixD') {
    if (isVPrim('ConD', v)) {
      const [c] = vprimArgs(v);
      return vappE(args[3], c);
    }
  }
  if (v.tag === 'VNe') return VNe(v.head, Cons(EPrim(name, args), v.spine));
  if (v.tag === 'VGlobal')
    return VGlobal(v.head, Cons(EPrim(name, args), v.args), mapLazy(v.val, v => velimprim(name, v, args)));
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
  if (t.tag === 'Global') {
    const entry = getGlobal(t.name) || impossible(`evaluate: global ${t.name} has no value`);
    return VGlobal(t.name, Nil, lazyOf(entry.val));
  }
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
    if (t.name === 'elimHEq') {
      return VAbsE('A', VType, A =>
        VAbsE('a', A, a =>
        VAbsE('P', VPiE('b', A, b => VPiE('_', vheq(A, A, a, b), _ => VType)), P =>
        VAbsE('h', vappE(vappE(P, a), vreflheq(A, a)), h =>
        VAbsE('b', A, b =>
        VAbsE('p', vheq(A, A, a, b), p =>
        velimprim('elimHEq', p, [A, a, P, h, b])))))));
    }
    if (t.name === 'elimDesc') {
      return VAbsE('P', VPiE('_', VDesc, _ => VType), P =>
        VAbsE('ret', vappE(P, VRet), ret =>
        VAbsE('rec', VPiE('r', VDesc, r => VPiE('_', vappE(P, r), _ => vappE(P, vappE(VRec, r)))), rec =>
        VAbsE('arg', VPiE('T', VType, T => VPiE('f', VPiE('_', T, _ => VDesc), f => VPiE('_', VPiE('x', T, x => vappE(P, vappE(f, x))), _ => vappE(P, vappE(vappE(VArg, T), f))))), arg =>
        VAbsE('d', VDesc, d =>
        velimprim('elimDesc', d, [P, ret, rec, arg]))))));
    }
    if (t.name === 'elimFixD') {
      return VAbsE('interpret', VPiE('_', VDesc, _ => VPiE('_', VType, _ => VType)), interpret =>
        VAbsE('d', VDesc, d =>
        VAbsE('P', VPiE('_', vappE(vappE(VFixD, interpret), d), _ => VType), P =>
        VAbsE('h', VPiE('y', vappE(vappE(interpret, d), vappE(vappE(VFixD, interpret), d)), y => vappE(P, vappE(vappE(vappE(VConD, interpret), d), y))), h =>
        VAbsE('x', vappE(vappE(VFixD, interpret), d), x =>
        velimprim('elimFixD', x, [interpret, d, P, h]))))));
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
const quoteElim = (t: Term, e: Elim, k: Ix, full: boolean): Term => {
  if (e.tag === 'EApp') return App(t, e.mode, quote(e.right, k, full));
  if (e.tag === 'EProj') return Proj(e.proj, t);
  if (e.tag === 'EPrim') return AppE(e.args.reduce((x, y) => AppE(x, quote(y, k, full)), Prim(e.name) as Term), t);
  return e;
};
export const quote = (v_: Val, k: Ix, full: boolean = false): Term => {
  const v = force(v_, false);
  if (v.tag === 'VNe')
    return foldr(
      (x, y) => quoteElim(y, x, k, full),
      quoteHead(v.head, k),
      v.spine,
    );
  if (v.tag === 'VGlobal') {
    if (full) return quote(forceLazy(v.val), k, full);
    return foldr(
      (x, y) => quoteElim(y, x, k, full),
      Global(v.head) as Term,
      v.args,
    );
  }
  if (v.tag === 'VPair')
    return Pair(quote(v.fst, k, full), quote(v.snd, k, full), quote(v.type, k, full));
  if (v.tag === 'VAbs')
    return Abs(v.mode, v.name, quote(v.type, k, full), quote(vinst(v, VVar(k)), k + 1, full));
  if (v.tag === 'VPi')
    return Pi(v.mode, v.name, quote(v.type, k, full), quote(vinst(v, VVar(k)), k + 1, full));
  if (v.tag === 'VSigma')
    return Sigma(v.name, quote(v.type, k, full), quote(vinst(v, VVar(k)), k + 1, full));
  return v;
};

export const normalize = (t: Term, full: boolean = false): Term => quote(evaluate(t, Nil), 0, full);

type S = [false, Val] | [true, Term];
const zonkSpine = (tm: Term, vs: EnvV, k: Ix, full: boolean): S => {
  if (tm.tag === 'Meta') {
    const s = getMeta(tm.index);
    if (s.tag === 'Unsolved') return [true, zonk(tm, vs, k, full)];
    return [false, s.val];
  }
  if (tm.tag === 'App') {
    const spine = zonkSpine(tm.left, vs, k, full);
    return spine[0] ?
      [true, App(spine[1], tm.mode, zonk(tm.right, vs, k, full))] :
      [false, vapp(spine[1], tm.mode, evaluate(tm.right, vs))];
  }
  return [true, zonk(tm, vs, k, full)];
};
export const zonk = (tm: Term, vs: EnvV = Nil, k: Ix = 0, full: boolean = false): Term => {
  if (tm.tag === 'Meta') {
    const s = getMeta(tm.index);
    return s.tag === 'Solved' ? quote(s.val, k, full) : tm;
  }
  if (tm.tag === 'Pi')
    return Pi(tm.mode, tm.name, zonk(tm.type, vs, k, full), zonk(tm.body, Cons(VVar(k), vs), k + 1, full));
  if (tm.tag === 'Sigma')
    return Sigma(tm.name, zonk(tm.type, vs, k, full), zonk(tm.body, Cons(VVar(k), vs), k + 1, full));
  if (tm.tag === 'Let')
    return Let(tm.name, zonk(tm.type, vs, k, full), zonk(tm.val, vs, k, full), zonk(tm.body, Cons(VVar(k), vs), k + 1, full));
  if (tm.tag === 'Abs')
    return Abs(tm.mode, tm.name, zonk(tm.type, vs, k, full), zonk(tm.body, Cons(VVar(k), vs), k + 1, full));
  if (tm.tag === 'Pair')
    return Pair(zonk(tm.fst, vs, k, full), zonk(tm.snd, vs, k, full), zonk(tm.type, vs, k, full));
  if (tm.tag === 'Proj')
    return Proj(tm.proj, zonk(tm.term, vs, k, full));
  if (tm.tag === 'App') {
    const spine = zonkSpine(tm.left, vs, k, full);
    return spine[0] ?
      App(spine[1], tm.mode, zonk(tm.right, vs, k, full)) :
      quote(vapp(spine[1], tm.mode, evaluate(tm.right, vs)), k, full);
  }
  return tm;
};

export const showVal = (v: Val, k: Ix = 0, full: boolean = false) => show(quote(v, k, full));
export const showValZ = (v: Val, vs: EnvV = Nil, k: Ix = 0, full: boolean = false) => show(zonk(quote(v, k, full), vs, k, full));
