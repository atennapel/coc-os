import { normalize } from './core/vals';
// @ts-ignore
import { Pi, showTerm, Type, Var, Let, Abs, App } from './core/terms';
// @ts-ignore
import { erase, showETerm } from './erased/terms';
import { typecheck } from './core/typecheck';

/**
 * TODO:
 * - surface language
 */

const v = Var;

const Nat = Pi(Type, true, Pi(v(0), false, Pi(Pi(v(1), false, v(2)), false, v(2))));
const z = Abs(Type, true, Abs(v(0), false, Abs(Pi(v(1), false, v(2)), false, v(1))));
const s = Abs(Nat, false, Abs(Type, true, Abs(v(0), false, Abs(Pi(v(1), false, v(2)), false, App(v(0), false, App(App(App(v(3), true, v(2)), false, v(1)), false, v(0)))))));

try {
  const term = App(s, false, App(s, false, App(s, false, z)));
  console.log(showTerm(term));
  const ty = typecheck(term);
  console.log(showTerm(ty));
  const norm = normalize(term);
  console.log(showTerm(norm));
  const erased = erase(term);
  console.log(showETerm(erased));
  const normerased = erase(norm);
  console.log(showETerm(normerased));
} catch (err) {
  console.log('' + err);
}
