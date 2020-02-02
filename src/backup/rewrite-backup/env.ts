import { Val } from './values';
import { Name } from '../../names';

export type EnvEntry = { val: Val, type: Val };
export type Env = { [key: string]: EnvEntry };

let env: Env = {};

export const resetEnv = () => {
  env = {};
};
export const getEnvMap = (): Env => env;
export const getEnv = (name: Name): EnvEntry | null =>
  env[name] || null;
export const setEnv = (name: Name, val: Val, type: Val): void => {
  env[name] = { val, type };
};
export const delEnv = (name: Name): void => {
  delete env[name];
};
