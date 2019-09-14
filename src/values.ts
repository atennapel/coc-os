import { Type } from './terms';
import { List, Nil } from './list';
import { Name } from './names';

export type Val = VNe | VAbs | VPi | Type;

export type Head = Name;

export interface VNe {
  readonly tag: 'VNe';
  readonly head: Head;
  readonly args: List<Val>;
}
export const VNe = (head: Head, args: List<Val>): VNe =>
  ({ tag: 'VNe', head, args });
export const VVar = (name: Name): VNe => VNe(name, Nil);

export type Clos = (value: Val) => Val;

export interface VAbs {
  readonly tag: 'VAbs';
  readonly name: Name;
  readonly type: Val;
  readonly body: Clos;
}
export const VAbs = (name: Name, type: Val, body: Clos): VAbs =>
  ({ tag: 'VAbs', name, type, body });

export interface VPi {
  readonly tag: 'VPi';
  readonly name: Name;
  readonly type: Val;
  readonly body: Clos;
}
export const VPi = (name: Name, type: Val, body: Clos): VPi =>
  ({ tag: 'VPi', name, type, body });
