import { Name } from '../names';
import { List, map, contains, Cons, foldl, length, zipWith_, lookup } from '../list';
import { Val, force, EnvV, quote, evaluate, showEnvV, VVar, vapp, freshName, emptyEnvV, extendV } from './vals';
import { terr, impossible } from '../util';
import { Term, showTerm, Type, Abs } from './syntax';
import { log } from '../config';
import { Nothing } from '../maybe';
import { TMetaId, setMeta } from './metas';
import { getEnv } from './env';

const checkSpine = (vs: EnvV, spine: List<Val>): List<Name> =>
  map(spine, v_ => {
    const v = force(vs, v_);
    if (v.tag === 'VNe' && v.head.tag === 'HVar')
      return v.head.name;
    return terr(`not a var in spine`);
  });

const checkSolution = (vs: EnvV, m: TMetaId, spine: List<Name>, tm: Term): void => {
  if (tm.tag === 'Var') {
    if (contains(spine,  tm.name)) return;
    if (getEnv(tm.name)) {
      if (lookup(vs.vals, tm.name) !== null)
        return terr(`cannot solve with ${tm.name}, name is locally shadowed`);
      return;
    }
    return terr(`scope error ${tm.name}`);
  }
  if (tm.tag === 'App') {
    checkSolution(vs, m, spine, tm.left);
    checkSolution(vs, m, spine, tm.right);
    return;
  }
  if (tm.tag === 'Type') return;
  if (tm.tag === 'Meta') {
    if (m === tm.id)
      return terr(`occurs check failed: ${showTerm(tm)}`);
    return;
  }
  if (tm.tag === 'Abs' && tm.type) {
    checkSolution(vs, m, spine, tm.type);
    checkSolution(vs, m, Cons(tm.name, spine), tm.body);
    return;
  }
  if (tm.tag === 'Pi') {
    checkSolution(vs, m, spine, tm.type);
    checkSolution(vs, m, Cons(tm.name, spine), tm.body);
    return;
  }
  return impossible(`checkSolution (?${m}): non-normal term: ${showTerm(tm)}`);
};

const solve = (vs: EnvV, m: TMetaId, spine: List<Val>, val: Val): void => {
  const spinex = checkSpine(vs, spine);
  const rhs = quote(val, vs);
  checkSolution(vs, m, spinex, rhs);
  // Note: I'm solving with an abstraction that has * as type for all the parameters,
  // with all parameters being explicit.
  // I think this doesn't matter because this abstraction is applied immediately.
  // TODO: I think it might actually matter.
  const solution = evaluate(foldl((x, y) => Abs(y, false, Type, x), rhs, spinex), emptyEnvV);
  setMeta(m, solution);
};

export const unify = (vs: EnvV, a_: Val, b_: Val): void => {
  const a = force(vs, a_);
  const b = force(vs, b_);
  log(() => `unify ${showTerm(quote(a, vs))} ~ ${showTerm(quote(b, vs))} in ${showEnvV(vs)}`);
  if (a.tag === 'VType' && b.tag === 'VType') return;
  if (a.tag === 'VAbs' && b.tag === 'VAbs' && a.impl === b.impl) {
    unify(vs, a.type, b.type);
    const x = freshName(vs, a.name);
    const vx = VVar(x);
    unify(extendV(vs, x, Nothing), a.body(vx), b.body(vx));
    return;
  }
  if (a.tag === 'VPi' && b.tag === 'VPi' && a.impl === b.impl) {
    unify(vs, a.type, b.type);
    const x = freshName(vs, a.name);
    const vx = VVar(x);
    unify(extendV(vs, x, Nothing), a.body(vx), b.body(vx));
    return;
  }
  if (a.tag === 'VAbs' && b.tag !== 'VAbs') {
    const x = freshName(vs, a.name);
    const vx = VVar(x);
    unify(extendV(vs, x, Nothing), a.body(vx), vapp(b, a.impl, vx));
    return;
  }
  if (b.tag === 'VAbs' && a.tag !== 'VAbs') {
    const x = freshName(vs, b.name);
    const vx = VVar(x);
    unify(extendV(vs, x, Nothing), vapp(a, b.impl, vx), b.body(vx));
    return;
  }
  if (a.tag === 'VNe' && b.tag === 'VNe' && a.head.tag === 'HVar' &&
    b.head.tag === 'HVar' && a.head.name === b.head.name && length(a.args) === length(b.args))
    // TODO: unify in reverse
    return zipWith_(([i, x], [j, y]) => unify(vs, x, y), a.args, b.args);
  if (a.tag === 'VNe' && b.tag === 'VNe' && a.head.tag === 'HMeta' && b.head.tag === 'HMeta')
    return length(a.args) > length(b.args) ?
      solve(vs, a.head.id, map(a.args, ([_, v]) => v), b) :
      solve(vs, b.head.id, map(b.args, ([_, v]) => v), a);
  if (a.tag === 'VNe' && a.head.tag === 'HMeta')
    return solve(vs, a.head.id, map(a.args, ([_, v]) => v), b);
  if (b.tag === 'VNe' && b.head.tag === 'HMeta')
    return solve(vs, b.head.id, map(b.args, ([_, v]) => v), a);
  const ta = quote(a, vs);
  const tb = quote(b, vs);
  return terr(`cannot unify: ${showTerm(ta)} ~ ${showTerm(tb)}`);
};
