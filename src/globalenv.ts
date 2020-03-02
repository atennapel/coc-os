import { Val } from './domain';
import { Val as CVal } from './core/domain';
import { Term as CTerm } from './core/syntax';
import { Term } from './syntax';
import { Name } from './names';

export type EnvGEntry = { term: Term, val: Val, type: Val, coreterm: CTerm, coreval: CVal, coretype: CVal };
export type EnvG = { [key: string]: EnvGEntry };

let env: EnvG = {};

export const globalReset = () => {
  env = {};
};
export const globalMap = (): EnvG => env;
export const globalGet = (name: Name): EnvGEntry | null =>
  env[name] || null;
export const globalSet = (name: Name, term: Term, val: Val, type: Val, coreterm: CTerm, coreval: CVal, coretype: CVal): void => {
  env[name] = { term, val, type, coreterm, coreval, coretype };
};
export const globalDelete = (name: Name): void => {
  delete env[name];
};
