import { Val, evaluate } from './vals';
import { Name } from '../names';
import { Abs, App, Var, Type, Pi } from './syntax';

export type EnvEntry = { val: Val, type: Val, opaque: boolean };
export type Env = { [key: string]: EnvEntry };

let env: Env = {};

export const resetEnv = () => {
  env = {};

  // ({x : *} -> ({r : *} -> (r -> x) -> f r -> x) -> x)
  // {f : * -> *} -> tmp -> f tmp
  // \{_} x. x {*} \{_} _ x. x
  const tmp = Pi('x', true, Type, Pi('_', false, Pi('r', true, Type, Pi('_', false, Pi('_', false, Var('r'), Var('x')), Pi('_', false, App(Var('f'), false, Var('r')), Var('x')))), Var('x')));
  env['unsafeOutM'] = {
    val: evaluate(Abs('_', true, Type, Abs('f', false, Type, App(App(Var('f'), true, Type), false, Abs('_', true, Type, Abs('_', false, Type, Abs('x', false, Type, Var('x')))))))),
    type: evaluate(Pi('f', true, Pi('_', false, Type, Type), Pi('_', false, tmp, App(Var('f'), false, tmp)))),
    opaque: false,
  };
  /*
  env['unsafeCast'] = {
    val: evaluate(Abs('a', true, Type, Abs('b', true, Type, Abs('x', false, Var('a'), Var('x'))))),
    type: evaluate(Pi('a', true, Type, Pi('b', true, Type, Pi('_', false, Var('a'), Var('b'))))),
    opaque: false,
  };
  */
};
export const getEnvMap = (): Env => env;
export const getEnv = (name: Name): EnvEntry | null =>
  env[name] || null;
export const setEnv = (name: Name, val: Val, type: Val, opaque: boolean = false): void => {
  env[name] = { val, type, opaque };
};
export const delEnv = (name: Name): void => {
  delete env[name];
};
