import { normalize } from './core/vals';
// @ts-ignore
import { Pi, showTerm, Type, Var, Let, Abs } from './core/terms';
// @ts-ignore
import { erase, showETerm } from './erased/terms';

/**
 * TODO:
 * - typechecking
 * - erasure
 */

const v = Var;

const term = Abs(Type, true, Abs(v(0), false, Abs(Type, true, Abs(v(0), false, v(2)))));
console.log(showTerm(term));
const norm = normalize(term);
console.log(showTerm(norm));
const erased = erase(term);
console.log(showETerm(erased));
