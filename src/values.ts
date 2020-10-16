import { config } from './config';
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
export type VAbs = { tag: 'VAbs', mode: Mode, erased: boolean, name: Name, type: Val, clos: Clos };
export const VAbs = (mode: Mode, erased: boolean, name: Name, type: Val, clos: Clos): VAbs => ({ tag: 'VAbs', mode, erased, name, type, clos });
export type VPair = { tag: 'VPair', fst: Val, snd: Val, type: Val };
export const VPair = (fst: Val, snd: Val, type: Val): VPair => ({ tag: 'VPair', fst, snd, type });
export type VPi = { tag: 'VPi', mode: Mode, erased: boolean, name: Name, type: Val, clos: Clos };
export const VPi = (mode: Mode, erased: boolean, name: Name, type: Val, clos: Clos): VPi => ({ tag: 'VPi', mode, erased, name, type, clos });
export type VSigma = { tag: 'VSigma', erased: boolean, name: Name, type: Val, clos: Clos };
export const VSigma = (erased: boolean, name: Name, type: Val, clos: Clos): VSigma => ({ tag: 'VSigma', erased, name, type, clos });

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
export const VIDesc = VPrim('IDesc');
export const videsc = (i : Val) => vappE(VIDesc, i);
export const VIEnd = VPrim('IEnd');
export const VIArg = VPrim('IArg');
export const VIArgE = VPrim('IArgE');
export const VIFArg = VPrim('IFArg');
export const VIRec = VPrim('IRec');
export const VIHRec = VPrim('IHRec');
export const VIData = VPrim('IData');
export const vidata = (I: Val, d: Val, i: Val) => vappEs([VIData, I, d, i]);
export const VICon = VPrim('ICon');
export const vicon = (I: Val, d: Val, i: Val, x: Val) => vappEs([VICon, I, d, i, x]);
export const VInterpI = VPrim('InterpI');
export const vInterpI = (I: Val, d: Val, r: Val, i: Val) => velimprim('InterpI', d, [I, r, i]);
export const VAllI = VPrim('AllI');
export const vAllI = (I: Val, d: Val, X: Val, P: Val, i: Val, xs: Val) => velimprim('AllI', d, [I, X, P, i, xs]);

