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

const term = Abs(Type, true, Abs(Type, true, Abs(v(1), false, Abs(v(1), false, v(1)))));
console.log(showTerm(term));
const norm = normalize(term);
console.log(showTerm(norm));
const erased = erase(term);
console.log(showETerm(erased));
