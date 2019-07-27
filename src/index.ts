import { Var, abs, Star, showTerm, pi, app } from './terms';
import { normalize, whnf } from './normalization';
import { typecheck, HashEnv } from './typecheck';

const v = Var;

const I = abs([Star, v(0)], v(0));
// const K = abs([Star, Star], v(1));

// \(t:*).\(x:t).x : /(t:*)./(x:t).t
// \*.\0.0 : /*./0.1

const henv: HashEnv = {};

const term = app(I, pi([Star, v(0)], v(1)), I);
console.log(showTerm(term));
const ty = typecheck(term, henv);
console.log(showTerm(ty));
const nty = normalize(ty);
console.log(showTerm(nty));
const nf = normalize(term);
console.log(showTerm(nf));
const wnf = whnf(term);
console.log(showTerm(wnf));

/*
  - definitions in normalization (hashes)
*/
