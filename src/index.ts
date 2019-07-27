import { Var, abs, Star, app, showTerm } from './terms';
import { normalize, whnf } from './normalization';

const v = Var;

const I = abs([Star], v(0));
const K = abs([Star, Star], v(1));

const term = app(K, I);
console.log(showTerm(term));
const nf = normalize(term);
console.log(showTerm(nf));
const wnf = whnf(term);
console.log(showTerm(wnf));
