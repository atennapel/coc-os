import { PrimName } from './core';
import { impossible } from './utils/utils';
import { V0, V1, Val, vappE, VB, VDesc, vheq, VPiE, vreflheq, VType, VRet, VRec, VArg, VFixD, VConD, vproj, descInterpretPackage } from './values';

const primTypes: { [K in PrimName]: Val } = {

  'Type': VType,

  'B': VType,
  '0': VB,
  '1': VB,
  // (P : %B -> Type) -> P %0 -> P %1 -> (b : %B) -> P b
  'elimB':
    VPiE('P', VPiE('_', VB, _ => VType), P =>
    VPiE('_', vappE(P, V0), _ =>
    VPiE('_', vappE(P, V1), _ =>
    VPiE('b', VB, b =>
    vappE(P, b))))),

  // (A : Type) -> (B : Type) -> A -> B -> Type
  'HEq': VPiE('A', VType, A => VPiE('B', VType, B => VPiE('_', A, _ => VPiE('_', B, _ => VType)))),
  // (A : Type) -> (a : A) -> HEq A A a a
  'ReflHEq': VPiE('A', VType, A => VPiE('a', A, a => vheq(A, A, a, a))),
  // (A : Type) -> (a : A) -> (P : (b : A) -> HEq A A a b -> Type) -> P a (ReflHEq A a) -> (b : A) -> (p : HEq A A a b) -> P b p
  'elimHEq':
    VPiE('A', VType, A =>
    VPiE('a', A, a =>
    VPiE('P', VPiE('b', A, b => VPiE('_', vheq(A, A, a, b), _ => VType)), P =>
    VPiE('_', vappE(vappE(P, a), vreflheq(A, a)), _ =>
    VPiE('b', A, b =>
    VPiE('p', vheq(A, A, a, b), p =>
    vappE(vappE(P, b), p))))))),

  'Desc': VType,
  'Ret': VDesc,
  'Rec': VPiE('_', VDesc, _ => VDesc),
  // (T : Type) -> (T -> Desc) -> Desc
  'Arg': VPiE('T', VType, T => VPiE('_', VPiE('_', T, _ => VDesc), _ => VDesc)),
  /*
    (P : Desc -> Type)
    -> P Ret
    -> ((r : Desc) -> P r -> P (Rec r))
    -> ((T : Type) -> (f : T -> Desc) -> ((x : T) -> P (f x)) -> P (Arg T f))
    -> (d : Desc)
    -> P d
  */
  'elimDesc':
    VPiE('P', VPiE('_', VDesc, _ => VType), P =>
    VPiE('_', vappE(P, VRet), _ =>
    VPiE('_', VPiE('r', VDesc, r => VPiE('_', vappE(P, r), _ => vappE(P, vappE(VRec, r)))), _ =>
    VPiE('_', VPiE('T', VType, T => VPiE('f', VPiE('_', T, _ => VDesc), f => VPiE('_', VPiE('x', T, x => vappE(P, vappE(f, x))), _ => vappE(P, vappE(vappE(VArg, T), f))))), _ =>
    VPiE('d', VDesc, d =>
    vappE(P, d)))))),

  // descInterpretPackage -> Desc -> Type
  'FixD': VPiE('_', descInterpretPackage, _ => VPiE('_', VDesc, _ => VType)),
  // (p : descInterpretPackage) -> (d: Desc) -> p.fst d (FixD p d) -> FixD p d
  'ConD': VPiE('p', descInterpretPackage, p => VPiE('d', VDesc, d => VPiE('_', vappE(vappE(vproj('fst', p), d), vappE(vappE(VFixD, p), d)), _ => vappE(vappE(VFixD, p), d)))),
  /*
    (p : descInterpretPackage)
    -> (D : Desc)
    -> (P : FixD p D -> Type)
    -> ((d : p.fst D (FixD p D)) -> p.snd.fst D (FixD p D) P d -> P (ConD p D d))
    -> (x : FixD p d)
    -> P x
  */
  'elimFixD':
    VPiE('p', descInterpretPackage, p =>
    VPiE('D', VDesc, D =>
    VPiE('P', VPiE('_', vappE(vappE(VFixD, p), D), _ => VType), P =>
    VPiE('_', VPiE('d', vappE(vappE(vproj('fst', p), D), vappE(vappE(VFixD, p), D)), d => VPiE('_', vappE(vappE(vappE(vappE(vproj('fst', vproj('snd', p)), D), vappE(vappE(VFixD, p), D)), P), d), _ => vappE(P, vappE(vappE(vappE(VConD, p), D), d)))), _ =>
    VPiE('x', vappE(vappE(VFixD, p), D), x =>
    vappE(P, x)))))),

};

export const primType = (name: PrimName): Val => primTypes[name] || impossible(`primType: ${name}`);
