import { CVar, CType, CHash } from './terms';
import { List, Nil } from '../list';
import { Ix } from '../names';
import { HashStr } from '../hash';

export type CVal = CVNe | CVAbs | CVPi | CType;

export type CHead = CVar | CHash;

export interface CVNe {
  readonly tag: 'CVNe';
  readonly head: CHead;
  readonly args: List<CVal>;
}
export const CVNe = (head: CHead, args: List<CVal> = Nil): CVNe =>
  ({ tag: 'CVNe', head, args });
export const CVVar = (index: Ix): CVNe => CVNe(CVar(index), Nil);
export const CVHash = (hash: HashStr): CVNe => CVNe(CHash(hash), Nil);

export type CClos = (value: CVal) => CVal;

export interface CVAbs {
  readonly tag: 'CVAbs';
  readonly type: CVal;
  readonly body: CClos;
}
export const CVAbs = (type: CVal, body: CClos): CVAbs =>
  ({ tag: 'CVAbs', type, body });

export interface CVPi {
  readonly tag: 'CVPi';
  readonly type: CVal;
  readonly body: CClos;
}
export const CVPi = (type: CVal, body: CClos): CVPi =>
  ({ tag: 'CVPi', type, body });
