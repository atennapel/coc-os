import { PrimName } from './core';
import { impossible } from './utils/utils';
import { V0, V1, Val, vappE, VB, VPiE, VType } from './values';

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

};

export const primType = (name: PrimName): Val => primTypes[name] || impossible(`primType: ${name}`);
