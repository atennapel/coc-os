// @ts-ignore
import { Var, Abs, Type, showTerm, App } from './surface/terms';
import { typecheck } from './surface/typecheck';
import { normalize } from './surface/vals';

/**
 * TODO:
 * - zonk
 * - elaboration
 * - convert surface to core
 * - delaboration/redecoration
 */

const v = Var;

const id = Abs('t', Type, true, Abs('x', v('t'), false, v('x')));

try {
  const term = App(id, false, Type);
  console.log(showTerm(term));
  const ty = typecheck(term);
  console.log(showTerm(ty));
  const norm = normalize(term);
  console.log(showTerm(norm));
} catch (err) {
  console.log('' + err);
}
