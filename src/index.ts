import { resetEnv, setEnv } from './rewrite/env';
import { evaluate, normalize } from './rewrite/values';
import { elaborate } from './rewrite/elaborate';
import { Nil } from './list';

// @ts-ignore
import { Pi, Type, Abs, Var, App, Ann, Global, showTerm } from './rewrite/syntax';

resetEnv();
setEnv(
  'List',
  evaluate(Abs('t', Type, Pi('r', Type, Pi('nil', Var(0), Pi('cons', Pi('head', Var(2), Pi('tail', Var(2), Var(3))), Var(2)))))),
  evaluate(Pi('_', Type, Type)),
);

const tm = App(App(Ann(Abs('t', Type, Abs('r', Type, Abs('nil', Var(0), Abs('cons', Pi('head', Var(2), Pi('tail', Var(2), Var(3))), Var(1))))), Pi('t', Type, App(Global('List'), Var(0)))), Type), Type);
console.log(showTerm(tm));
const ty = elaborate(tm);
console.log(showTerm(ty));
const norm1 = normalize(tm, Nil, 0, false);
console.log(showTerm(norm1));
const norm2 = normalize(tm, Nil, 0, true);
console.log(showTerm(norm2));