export const VPiE = (name: Name, type: Val, clos: Clos): VPi => VPi(Expl, false, name, type, clos);
export const VPiEE = (name: Name, type: Val, clos: Clos): VPi => VPi(Expl, true, name, type, clos);
export const VPiU = (name: Name, type: Val, clos: Clos): VPi => VPi(ImplUnif, false, name, type, clos);
export const VAbsE = (name: Name, type: Val, clos: Clos): VAbs => VAbs(Expl, false, name, type, clos);
export const VAbsEE = (name: Name, type: Val, clos: Clos): VAbs => VAbs(Expl, true, name, type, clos);
export const VAbsU = (name: Name, type: Val, clos: Clos): VAbs => VAbs(ImplUnif, false, name, type, clos);

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
export const vappEs = (a: Val[]): Val => a.reduce(vappE);
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
  if (name === 'elimIDesc') {
    const [,, end, arg, arge, farg, rec, hrec] = args;
    if (isVPrim('IEnd', v)) {
      // elimIDesc I P end arg farg rec hrec (IEnd I i) = end i
      const [, i] = vprimArgs(v);
      return vappE(end, i);
    }
    if (isVPrim('IArg', v)) {
      // elimIDesc I P end arg farg rec hrec (IArg I A f) = arg A f (\(a : A). elimIDesc ... (f a))
      const [, A, f] = vprimArgs(v);
      return vappEs([arg, A, f, VAbsE('a', A, a => velimprim('elimIDesc', vappE(f, a), args))]);
    }
    if (isVPrim('IArgE', v)) {
      // elimIDesc I P end arg arge farg rec hrec (IArgE I A f) = arge A f (\(-a : A). elimIDesc ... (f a))
      const [, A, f] = vprimArgs(v);
      return vappEs([arge, A, f, VAbsEE('a', A, a => velimprim('elimIDesc', vappE(f, a), args))]);
    }
    if (isVPrim('IFArg', v)) {
      // elimIDesc I P end arg farg rec hrec (IFArg I A d) = farg A d (elimIDesc ... d)
      const [, A, d] = vprimArgs(v);
      return vappEs([farg, A, d, velimprim('elimIDesc', d, args)]);
    }
    if (isVPrim('IRec', v)) {
      // elimIDesc I P end arg farg rec hrec (IRec I i d) = rec i d (elimIDesc ... d)
      const [, i, d] = vprimArgs(v);
      return vappEs([rec, i, d, velimprim('elimIDesc', d, args)]);
    }
    if (isVPrim('IHRec', v)) {
      // elimIDesc I P end arg farg rec hrec (IHRec I A f d) = rec A f d (elimIDesc ... d)
      const [, A, f, d] = vprimArgs(v);
      return vappEs([hrec, A, f, d, velimprim('elimIDesc', d, args)]);
    }
  }
  if (name === 'InterpI') {
    /*
    Interp : (I : *) -> IDesc I -> (I -> *) -> I -> *
    Interp I (IEnd I i) X j = i = j
    Interp I (IArg I A f) X j = (x : A) ** Interp I (f x) X j
    Interp I (IArgE I A f) X j = (-x : A) ** Interp I (f x) X j
    Interp I (IFArg I A d) X j = A ** Interp I d X j
    Interp I (IRec I i d) X j = X i ** Interp I d X j
    Interp I (IHRec I A f d) X j = ((a : A) -> X (f a)) ** Interp I d X j
    */
    const [I, X, j] = args;
    if (isVPrim('IEnd', v)) {
      const [, i] = vprimArgs(v);
      return vheq(I, I, i, j);
    }
    if (isVPrim('IArg', v)) {
      const [, A, f] = vprimArgs(v);
      return VSigma(false, 'x', A, x => velimprim('InterpI', vappE(f, x), args));
    }
    if (isVPrim('IArgE', v)) {
      const [, A, f] = vprimArgs(v);
      return VSigma(true, 'x', A, x => velimprim('InterpI', vappE(f, x), args));
    }
    if (isVPrim('IFArg', v)) {
      const [, A, d] = vprimArgs(v);
      return VSigma(false, '_', A, _ => velimprim('InterpI', d, args));
    }
    if (isVPrim('IRec', v)) {
      const [, i, d] = vprimArgs(v);
      return VSigma(false, '_', vappE(X, i), _ => velimprim('InterpI', d, args));
    }
    if (isVPrim('IHRec', v)) {
      const [, A, f, d] = vprimArgs(v);
      return VSigma(false, '_', VPiE('a', A, a => vappE(X, vappE(f, a))), _ => velimprim('InterpI', d, args));
    }
    // InterpretI I (elimB Pb f t b) X i ~> elimB * (InterpretI I f X i) (InterpretI I t X i) b
    if (v.tag === 'VNe' && v.spine.tag === 'Cons' && v.spine.head.tag === 'EPrim' && v.spine.head.name === 'elimB') {
      const head = v.spine.head;
      const f = head.args[1];
      const t = head.args[2];
      return velimprim('elimB', VNe(v.head, v.spine.tail), [VAbsE('_', VB, _ => VType), velimprim('InterpI', f, args), velimprim('InterpI', t, args)]);
    }
  }
  if (name === 'AllI') {
    /*
    AllI : (I : *) -> (d : IDesc I) -> (X : I -> *) -> (P : (i : I) -> X i -> *) -> (i : I) -> (xs : InterpI I d X i) -> *
    AllI I (IEnd I i) X P j () = U
    AllI I (IArg I A f) X P j (x, y) = AllI I (f x) X P j y
    AllI I (IArgE I A f) X P j (x, y) = AllI I (f x) X P j y
    AllI I (IFArg I A d) X P j (_, y) = AllI I d X P j y
    AllI I (IRec I i d) X P j (x, y) = P i x ** AllI I d X P j y
    AllI I (IHRec I A fi d) X P j (f, y) = ((a : A) -> P (fi a) (f a)) ** AllI I d X P j y
    */
    const [I, X, P, i, xs] = args;
    if (isVPrim('IEnd', v)) return VU;
    if (isVPrim('IArg', v)) {
      const [, , f] = vprimArgs(v);
      return velimprim('AllI', vappE(f, vproj('fst', xs)), [I, X, P, i, vproj('snd', xs)]);
    }
    if (isVPrim('IArgE', v)) {
      const [, , f] = vprimArgs(v);
      return velimprim('AllI', vappE(f, vproj('fst', xs)), [I, X, P, i, vproj('snd', xs)]);
    }
    if (isVPrim('IFArg', v)) {
      const [, , d] = vprimArgs(v);
      return velimprim('AllI', d, [I, X, P, i, vproj('snd', xs)]);
    }
    if (isVPrim('IRec', v)) {
      const [, j, d] = vprimArgs(v);
      return VSigma(false, '_', vappEs([P, j, vproj('fst', xs)]), _ => velimprim('AllI', d, [I, X, P, i, vproj('snd', xs)]));
    }
    if (isVPrim('IHRec', v)) {
      const [, A, fi, d] = vprimArgs(v);
      return VSigma(false, '_', VPiE('a', A, a => vappEs([P, vappE(fi, a), vappE(vproj('fst', xs), a)])), _ => velimprim('AllI', d, [I, X, P, i, vproj('snd', xs)]));
    }
  }
  if (name === 'allI') {
    /*
    allI : (I : *) -> (d : IDesc I) -> (X : I -> *) -> (P : (i : I) -> X i -> *) -> ((i : I) -> (x : X i) -> P i x) -> (i : I) -> (xs : InterpI I d X i) -> All I d X P i xs
    allI I (IEnd I i) X P p j () = ()
    allI I (IArg I A f) X P p j (x, y) = all (f x) X P p y
    allI I (IArgE I A f) X P p j (x, y) = all (f x) X P p y
    allI I (IFArg I A d) X P p j (_, y) = all d X P p y
    allI I (IRec A i d) X P p j (x, y) = (p i x, all d X P p y)
    allI I (IHRec A fi d) X P p j (f, y) = (\(h : A). p (fi h) (f h), all d X P p y)
    */
    const [I, X, P, p, i, xs] = args;
    if (isVPrim('IEnd', v)) return VUnit;
    if (isVPrim('IArg', v)) {
      const [, , f] = vprimArgs(v);
      return velimprim('allI', vappE(f, vproj('fst', xs)), [I, X, P, p, i, vproj('snd', xs)]);
    }
    if (isVPrim('IArgE', v)) {
      const [, , f] = vprimArgs(v);
      return velimprim('allI', vappE(f, vproj('fst', xs)), [I, X, P, p, i, vproj('snd', xs)]);
    }
    if (isVPrim('IFArg', v)) {
      const [, , d] = vprimArgs(v);
      return velimprim('allI', d, [I, X, P, p, i, vproj('snd', xs)]);
    }
    if (isVPrim('IRec', v)) {
      const [, i, d] = vprimArgs(v);
      return VPair(vappEs([p, i, vproj('fst', xs)]), velimprim('allI', d, [I, X, P, p, i, vproj('snd', xs)]), velimprim('AllI', v, [I, X, P, i, xs]));
    }
    if (isVPrim('IHRec', v)) {
      const [, A, fi, d] = vprimArgs(v);
      return VPair(VAbsE('h', A, h => vappEs([p, vappE(fi, h), vappE(vproj('fst', xs), h)])), velimprim('allI', d, [I, X, P, p, i, vproj('snd', xs)]), velimprim('AllI', v, [I, X, P, i, xs]));
    }
  }
  if (name === 'indI') {
    if (isVPrim('ICon', v)) {
      const [I, d, P, h, i] = args;
      const [, , , c] = vprimArgs(v);
      // ind I d P h i (ICon I d i c) ~> h i c (allI I d (IData I d) P (\(x : Data d). ind I d P h i x) i c)
      return vappEs([h, i, c, velimprim('allI', d, [I, vappEs([VIData, I, d]), P, VAbsEE('i', I, i => VAbsE('x', vidata(I, d, i), x => velimprim('indI', x, [I, d, P, h, i]))), i, c])]);
    }
  }
  if (v.tag === 'VNe') return VNe(v.head, Cons(EPrim(name, args), v.spine));
  if (v.tag === 'VGlobal')
    return VGlobal(v.head, Cons(EPrim(name, args), v.args), mapLazy(v.val, v => velimprim(name, v, args)));
  return impossible(`velimprim ${name}: ${v.tag}`);
};

