import { setConfig } from './config';
import { Abs, App, Let, Pi, show, Type, Var } from './core';
import { typecheck } from './typecheck';
import { normalize } from './values';

setConfig({ debug: true });

const term = Let('tid', Type, Pi('t', Type, Pi('x', Var(0), Var(1))), Let('id', Var(0), Abs('t', Type, Abs('x', Var(0), Var(0))), App(App(Var(0), Var(1)), Var(0))));
console.log(show(term));

const type = typecheck(term);
console.log(show(type));

const norm = normalize(term);
console.log(show(norm));
