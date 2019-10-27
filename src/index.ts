import { Pi, showTerm, Type, Var } from './core/terms';

const term = Pi(Type, true, Pi(Var(0), false, Var(1)));
console.log(showTerm(term));
