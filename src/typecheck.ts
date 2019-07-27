import { List, index, Cons, Nil, toString, map } from './list';
import { Term, Star, eqTerm, showTerm, Pi } from './terms';
import { terr, impossible } from './util';
import { normalize, beta, shift } from './normalization';

export type Env = List<Term>;
export type HashEnv = { [key: string]: Term };

const showEnv = (env: Env): string => toString(env, showTerm);
const shiftEnv = (env: Env): Env => map(env, x => shift(1, 0, x));

const synth = (henv: HashEnv, env: Env, term: Term): Term => {
  console.log(`synth ${showTerm(term)} ${showEnv(env)}`);
  if (term.tag === 'Star') return Star;
  if (term.tag === 'Var')
    return index(env, term.id) || terr(`undefined var ${term.id}`);
  if (term.tag === 'Hash')
    return henv[term.hash] || terr(`undefined hash ${term.hash}`);
  if (term.tag === 'Abs') {
    check(henv, env, term.type, Star);
    const rty = synth(henv, shiftEnv(Cons(term.type, env)), term.body);
    const ty = Pi(term.type, rty);
    check(henv, env, ty, Star);
    return ty;
  }
  if (term.tag === 'Pi') {
    check(henv, env, term.type, Star);
    check(henv, shiftEnv(Cons(term.type, env)), term.body, Star);
    return Star;
  }
  if (term.tag === 'App') {
    const f = synth(henv, env, term.left);
    if (f.tag === 'Pi') {
      check(henv, env, term.right, f.type);
      return beta(f, term.right);
    }
    return terr(`not a function in ${showTerm(term)}`);
  }
  return impossible('synth');
};

const check = (henv: HashEnv, env: Env, term: Term, type: Term): Term => {
  console.log(`check ${showTerm(term)} : ${showTerm(type)} ${showEnv(env)}`);
  const type2 = synth(henv, env, term);
  const ntype = normalize(type);
  if (!eqTerm(normalize(type2), ntype))
    return terr(`expected ${showTerm(type)} but got ${showTerm(type2)}`);
  return ntype;
};

export const typecheck = (term: Term, henv: HashEnv = {}, env: Env = Nil): Term =>
  synth(henv, env, term);
