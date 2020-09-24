import { elaborate } from './elaboration';
import { Abs, App, Let, Pi, show, showCore, Type, Var } from './surface';
import * as C from './core';
import { normalize } from './values';
import { typecheck } from './typecheck';

const term = Let('tid', null, Pi('t', Type, Pi('_', Var('t'), Var('t'))), Let('id', Var('tid'), Abs('t', null, Abs('x', null, Var('x'))), App(App(Var('id'), Var('tid')), Var('id'))))
console.log(show(term));

console.log('ELABORATE');
const [eterm, etype] = elaborate(term);
console.log(C.show(eterm));
console.log(showCore(eterm));
console.log(C.show(etype));
console.log(showCore(etype));

console.log('TYPECHECK');
const ttype = typecheck(eterm);
console.log(C.show(ttype));
console.log(showCore(ttype));

console.log('NORMALIZE');
const norm = normalize(eterm);
console.log(C.show(norm));
console.log(showCore(norm));