export const VVoid = VPiE('t', VType, t => t);
export const VU = vheq(VType, VType, VVoid, VVoid);
export const VUnit = vreflheq(VType, VVoid);

export const evaluate = (t: Term, vs: EnvV): Val => {
  if (t.tag === 'Abs')
    return VAbs(t.mode, t.erased, t.name, evaluate(t.type, vs), v => evaluate(t.body, Cons(v, vs)));
  if (t.tag === 'Pair')
    return VPair(evaluate(t.fst, vs), evaluate(t.snd, vs), evaluate(t.type, vs));
  if (t.tag === 'Pi')
    return VPi(t.mode, t.erased, t.name, evaluate(t.type, vs), v => evaluate(t.body, Cons(v, vs)));
  if (t.tag === 'Sigma')
    return VSigma(t.erased, t.name, evaluate(t.type, vs), v => evaluate(t.body, Cons(v, vs)));
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
      return VAbsEE('P', VPiE('_', VB, _ => VType), P =>
        VAbsE('f', vappE(P, V0), f =>
        VAbsE('t', vappE(P, V1), t =>
        VAbsE('b', VB, b =>
        velimprim('elimB', b, [P, f, t])))));
    }
    if (t.name === 'elimHEq') {
      return VAbsEE('A', VType, A =>
        VAbsEE('a', A, a =>
        VAbsEE('P', VPiE('b', A, b => VPiE('_', vheq(A, A, a, b), _ => VType)), P =>
        VAbsE('h', vappE(vappE(P, a), vreflheq(A, a)), h =>
        VAbsEE('b', A, b =>
        VAbsEE('p', vheq(A, A, a, b), p =>
        velimprim('elimHEq', p, [A, a, P, h, b])))))));
    }
    if (t.name === 'elimIDesc') {
      return VAbsEE('I', VType, I =>
        VAbsEE('P', VPiE('_', videsc(I), _ => VType), P =>
        VAbsE('end', VPiEE('i', I, i => vappE(P, vappE(VIEnd, i))), end =>
        VAbsE('arg', VPiEE('A', VType, A => VPiE('f', VPiE('_', A, _ => videsc(I)), f => VPiE('_', VPiE('a', A, a => vappE(P, vappE(f, a))), _ => vappE(P, vappEs([VIArg, A, f]))))), arg =>
        VAbsE('arge', VPiEE('A', VType, A => VPiE('f', VPiEE('a', A, _ => videsc(I)), f => VPiE('_', VPiEE('a', A, a => vappE(P, vappE(f, a))), _ => vappE(P, vappEs([VIArgE, A, f]))))), arge =>
        VAbsE('farg', VPiEE('A', VType, A => VPiE('d', videsc(I), d => VPiE('_', vappE(P, d), _ => vappE(P, vappEs([VIFArg, A, d]))))), farg =>
        VAbsE('rec', VPiEE('i', I, i => VPiE('d', videsc(I), d => VPiE('_', vappE(P, d), _ => vappE(P, vappEs([VIRec, i, d]))))), rec =>
        VAbsE('hrec', VPiEE('A', VType, A => VPiE('f', VPiEE('_', A, _ => I), f => VPiE('d', videsc(I), d => VPiE('_', vappE(P, d), _ => vappE(P, vappEs([VIHRec, A, f, d])))))), hrec =>
        VAbsE('d', videsc(I), d =>
        velimprim('elimIDesc', d, [I, P, end, arg, arge, farg, rec, hrec]))))))))));
    }
    if (t.name === 'InterpI')
      return VAbsE('I', VType, I =>
        VAbsE('d', videsc(I), d =>
        VAbsE('r', VPiE('_', I, _ => VType), r =>
        VAbsE('i', I, i =>
        velimprim('InterpI', d, [I, r, i])))));
    if (t.name === 'AllI')
      return VAbsE('I', VType, I =>
        VAbsE('d', videsc(I), d =>
        VAbsE('X', VPiE('_', I, _ => VType), X =>
        VAbsE('P', VPiE('i', I, i => VPiE('_', vappE(X, i), _ => VType)), P =>
        VAbsE('i', I, i =>
        VAbsE('xs', vInterpI(I, d, X, i), xs =>
        velimprim('AllI', d, [I, X, P, i, xs])))))));
    if (t.name === 'allI') {
      return VAbsEE('I', VType, I =>
        VAbsE('d', videsc(I), d =>
        VAbsEE('X', VPiE('_', I, _ => VType), X =>
        VAbsEE('P', VPiE('i', I, i => VPiE('_', vappE(X, i), _ => VType)), P =>
        VAbsE('p', VPiEE('i', I, i => VPiE('x', vappE(X, i), x => vappEs([P, i, x]))), p =>
        VAbsEE('i', I, i =>
        VAbsE('xs', vInterpI(I, d, X, i), xs =>
        velimprim('allI', d, [I, X, P, p, i, xs]))))))));
    }
    if (t.name === 'indI') {
      return VAbsEE('I', VType, I =>
        VAbsE('d', videsc(I), d =>
        VAbsEE('P', VPiE('i', I, i => VPiE('_', vidata(I, d, i), _ => VType)), P =>
        VAbsE('h', VPiEE('i', I, i => VPiE('y', vInterpI(I, d, vappEs([VIData, I, d]), i), y => VPiE('_', vAllI(I, d, vappEs([VIData, I,]), P, i, y), _ => vappEs([P, i, vicon(I, d, i, y)])))), h =>
        VAbsEE('i', I, i =>
        VAbsE('x', vidata(I, d, i), x =>
        velimprim('indI', x, [I, d, P, h, i])))))));
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
  if (e.tag === 'EPrim') {
    if (e.name === 'InterpI' || e.name === 'AllI' || e.name === 'allI') {
      const first = quote(e.args[0], k, full);
      return e.args.slice(1).reduce((x, y) => AppE(x, quote(y, k, full)), AppE(AppE(Prim(e.name), first), t));
    }
    return AppE(e.args.reduce((x, y) => AppE(x, quote(y, k, full)), Prim(e.name) as Term), t);
  }
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
    if (full || config.unfold.includes(v.head)) return quote(forceLazy(v.val), k, full);
    return foldr(
      (x, y) => quoteElim(y, x, k, full),
      Global(v.head) as Term,
      v.args,
    );
  }
  if (v.tag === 'VPair')
    return Pair(quote(v.fst, k, full), quote(v.snd, k, full), quote(v.type, k, full));
  if (v.tag === 'VAbs')
    return Abs(v.mode, v.erased, v.name, quote(v.type, k, full), quote(vinst(v, VVar(k)), k + 1, full));
  if (v.tag === 'VPi')
    return Pi(v.mode, v.erased, v.name, quote(v.type, k, full), quote(vinst(v, VVar(k)), k + 1, full));
  if (v.tag === 'VSigma')
    return Sigma(v.erased, v.name, quote(v.type, k, full), quote(vinst(v, VVar(k)), k + 1, full));
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
    return Pi(tm.mode, tm.erased, tm.name, zonk(tm.type, vs, k, full), zonk(tm.body, Cons(VVar(k), vs), k + 1, full));
  if (tm.tag === 'Sigma')
    return Sigma(tm.erased, tm.name, zonk(tm.type, vs, k, full), zonk(tm.body, Cons(VVar(k), vs), k + 1, full));
  if (tm.tag === 'Let')
    return Let(tm.erased, tm.name, zonk(tm.type, vs, k, full), zonk(tm.val, vs, k, full), zonk(tm.body, Cons(VVar(k), vs), k + 1, full));
  if (tm.tag === 'Abs')
    return Abs(tm.mode, tm.erased, tm.name, zonk(tm.type, vs, k, full), zonk(tm.body, Cons(VVar(k), vs), k + 1, full));
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
