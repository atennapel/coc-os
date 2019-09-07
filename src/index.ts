import { abs, Type, Var, showTerm } from './terms';
import { nf } from './nbe';
import { typecheck } from './typecheck';

const term = abs([Type(0), Var(0)], Var(0));
console.log(showTerm(term));
console.log(showTerm(typecheck(term)));
console.log(showTerm(nf(term)));
