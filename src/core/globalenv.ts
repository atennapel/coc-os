import { Val } from './domain';
import { Term } from './syntax';
import { Name } from '../names';

export type EnvGEntry = { term: Term, val: Val, type: Val };
export type EnvG = { [key: string]: EnvGEntry };

let env: EnvG = {};

export const globalReset = () => {
  env = {};
};
export const globalMap = (): EnvG => env;
export const globalGet = (name: Name): EnvGEntry | null =>
  env[name] || null;
export const globalSet = (term: Term, name: Name, val: Val, type: Val): void => {
  env[name] = { term, val, type };
};
export const globalDelete = (name: Name): void => {
  delete env[name];
};
