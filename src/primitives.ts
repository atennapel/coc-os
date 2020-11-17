import { PrimName } from './core';
import { impossible } from './utils/utils';
import { V0, V1, Val, vappE, VB, vheq, VPiE, vreflheq, VType, vidata, vappEs, videsc, VIEnd, VIArg, VIArgE, VIFArg, VIRec, VIHRec, vInterpI, vAllI, VIData, vicon, VPiEE } from './values';

const primTypes: { [K in PrimName]: () => Val } = {

  'Type': () => VType,
  'Data': () => VType,

  'B': () => VType,
  '0': () => VB,
  '1': () => VB,
  // (-P : %B -> *) -> P %0 -> P %1 -> (b : %B) -> P b
  'elimB': () =>
    VPiEE('P', VPiE('_', VB, _ => VType), P =>
    VPiE('_', vappE(P, V0), _ =>
    VPiE('_', vappE(P, V1), _ =>
    VPiE('b', VB, b =>
    vappE(P, b))))),

  // (A : *) -> (B : *) -> A -> B -> *
  'HEq': () => VPiE('A', VType, A => VPiE('B', VType, B => VPiE('_', A, _ => VPiE('_', B, _ => VType)))),
  // (-A : *) -> (-a : A) -> HEq A A a a
  'ReflHEq': () => VPiEE('A', VType, A => VPiEE('a', A, a => vheq(A, A, a, a))),
  // (-A : *) -> (-a : A) -> (-P : (b : A) -> HEq A A a b -> *) -> P a (ReflHEq A a) -> (-b : A) -> (-p : HEq A A a b) -> P b p
  'elimHEq': () =>
    VPiEE('A', VType, A =>
    VPiEE('a', A, a =>
    VPiEE('P', VPiE('b', A, b => VPiE('_', vheq(A, A, a, b), _ => VType)), P =>
    VPiE('_', vappE(vappE(P, a), vreflheq(A, a)), _ =>
    VPiEE('b', A, b =>
    VPiEE('p', vheq(A, A, a, b), p =>
    vappE(vappE(P, b), p))))))),

  'IDesc': () => VPiE('_', VType, _ => VType),
  'IEnd': () => VPiEE('I', VType, I => VPiEE('_', I, _ => videsc(I))),
  'IArg': () => VPiEE('I', VType, I => VPiEE('A', VType, A => VPiE('_', VPiE('_', A, _ => videsc(I)), _ => videsc(I)))),
  'IArgE': () => VPiEE('I', VType, I => VPiEE('A', VType, A => VPiE('_', VPiEE('a', A, _ => videsc(I)), _ => videsc(I)))),
  'IFArg': () => VPiEE('I', VType, I => VPiEE('_', VType, _ => VPiE('_', videsc(I), _ => videsc(I)))),
  'IRec': () => VPiEE('I', VType, I => VPiEE('_', I, _ => VPiE('_', videsc(I), _ => videsc(I)))),
  'IHRec': () => VPiEE('I', VType, I => VPiEE('A', VType, A => VPiEE('_', VPiE('_', A, _ => I), _ => VPiE('_', videsc(I), _ => videsc(I))))),
  /*
    (-I : *)
    -> (-P : IDesc I -> *)
    -> ((-i : I) -> P (IEnd i))
    -> ((-A : *) -> (f : A -> IDesc I) -> ((a : A) -> P (f a)) -> P (IArg A f))
    -> ((-A : *) -> (f : (-a : A) -> IDesc I) -> ((-a : A) -> P (f a)) -> P (IArgE A f))
    -> ((-A : *) -> (d : IDesc I) -> P d -> P (IFOArg A d))
    -> ((-i : I) -> (d : IDesc I) -> P d -> P (IRec i d))
    -> ((-A : *) -> (-f : A -> I) -> (d : IDesc I) -> P d -> P (IHRec A f d))
    -> (d : IDesc I)
    -> P d
  */
  'elimIDesc': () =>
    VPiEE('I', VType, I =>
    VPiEE('P', VPiE('_', videsc(I), _ => VType), P =>
    VPiE('_', VPiEE('i', I, i => vappE(P, vappE(VIEnd, i))), _ =>
    VPiE('_', VPiEE('A', VType, A => VPiE('f', VPiE('_', A, _ => videsc(I)), f => VPiE('_', VPiE('a', A, a => vappE(P, vappE(f, a))), _ => vappE(P, vappEs([VIArg, A, f]))))), _ =>
    VPiE('_', VPiEE('A', VType, A => VPiE('f', VPiEE('a', A, _ => videsc(I)), f => VPiE('_', VPiEE('a', A, a => vappE(P, vappE(f, a))), _ => vappE(P, vappEs([VIArgE, A, f]))))), _ =>
    VPiE('_', VPiEE('A', VType, A => VPiE('d', videsc(I), d => VPiE('_', vappE(P, d), _ => vappE(P, vappEs([VIFArg, A, d]))))), _ =>
    VPiE('_', VPiEE('i', I, i => VPiE('d', videsc(I), d => VPiE('_', vappE(P, d), _ => vappE(P, vappEs([VIRec, i, d]))))), _ =>
    VPiE('_', VPiEE('A', VType, A => VPiEE('f', VPiE('_', A, _ => I), f => VPiE('d', videsc(I), d => VPiE('_', vappE(P, d), _ => vappE(P, vappEs([VIHRec, A, f, d])))))), _ =>
    VPiE('d', videsc(I), d =>
    vappE(P, d)))))))))),
  // (I : *) -> IDesc I -> (I -> *) -> I -> *
  'InterpI': () => VPiE('I', VType, I => VPiE('_', videsc(I), _ => VPiE('_', VPiE('_', I, _ => VType), _ => VPiE('_', I, _ => VType)))),
  // (I : *) -> (d : IDesc I) -> (X : I -> *) -> (P : (i : I) -> X i -> *) -> (i : I) -> (xs : InterpI I d X i) -> *
  'AllI': () => VPiE('I', VType, I => VPiE('d', videsc(I), d => VPiE('X', VPiE('_', I, _ => VType), X => VPiE('_', VPiE('i', I, i => VPiE('_', vappE(X, i), _ => VType)), _ => VPiE('i', I, i => VPiE('_', vInterpI(I, d, X, i), _ => VType)))))),
  // (-I : *) -> (d : IDesc I) -> (-X : I -> *) -> (-P : (i : I) -> X i -> *) -> ((-i : I) -> (x : X i) -> P i x) -> (-i : I) -> (xs : InterpI I d X i) -> All I d X P i xs
  'allI': () =>
    VPiEE('I', VType, I =>
    VPiE('d', videsc(I), d =>
    VPiEE('X', VPiE('_', I, _ => VType), X =>
    VPiEE('P', VPiE('i', I, i => VPiE('_', vappE(X, i), _ => VType)), P =>
    VPiE('_', VPiEE('i', I, i => VPiE('x', vappE(X, i), x => vappEs([P, i, x]))), _ =>
    VPiEE('i', I, i =>
    VPiE('xs', vInterpI(I, d, X, i), xs =>
    vAllI(I, d, X, P, i, xs)))))))),

  // (I : *) -> IDesc I -> I -> *
  'IData': () => VPiE('I', VType, I => VPiE('_', videsc(I), _ => VPiE('_', I, _ => VType))),
  // (-I : *) -> (-d : IDesc I) -> (-i : I) -> InterpI I d (IData I d) i -> IData I d i
  'ICon': () => VPiEE('I', VType, I => VPiEE('d', videsc(I), d => VPiEE('i', I, i => VPiE('_', vInterpI(I, d, vappEs([VIData, I, d]), i), _ => vidata(I, d, i))))),
  /*
    (-I : *)
    -> (d : IDesc I)
    -> (-P : (i : I) -> IData I d i -> *)
    -> (
      (-i : I)
      -> (y : InterpI I d (IData I d) i)
      -> AllI I d (IData I d) P i y
      -> P i (ICon I d i y)
    )
    -> (-i : I)
    -> (x : IData I d i)
    -> P i x
  */
  'indI': () =>
    VPiEE('I', VType, I =>
    VPiE('d', videsc(I), d =>
    VPiEE('P', VPiE('i', I, i => VPiE('_', vidata(I, d, i), _ => VType)), P =>
    VPiE('_', VPiEE('i', I, i => VPiE('y', vInterpI(I, d, vappEs([VIData, I, d]), i), y => VPiE('_', vAllI(I, d, vappEs([VIData, I, d]), P, i, y), _ => vappEs([P, i, vicon(I, d, i, y)])))), _ =>
    VPiEE('i', I, i =>
    VPiE('x', vidata(I, d, i), x =>
    vappEs([P, i, x]))))))),

};

export const primType = (name: PrimName): Val => {
  const v = primTypes[name];
  if (!v) return impossible(`primType: ${name}`);
  return v();
};
