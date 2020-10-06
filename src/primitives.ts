import { PrimName } from './core';
import { impossible } from './utils/utils';
import { V0, V1, Val, vappE, VB, vheq, VPiE, vreflheq, VType, vidata, vappEs, videsc, VIEnd, VIArg, VIFArg, VIRec, VIHRec, vinterpI, vAllI, VIData, vicon } from './values';

const primTypes: { [K in PrimName]: Val } = {

  'Type': VType,

  'B': VType,
  '0': VB,
  '1': VB,
  // (P : %B -> *) -> P %0 -> P %1 -> (b : %B) -> P b
  'elimB':
    VPiE('P', VPiE('_', VB, _ => VType), P =>
    VPiE('_', vappE(P, V0), _ =>
    VPiE('_', vappE(P, V1), _ =>
    VPiE('b', VB, b =>
    vappE(P, b))))),

  // (A : *) -> (B : *) -> A -> B -> *
  'HEq': VPiE('A', VType, A => VPiE('B', VType, B => VPiE('_', A, _ => VPiE('_', B, _ => VType)))),
  // (A : *) -> (a : A) -> HEq A A a a
  'ReflHEq': VPiE('A', VType, A => VPiE('a', A, a => vheq(A, A, a, a))),
  // (A : *) -> (a : A) -> (P : (b : A) -> HEq A A a b -> *) -> P a (ReflHEq A a) -> (b : A) -> (p : HEq A A a b) -> P b p
  'elimHEq':
    VPiE('A', VType, A =>
    VPiE('a', A, a =>
    VPiE('P', VPiE('b', A, b => VPiE('_', vheq(A, A, a, b), _ => VType)), P =>
    VPiE('_', vappE(vappE(P, a), vreflheq(A, a)), _ =>
    VPiE('b', A, b =>
    VPiE('p', vheq(A, A, a, b), p =>
    vappE(vappE(P, b), p))))))),

  'IDesc': VPiE('_', VType, _ => VType),
  'IEnd': VPiE('I', VType, I => VPiE('_', I, _ => videsc(I))),
  'IArg': VPiE('I', VType, I => VPiE('A', VType, A => VPiE('_', VPiE('_', A, _ => videsc(I)), _ => videsc(I)))),
  'IFArg': VPiE('I', VType, I => VPiE('_', VType, _ => VPiE('_', videsc(I), _ => videsc(I)))),
  'IRec': VPiE('I', VType, I => VPiE('_', I, _ => VPiE('_', videsc(I), _ => videsc(I)))),
  'IHRec': VPiE('I', VType, I => VPiE('A', VType, A => VPiE('_', VPiE('_', A, _ => I), _ => VPiE('_', videsc(I), _ => videsc(I))))),
  /*
    (I : *)
    -> (P : IDesc I -> *)
    -> ((i : I) -> P (IEnd i))
    -> ((A : *) -> (f : A -> IDesc I) -> ((a : A) -> P (f a)) -> P (IArg A f))
    -> ((A : *) -> (d : IDesc I) -> P d -> P (IFOArg A d))
    -> ((i : I) -> (d : IDesc I) -> P d -> P (IRec i d))
    -> ((A : *) -> (f : A -> I) -> (d : IDesc I) -> P d -> P (IHRec A f d))
    -> (d : IDesc I)
    -> P d
  */
  'elimIDesc':
    VPiE('I', VType, I =>
    VPiE('P', VPiE('_', videsc(I), _ => VType), P =>
    VPiE('_', VPiE('i', I, i => vappE(P, vappE(VIEnd, i))), _ =>
    VPiE('_', VPiE('A', VType, A => VPiE('f', VPiE('_', A, _ => videsc(I)), f => VPiE('_', VPiE('a', A, a => vappE(P, vappE(f, a))), _ =>vappE(P, vappEs([VIArg, A, f]))))), _ =>
    VPiE('_', VPiE('A', VType, A => VPiE('d', videsc(I), d => VPiE('_', vappE(P, d), _ => vappE(P, vappEs([VIFArg, A, d]))))), _ =>
    VPiE('_', VPiE('i', I, i => VPiE('d', videsc(I), d => VPiE('_', vappE(P, d), _ => vappE(P, vappEs([VIRec, i, d]))))), _ =>
    VPiE('_', VPiE('A', VType, A => VPiE('f', VPiE('_', A, _ => I), f => VPiE('d', videsc(I), d => VPiE('_', vappE(P, d), _ => vappE(P, vappEs([VIHRec, A, f, d])))))), _ =>
    VPiE('d', videsc(I), d =>
    vappE(P, d))))))))),
  // (I : *) -> IDesc I -> (I -> *) -> I -> *
  'interpI': VPiE('I', VType, I => VPiE('_', videsc(I), _ => VPiE('_', VPiE('_', I, _ => VType), _ => VPiE('_', I, _ => VType)))),
  // (I : *) -> (d : IDesc I) -> (X : I -> *) -> (P : (i : I) -> X i -> *) -> (i : I) -> (xs : interpI I d X i) -> *
  'AllI': VPiE('I', VType, I => VPiE('d', videsc(I), d => VPiE('X', VPiE('_', I, _ => VType), X => VPiE('_', VPiE('i', I, i => VPiE('_', vappE(X, i), _ => VType)), _ => VPiE('i', I, i => VPiE('_', vinterpI(I, d, X, i), _ => VType)))))),
  // (I : *) -> (d : IDesc I) -> (X : I -> *) -> (P : (i : I) -> X i -> *) -> ((i : I) -> (x : X i) -> P i x) -> (i : I) -> (xs : interpI I d X i) -> All I d X P i xs
  'allI':
    VPiE('I', VType, I =>
    VPiE('d', videsc(I), d =>
    VPiE('X', VPiE('_', I, _ => VType), X =>
    VPiE('P', VPiE('i', I, i => VPiE('_', vappE(X, i), _ => VType)), P =>
    VPiE('_', VPiE('i', I, i => VPiE('x', vappE(X, i), x => vappEs([P, i, x]))), _ =>
    VPiE('i', I, i =>
    VPiE('xs', vinterpI(I, d, X, i), xs =>
    vAllI(I, d, X, P, i, xs)))))))),

  // (I : *) -> IDesc I -> I -> *
  'IData': VPiE('I', VType, I => VPiE('_', videsc(I), _ => VPiE('_', I, _ => VType))),
  // (I : *) -> (d : IDesc I) -> (i : I) -> interpI I d (IData I d) i -> IData I d i
  'ICon': VPiE('I', VType, I => VPiE('d', videsc(I), d => VPiE('i', I, i => VPiE('_', vinterpI(I, d, vappEs([VIData, I, d]), i), _ => vidata(I, d, i))))),
  /*
    (I : *)
    -> (d : IDesc I)
    -> (P : (i : I) -> IData I d i -> *)
    -> (
      (i : I)
      -> (y : interpI I d (IData I d) i)
      -> AllI I d (IData I d) P i y
      -> P i (ICon I d i y)
    )
    -> (i : I)
    -> (x : IData I d i)
    -> P i x
  */
  'indI':
    VPiE('I', VType, I =>
    VPiE('d', videsc(I), d =>
    VPiE('P', VPiE('i', I, i => VPiE('_', vidata(I, d, i), _ => VType)), P =>
    VPiE('_', VPiE('i', I, i => VPiE('y', vinterpI(I, d, vappEs([VIData, I, d]), i), y => VPiE('_', vAllI(I, d, vappEs([VIData, I, d]), P, i, y), _ => vappEs([P, i, vicon(I, d, i, y)])))), _ =>
    VPiE('i', I, i =>
    VPiE('x', vidata(I, d, i), x =>
    vappEs([P, i, x]))))))),

};

export const primType = (name: PrimName): Val => primTypes[name] || impossible(`primType: ${name}`);
