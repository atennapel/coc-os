import { Pi, showTerm, Type, Var } from './core/terms';
import { normalize } from './core/vals';

/**
 * TODO:
 * - let expressions, showTerm fix
 */

const term = Pi(Type, true, Pi(Var(0), false, Var(1)));
console.log(showTerm(term));
const norm = normalize(term);
console.log(showTerm(norm));
