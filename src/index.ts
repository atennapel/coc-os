import { Pi, showTerm, Type, Var, Let } from './core/terms';
import { normalize } from './core/vals';

/**
 * TODO:
 * - typechecking
 * - erasure
 */

const term = Let(Type, true, Pi(Type, true, Pi(Var(0), false, Var(1))), Var(0));
console.log(showTerm(term));
const norm = normalize(term);
console.log(showTerm(norm));
