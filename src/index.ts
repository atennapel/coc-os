// @ts-ignore
import { Pi, Type, Abs, Var, App, Fix, Roll, Unroll, showTerm, Meta, Term, Global } from './rewrite/core/syntax';
import * as U from './rewrite/untyped/syntax'
import * as UD from './rewrite/untyped/domain'
import { typecheck } from './rewrite/core/typecheck';
import { Nil } from './list';
import { normalize, evaluate } from './rewrite/core/domain';
import { globalSet, globalReset } from './rewrite/core/globalenv';

const E: Meta = { erased: true };
const R: Meta = { erased: false };

// @ts-ignore
const tid = Pi(E, Type, Pi(R, Var(0), Var(1)));
// @ts-ignore
const id = Abs(E, Type, Abs(R, Var(0), Var(0)));
// @ts-ignore
const tsnat = Fix(Type, Pi(E, Type, Pi(R, Var(0), Pi(R, Pi(R, Var(2), Var(2)), Var(2)))));
// @ts-ignore
const sz = Roll(tsnat, Abs(E, Type, Abs(R, Var(0), Abs(R, Pi(R, tsnat, Var(2)), Var(1)))));
// @ts-ignore
const N = (n: number): Term => { let x = Global('Z'); for (let i = 0; i < n; i++) x = App(Global('S'), R, x); return x };

globalReset();
globalSet('Nat', evaluate(Pi(E, Type, Pi(R, Var(0), Pi(R, Pi(R, Var(1), Var(2)), Var(2))))), evaluate(Type));
globalSet('Z', evaluate(Abs(E, Type, Abs(R, Var(0), Abs(R, Pi(R, Var(1), Var(2)), Var(1))))), evaluate(Global('Nat')));
globalSet('S', evaluate(Abs(R, Global('Nat'), Abs(E, Type, Abs(R, Var(0), Abs(R, Pi(R, Var(1), Var(2)), App(Var(0), R, App(App(App(Var(3), E, Var(2)), R, Var(1)), R, Var(0)))))))), evaluate(Pi(R, Global('Nat'), Global('Nat'))));
globalSet('add', evaluate(Abs(R, Global('Nat'), Abs(R, Global('Nat'), App(App(App(Var(1), E, Global('Nat')), R, Var(0)), R, Global('S'))))), evaluate(Pi(R, Global('Nat'), Pi(R, Global('Nat'), Global('Nat')))));
globalSet('mul', evaluate(Abs(R, Global('Nat'), Abs(R, Global('Nat'), App(App(App(Var(1), E, Global('Nat')), R, N(0)), R, App(Global('add'), R, Var(0)))))), evaluate(Pi(R, Global('Nat'), Pi(R, Global('Nat'), Global('Nat')))));
globalSet('pow', evaluate(Abs(R, Global('Nat'), Abs(R, Global('Nat'), App(App(App(Var(0), E, Global('Nat')), R, N(1)), R, App(Global('mul'), R, Var(1)))))), evaluate(Pi(R, Global('Nat'), Pi(R, Global('Nat'), Global('Nat')))));

const tm = App(App(Global('pow'), R, N(2)), R, N(7));
console.log(showTerm(tm));
console.log('types:');
const ty = typecheck(tm, Nil, Nil, 0, false);
console.log(showTerm(ty));
const ty2 = normalize(ty, Nil, 0, true);
console.log(showTerm(ty2));
console.log('normalized:');
const norm = normalize(tm, Nil, 0, false);
console.log(showTerm(norm));
const norm2 = normalize(tm, Nil, 0, true);
console.log(showTerm(norm2));
console.log('erased:');
const erased = U.erase(norm2);
console.log(U.showTerm(erased));
const erasedn = UD.normalize(erased, Nil, 0);
console.log(U.showTerm(erasedn));
