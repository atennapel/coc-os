import { Val } from './domain';
import { Val as CVal } from './core/domain';
import { Term } from './syntax';
import { Name } from './names';

export type EnvGEntry = { term: Term, val: Val, type: Val, coreval: CVal, coretype: CVal };
export type EnvG = { [key: string]: EnvGEntry };

let env: EnvG = {};

export const globalReset = () => {
  env = {};
};
export const globalMap = (): EnvG => env;
export const globalGet = (name: Name): EnvGEntry | null =>
  env[name] || null;
export const globalSet = (name: Name, term: Term, val: Val, type: Val, coreval: CVal, coretype: CVal): void => {
  env[name] = { term, val, type, coreval, coretype };
};
export const globalDelete = (name: Name): void => {
  delete env[name];
};
