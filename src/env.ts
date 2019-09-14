import { Name, freshName } from './names';
import { Val } from './values';
import { List, map, first } from './list';

export type EntryV = BoundV | DefV;
export type EnvV = List<EntryV>;

export interface BoundV {
  readonly tag: 'BoundV';
  readonly name: Name;
}
export const BoundV = (name: Name): BoundV => ({ tag: 'BoundV', name });

export interface DefV {
  readonly tag: 'DefV';
  readonly name: Name;
  readonly value: Val;
}
export const DefV = (name: Name, value: Val): DefV =>
  ({ tag: 'DefV', name, value });

export type EntryT = BoundT | DefT;
export type EnvT = List<EntryT>;

export interface BoundT {
  readonly tag: 'BoundT';
  readonly name: Name;
  readonly type: Val;
}
export const BoundT = (name: Name, type: Val): BoundT =>
  ({ tag: 'BoundT', name, type });

export interface DefT {
  readonly tag: 'DefT';
  readonly name: Name;
  readonly type: Val;
}
export const DefT = (name: Name, type: Val): DefT =>
  ({ tag: 'DefT', name, type });

export const fresh = (e: EnvV, x: Name): Name =>
  freshName(map(e, y => y.name), x);

export const lookupV = (l: EnvV, x: Name): EntryV | null =>
  first(l, e => e.name === x);
export const lookupT = (l: EnvT, x: Name): EntryT | null =>
  first(l, e => e.name === x);
