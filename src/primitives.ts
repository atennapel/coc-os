import { PrimName } from './core';
import { impossible } from './utils/utils';
import { V0, V1, Val, vappE, VB, vheq, VPiE, vreflheq, VType } from './values';

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

};

export const primType = (name: PrimName): Val => primTypes[name] || impossible(`primType: ${name}`);
