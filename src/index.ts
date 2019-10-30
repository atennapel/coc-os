import { normalize } from './core/vals';
// @ts-ignore
import { Pi, showTerm, Type, Var, Let, Abs } from './core/terms';
// @ts-ignore
import { erase, showETerm } from './erased/terms';
import { typecheck } from './core/typecheck';

/**
 * TODO:
 * - typechecking
 */

const v = Var;

try {
  const term = Abs(Type, true, v(0));
  console.log(showTerm(term));
  const ty = typecheck(term);
  console.log(showTerm(ty));
  const norm = normalize(term);
  console.log(showTerm(norm));
  const erased = erase(term);
  console.log(showETerm(erased));
} catch (err) {
  console.log('' + err);
}
