// @ts-ignore
import { Var, Abs, Type, showTerm, App, Pi } from './surface/terms';
import { typecheck } from './surface/typecheck';

/**
 * TODO:
 * - elaboration
 * - convert surface to core
 * - delaboration/redecoration
 */

const v = Var;

// const List = Abs('t', Type, false, Pi('r', Type, true, Pi('_', v('r'), false, Pi('_', Pi('_', v('t'), false, Pi('_', v('r'), false, v('r'))), false, v('r')))));

const id = Abs('t', Type, true, Abs('x', v('t'), false, v('x')));

try {
  const term = App(id, false, Type);
  console.log(showTerm(term));
  const [ty, tm] = typecheck(term);
  console.log(`${showTerm(tm)} : ${showTerm(ty)}`);
} catch (err) {
  console.log('' + err);
}
