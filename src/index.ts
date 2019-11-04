// @ts-ignore
import { Var, Abs, Type, showTerm } from './surface/terms';
import { typecheck } from './surface/typecheck';
import { normalize } from './surface/vals';

/**
 * TODO:
 * - typechecking/elaboration
 * - convert surface to core
 * - delaboration/redecoration
 */

const v = Var;

try {
  const term = Abs('x', null, false, v('x'));
  console.log(showTerm(term));
  const ty = typecheck(term);
  console.log(showTerm(ty));
  const norm = normalize(term);
  console.log(showTerm(norm));
} catch (err) {
  console.log('' + err);
}
