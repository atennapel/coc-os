import { elaborate } from './elaboration';
import { Abs, App, Let, Pi, show, showCore, Type, Var } from './surface';
import * as C from './core';
import { Expl, ImplUnif } from './core';
import { normalize } from './values';
import { typecheck } from './typecheck';
import { setConfig } from './config';

setConfig({ debug: false });

const Impl = ImplUnif;

const term = Abs(Expl, 'A', Type, Abs(Expl, 'x', Var('A'), Let('tid', null, Pi(Impl, 't', Type, Pi(Expl, '_', Var('t'), Var('t'))), Let('id', Var('tid'), Abs(Expl, 'x', null, Var('x')), App(Var('id'), Expl, Var('x'))))));
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
const norm = normalize(eterm, true);
console.log(C.show(norm));
console.log(showCore(norm));
