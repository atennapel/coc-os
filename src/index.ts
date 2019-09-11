import { nf, evaluate } from './nbe';
import { typecheck, ConstEnv } from './typecheck';
import { elaborate } from './elaboration';
import { showETerm, erase } from './erased';
import { mapobj } from './util';

// @ts-ignore
import { spi, sfun, SVar, showSTerm, toNameless, SAnn, sabs, sapp, SFix } from './surface';
// @ts-ignore
import { Type, showTerm, fun, app, Const, Var, abs } from './terms';
import { parse } from './parser';

/*
- add meta variables
- add opaque types
*/

const v = SVar;

const Nat = spi([['t', Type]], sfun(v('t'), sfun(v('t'), v('t')), v('t')));
const z = SAnn(sabs(['t', 'z', 's'], v('z')), Nat);
const s = SAnn(sabs(['n', 't', 'z', 's'], sapp(v('s'), sapp(v('n'), v('t'), v('z'), v('s')))), sfun(Nat, Nat));

//const SNat = SFix('r', Type, spi([['t', Type]], sfun(v('t'), sfun(v('r'), v('t')), v('t'))));
//const sz = SAnn(sabs(['t', 'z', 's'], v('z')), SNat);
//const ss = SAnn(sabs(['n', 't', 'z', 's'], sapp(v('s'), v('n'))), sfun(SNat, SNat));

//const Id = SAnn(sabs(['t'], v('t')), sfun(Type, Type));
//const returnId = SAnn(sabs(['t', 'x'], v('x')), spi([['t', Type]], sfun(v('t'), sapp(Id, v('t')))));
//const bindId = SAnn(sabs(['a', 'b', 'f', 'x'], sapp(v('f'), v('x'))), spi([['a', Type], ['b', Type]], sfun(sfun(v('a'), sapp(Id, v('b'))), sapp(Id, v('a')), sapp(Id, v('b')))));

const b = Var;
const IO = Const('IO');
const cenv: ConstEnv = mapobj({
  IO: fun(Type, Type),
  // (t:*) -> t -> IO t
  returnIO: fun(Type, b(0), app(IO, b(1))),
  // (a:*) -> (b:*) -> (a -> IO b) -> IO a -> IO b
  // * -> * -> (1 -> IO 1) -> IO 2 -> IO 2
  bindIO: fun(Type, Type, fun(b(1), app(IO, b(1))), app(IO, b(2)), app(IO, b(2))),
}, evaluate);

const term = sapp(v('bindIO'), Nat, Nat, sabs(['n'], sapp(v('returnIO'), Nat, sapp(s, v('n')))), sapp(v('returnIO'), Nat, z));
// const term = sapp(bindId, Nat, Nat, sabs(['n'], sapp(returnId, Nat, sapp(s, v('n')))), sapp(returnId, Nat, z));
console.log(showSTerm(term));
const nm = toNameless(term);
console.log(showSTerm(nm));
const [tm, ty] = elaborate(nm, cenv);
console.log(`${showTerm(tm)} : ${showTerm(ty)}`);
console.log(showTerm(typecheck(tm, cenv)));
const normal = nf(tm);
console.log(showTerm(normal));
console.log(showETerm(erase(normal)));

console.log(showSTerm(parse('/t * -> t t c')));
