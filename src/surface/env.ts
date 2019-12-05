import { Val } from './vals';
import { Name } from '../names';

export type EnvEntry = { val: Val, type: Val, opaque: boolean };
export type Env = { [key: string]: EnvEntry };

let env: Env = {};

export const resetEnv = () => { env = {} };
export const getEnvMap = (): Env => env;
export const getEnv = (name: Name): EnvEntry | null =>
  env[name] || null;
export const setEnv = (name: Name, val: Val, type: Val, opaque: boolean = false): void => {
  env[name] = { val, type, opaque };
};
export const delEnv = (name: Name): void => {
  delete env[name];
};
