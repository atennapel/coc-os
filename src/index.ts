import { nf } from './nbe';
import { typecheck } from './typecheck';
import { Type, showTerm } from './terms';
import { elaborate } from './elaboration';
// @ts-ignore
import { spi, sfun, SVar, showSTerm, toNameless, SAnn, sabs, sapp } from './surface';

/*
- annotated lambda in surface
- add fix
- add parser
- add constants
*/

const v = SVar;

const Nat = spi([['t', Type]], sfun(v('t'), sfun(v('t'), v('t')), v('t')));
const z = SAnn(sabs(['t', 'z', 's'], v('z')), Nat);
const s = SAnn(sabs(['n', 't', 'z', 's'], sapp(v('s'), sapp(v('n'), v('t'), v('z'), v('s')))), sfun(Nat, Nat));

const term = sapp(s, sapp(s, sapp(s, z)));
console.log(showSTerm(term));
const nm = toNameless(term);
console.log(showSTerm(nm));
const [tm, ty] = elaborate(nm);
console.log(`${showTerm(tm)} : ${showTerm(ty)}`);
console.log(showTerm(typecheck(tm)));
console.log(showTerm(nf(tm)));
