// @ts-ignore
import { Pi, Type, Abs, Var, App, Fix, Roll, Unroll, showTerm, erase } from './rewrite/core/syntax';
import * as U from './rewrite/untyped/syntax'
import * as UD from './rewrite/untyped/domain'
import { typecheck } from './rewrite/core/typecheck';
import { Nil } from './list';
import { normalize } from './rewrite/core/domain';

// @ts-ignore
const tid = Pi(Type, Pi(Var(0), Var(1)));
// @ts-ignore
const id = Abs(Type, Abs(Var(0), Var(0)));
// @ts-ignore
const tnat = Pi(Type, Pi(Var(0), Pi(Pi(Var(1), Var(2)), Var(2))));
// @ts-ignore
const z = Abs(Type, Abs(Var(0), Abs(Pi(Var(1), Var(2)), Var(1))));
// @ts-ignore
const s = Abs(tnat, Abs(Type, Abs(Var(0), Abs(Pi(Var(1), Var(2)), App(Var(0), App(App(App(Var(3), Var(2)), Var(1)), Var(0)))))));
// @ts-ignore
const nats: Term[] = [z]; for (let i = 0; i <= 10; i++) nats.push(App(s, nats[i]));
// @ts-ignore
const tsnat = Fix(Type, Pi(Type, Pi(Var(0), Pi(Pi(Var(2), Var(2)), Var(2)))));
// @ts-ignore
const sz = Roll(tsnat, Abs(Type, Abs(Var(0), Abs(Pi(tsnat, Var(2)), Var(1)))));
// @ts-ignore
const add = Abs(tnat, Abs(tnat, App(App(App(Var(1), tnat), Var(0)), s)));
// @ts-ignore
const mul = Abs(tnat, Abs(tnat, App(App(App(Var(1), tnat), z), App(add, Var(0)))));
// @ts-ignore
const pow = Abs(tnat, Abs(tnat, App(App(App(Var(0), tnat), App(s, z)), App(mul, Var(1)))));

const tm = App(Unroll(sz), Type);
console.log(showTerm(tm));
const ty = typecheck(tm, Nil, Nil, 0);
console.log(showTerm(ty));
const norm = normalize(tm, Nil, 0);
console.log(showTerm(norm));
const erased = erase(norm);
console.log(U.showTerm(erased));
const erasedn = UD.normalize(erased, Nil, 0);
console.log(U.showTerm(erasedn));
