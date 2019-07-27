import { Var, abs, Star, showTerm, pi, app, Hash } from './terms';
import { normalize } from './normalization';
import { typecheck, HashEnv } from './typecheck';
import { serialize, deserialize } from './serialization';
import { hash } from './hashing';

const v = Var;

// const I = abs([Star, v(0)], v(0));
// const K = abs([Star, Star], v(1));

// \(t:*).\(x:t).x : /(t:*)./(x:t).t
// \*.\0.0 : /*./0.1

const henv: HashEnv = {
  id: { term: abs([Star, v(0)], v(0)), type: pi([Star, v(0)], v(1)) },
};

const term = app(Hash('id'), pi([Star, v(0)], v(1)), Hash('id'));
console.log(showTerm(term));
const ty = typecheck(term, henv);
console.log(showTerm(ty));
const nty = normalize(henv, ty);
console.log(showTerm(nty));
const nf = normalize(henv, term);
console.log(showTerm(nf));
const ser = serialize(nf);
console.log(ser.toString('hex'));
const deser = deserialize(ser);
console.log(showTerm(deser));
const hs = hash(nf);
console.log(hs.toString('hex'));
