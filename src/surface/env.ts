import { Val } from './vals';
import { Name } from '../names';

export type Env = { [key: string]: [Val, Val] };

let env: Env = {};

export const resetEnv = () => { env = {} };
export const getEnv = (name: Name): [Val, Val] | null =>
  env[name] || null;
export const setEnv = (name: Name, val: Val, ty: Val): void => {
  env[name] = [val, ty];
};
