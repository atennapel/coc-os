import { Term } from './core';
import { Name } from './names';
import { Val } from './values';

export type EnvGEntry = {
  term: Term,
  val: Val,
  type: Val,
};
export type EnvG = Map<Name, EnvGEntry>;

let env: EnvG = new Map();

export const resetGlobals = () => {
  env.clear();
};
export const getGlobals = (): EnvG => env;
export const getGlobal = (name: Name): EnvGEntry | null => env.get(name) || null;
export const setGlobal = (name: Name, term: Term, val: Val, type: Val): void => {
  env.set(name, { term, val, type });
};
export const deleteGlobal = (name: Name): void => {
  env.delete(name);
};
