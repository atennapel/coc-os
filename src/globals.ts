import { Core } from './core';
import { Erased } from './erased';
import { Name } from './names';
import { impossible } from './utils/utils';
import { Val } from './values';
import * as E from './erased';

export interface GlobalEntry {
  readonly type: Val;
  readonly value: Val;
  readonly term: Core;
  readonly erasedTerm: [Erased, E.Val] | null;
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

export const setGlobal = (name: Name, type: Val, value: Val, term: Core, erasedTerm: [Erased, E.Val] | null): void => {
  globals[name] = { type, value, term, erasedTerm };
};

export const deleteGlobal = (name: Name): void => {
  delete globals[name];
};
