import { Core } from './core';
import { Ix, Name } from './names';
import { impossible } from './utils/utils';
import { Val } from './values';

export interface GlobalEntry {
  readonly type: Val;
  readonly universe: Ix;
  readonly value: Val;
  readonly etype: Core;
  readonly term: Core;
  readonly erased: boolean;
}

export type Globals = { [key: string]: GlobalEntry };

let globals: Globals = {};

export const resetGlobals = (): void => { globals = {} };

export const getGlobal = (name: Name): GlobalEntry => {
  const entry = globals[name];
  if (!entry) return impossible(`undefined global in getGlobal: ${name}`);
  return entry;
};

export const getGlobals = (): Globals => globals;

export const setGlobal = (name: Name, type: Val, universe: Ix, value: Val, etype: Core, term: Core, erased: boolean): void => {
  globals[name] = { type, universe, value, etype, term, erased };
};

export const deleteGlobal = (name: Name): void => {
  delete globals[name];
};
