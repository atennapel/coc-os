import { PrimName } from './core';
import { impossible } from './utils/utils';
import { V0, V1, Val, vappE, VB, vheq, VPiE, vreflheq, VType, VData, VDesc, vinterp, vdata, vcon, vAll, VEnd, VArg, VRec, vappEs } from './values';

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

  'Desc': VType,
  'End': VDesc,
  'Arg': VPiE('A', VType, A => VPiE('_', VPiE('_', A, _ => VDesc), _ => VDesc)),
  'Rec': VPiE('_', VType, _ => VPiE('_', VDesc, _ => VDesc)),
  /*
    (P : Desc -> *)
    -> P End
    -> ((A : *) -> (f : A -> Desc) -> ((a : A) -> P (f a)) -> P (Arg {A} f))
    -> ((A : *) -> (d : Desc) -> P d -> P (HRec A d))
    -> (d : Desc)
    -> P d
  */
  'elimDesc':
    VPiE('P', VPiE('_', VDesc, _ => VType), P =>
    VPiE('_', vappE(P, VEnd), _ =>
    VPiE('_', VPiE('A', VType, A => VPiE('f', VPiE('_', A, _ => VDesc), f => VPiE('_', VPiE('a', A, a => vappE(P, vappE(f, a))), _ => vappE(P, vappEs([VArg, A, f]))))), _ =>
    VPiE('_', VPiE('A', VType, A => VPiE('d', VDesc, d => VPiE('_', vappE(P, d), _ => vappE(P, vappEs([VRec, A, d]))))), _ =>
    VPiE('d', VDesc, d =>
    vappE(P, d)))))),
  'interp': VPiE('_', VDesc, _ => VPiE('_', VType, _ => VType)),
  // (d : Desc) -> (X : *) -> (P : X -> *) -> (xs : interp d X) -> *
  'All': VPiE('d', VDesc, d => VPiE('X', VType, X => VPiE('_', VPiE('_', X, _ => VType), _ => VPiE('_', vinterp(d, X), _ => VType)))),
  // (d : Desc) -> (X : *) -> (P : X -> *) -> ((x : X) -> P x) -> (xs : interp d X) -> All d X P xs
  'all': VPiE('d', VDesc, d => VPiE('X', VType, X => VPiE('P', VPiE('_', X, _ => VType), P => VPiE('_', VPiE('x', X, x => vappE(P, x)), _ => VPiE('xs', vinterp(d, X), xs => vAll(d, X, P, xs)))))),

  // Desc -> *
  'Data': VPiE('_', VDesc, _ => VType),
  // (d : Desc) -> interp d (Data d) -> Data d
  'Con': VPiE('d', VDesc, d => VPiE('_', vinterp(d, vdata(d)), _ => vdata(d))),
  /*
    (d : Desc)
    -> (P : Data d -> *)
    -> (
      (y : interp d (Data d))
      -> All d (Data d) P y
      -> P (Con d y)
    )
    -> (x : Data d)
    -> P x
  */
  'ind':
    VPiE('d', VDesc, d =>
    VPiE('P', VPiE('_', vappE(VData, d), _ => VType), P =>
    VPiE('_', VPiE('y', vinterp(d, vdata(d)), y => VPiE('_', vAll(d, vdata(d), P, y), _ => vappE(P, vcon(d, y)))), _ =>
    VPiE('x', vappE(VData, d), x =>
    vappE(P, x))))),

};

export const primType = (name: PrimName): Val => primTypes[name] || impossible(`primType: ${name}`);
