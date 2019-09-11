import { nf } from './nbe';
import { typecheck } from './typecheck';
import { Type, showTerm } from './terms';
import { elaborate } from './elaboration';
// @ts-ignore
import { spi, sfun, SVar, showSTerm, toNameless, SAnn, sabs, sapp, SFix } from './surface';
import { showETerm, erase } from './erased';

/*
- add constants
- add parser
*/

const v = SVar;

//const Nat = spi([['t', Type]], sfun(v('t'), sfun(v('t'), v('t')), v('t')));
//const z = SAnn(sabs(['t', 'z', 's'], v('z')), Nat);
//const s = SAnn(sabs(['n', 't', 'z', 's'], sapp(v('s'), sapp(v('n'), v('t'), v('z'), v('s')))), sfun(Nat, Nat));

const SNat = SFix('r', Type, spi([['t', Type]], sfun(v('t'), sfun(v('r'), v('t')), v('t'))));
const sz = SAnn(sabs(['t', 'z', 's'], v('z')), SNat);
const ss = SAnn(sabs(['n', 't', 'z', 's'], sapp(v('s'), v('n'))), sfun(SNat, SNat));

const term = sapp(ss, sapp(ss, sz));
console.log(showSTerm(term));
const nm = toNameless(term);
console.log(showSTerm(nm));
const [tm, ty] = elaborate(nm);
console.log(`${showTerm(tm)} : ${showTerm(ty)}`);
console.log(showTerm(typecheck(tm)));
const normal = nf(tm);
console.log(showTerm(normal));
console.log(showETerm(erase(normal)));
