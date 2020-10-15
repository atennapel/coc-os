import { Term } from './core';
import { Name } from './names';
import { Val } from './values';
import * as E from './erased';
import * as EV from './erasedvalues';

export type EnvGEntry = {
  erased: boolean,
  term: Term,
  val: Val,
  type: Val,
  termerased: E.Term,
  valerased: EV.Val,
};
export type EnvG = Map<Name, EnvGEntry>;

let env: EnvG = new Map();

export const resetGlobals = () => {
  env.clear();
};
export const getGlobals = (): EnvG => env;
export const getGlobal = (name: Name): EnvGEntry | null => env.get(name) || null;
export const hasGlobal = (name: Name): boolean => env.has(name);
export const setGlobal = (name: Name, erased: boolean, term: Term, val: Val, type: Val, termerased: E.Term, valerased: EV.Val): void => {
  if (env.has(name)) env.delete(name);
  env.set(name, { erased, term, val, type, termerased, valerased });
};
export const deleteGlobal = (name: Name): void => {
  env.delete(name);
};
