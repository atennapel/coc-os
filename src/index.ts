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
const tnat = Pi(E, Type, Pi(R, Var(0), Pi(R, Pi(R, Var(1), Var(2)), Var(2))));
// @ts-ignore
const z = Abs(E, Type, Abs(R, Var(0), Abs(R, Pi(R, Var(1), Var(2)), Var(1))));
// @ts-ignore
const s = Abs(R, tnat, Abs(E, Type, Abs(R, Var(0), Abs(R, Pi(R, Var(1), Var(2)), App(Var(0), R, App(App(App(Var(3), E, Var(2)), R, Var(1)), R, Var(0)))))));
// @ts-ignore
const nats: Term[] = [z]; for (let i = 0; i <= 10; i++) nats.push(App(s, R, nats[i]));
// @ts-ignore
const tsnat = Fix(Type, Pi(E, Type, Pi(R, Var(0), Pi(R, Pi(R, Var(2), Var(2)), Var(2)))));
// @ts-ignore
const sz = Roll(tsnat, Abs(E, Type, Abs(R, Var(0), Abs(R, Pi(R, tsnat, Var(2)), Var(1)))));
// @ts-ignore
const add = Abs(R, tnat, Abs(R, tnat, App(App(App(Var(1), E, tnat), R, Var(0)), R, s)));
// @ts-ignore
const mul = Abs(R, tnat, Abs(R, tnat, App(App(App(Var(1), E, tnat), R, z), R, App(add, R, Var(0)))));
// @ts-ignore
const pow = Abs(R, tnat, Abs(R, tnat, App(App(App(Var(0), E, tnat), R, nats[1]), R, App(mul, R, Var(1)))));

globalReset();
globalSet('Nat', evaluate(Pi(E, Type, Pi(R, Var(0), Pi(R, Pi(R, Var(1), Var(2)), Var(2))))), evaluate(Type));
globalSet('Z', evaluate(Abs(E, Type, Abs(R, Var(0), Abs(R, Pi(R, Var(1), Var(2)), Var(1))))), evaluate(Global('Nat')));
globalSet('S', evaluate(Abs(R, tnat, Abs(E, Type, Abs(R, Var(0), Abs(R, Pi(R, Var(1), Var(2)), App(Var(0), R, App(App(App(Var(3), E, Var(2)), R, Var(1)), R, Var(0)))))))), evaluate(Pi(R, Global('Nat'), Global('Nat'))));
globalSet('add', evaluate(Abs(R, tnat, Abs(R, tnat, App(App(App(Var(1), E, tnat), R, Var(0)), R, s)))), evaluate(Pi(R, Global('Nat'), Pi(R, Global('Nat'), Global('Nat')))));

const tm = App(Global('add'), R, App(Global('S'), R, Global('Z')));
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
