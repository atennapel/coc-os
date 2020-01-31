// @ts-ignore
import { Pi, Type, Abs, Var, App, Fix, Roll, Unroll, showTerm, erase, Meta, Term } from './rewrite/core/syntax';
import * as U from './rewrite/untyped/syntax'
import * as UD from './rewrite/untyped/domain'
import { typecheck } from './rewrite/core/typecheck';
import { Nil } from './list';
import { normalize } from './rewrite/core/domain';

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

const tm = App(nats[2], R, Type);
console.log(showTerm(tm));
const ty = typecheck(tm, Nil, Nil, 0);
console.log(showTerm(ty));
const norm = normalize(tm, Nil, 0);
console.log(showTerm(norm));
const erased = erase(norm);
console.log(U.showTerm(erased));
const erasedn = UD.normalize(erased, Nil, 0);
console.log(U.showTerm(erasedn));
