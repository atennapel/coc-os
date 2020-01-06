import { Name } from '../names';
import { List, map, contains, Cons, foldl, length, zipWithR_, lookup } from '../list';
import { Val, force, EnvV, quote, evaluate, showEnvV, VVar, vapp, freshName, emptyEnvV, extendV } from './vals';
import { terr, impossible } from '../util';
import { Term, showTerm, Type, Abs } from './syntax';
import { log } from '../config';
import { Nothing } from '../maybe';
import { TMetaId, setMeta } from './metas';
import { getEnv } from './env';

const checkSpine = (vs: EnvV, spine: List<[boolean, Val]>): List<[boolean, Name]> =>
  map(spine, ([i, v_]) => {
    const v = force(vs, v_);
    if (v.tag === 'VNe' && v.head.tag === 'HVar' && length(v.args) === 0)
      return [i, v.head.name];
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

const solve = (vs: EnvV, m: TMetaId, spine: List<[boolean, Val]>, val: Val): void => {
  const spinex = checkSpine(vs, spine);
  const rhs = quote(val, vs);
  checkSolution(vs, m, map(spinex, ([_, v]) => v), rhs);
  // Note: I'm solving with an abstraction that has * as type for all the parameters
  // TODO: I think it might actually matter
  const solution = evaluate(foldl((x, [i, y]) => Abs(y, i, Type, x), rhs, spinex), emptyEnvV);
  setMeta(m, solution);
};

const unifyFail = (vs: EnvV, a: Val, b: Val) => {
  const ta = quote(a, vs);
  const tb = quote(b, vs);
  return terr(`cannot unify: ${showTerm(ta)} ~ ${showTerm(tb)}`);
};

export const unify = (vs: EnvV, a_: Val, b_: Val): void => {
  const a = force(vs, a_);
  const b = force(vs, b_);
  log(() => `unify ${showTerm(quote(a, vs))} ~ ${showTerm(quote(b, vs))} in ${showEnvV(vs)}`);
  if (a.tag === 'VType' && b.tag === 'VType') return;
  if (a.tag === 'VAbs' && b.tag === 'VAbs' && a.impl === b.impl) {
    // TODO: type should probably be unified too, we might gain more information
    // but then meta should also be solved with the correct type
    // unify(vs, a.type, b.type);
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
  if (a.tag === 'VFix' && b.tag === 'VFix') {
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
    return zipWithR_(([i, x], [j, y]) => {
      if (i !== j) return unifyFail(vs, a, b);
      return unify(vs, x, y)
    }, a.args, b.args);
  if (a.tag === 'VNe' && b.tag === 'VNe' && a.head.tag === 'HMeta' && b.head.tag === 'HMeta')
    return length(a.args) > length(b.args) ?
      solve(vs, a.head.id, a.args, b) :
      solve(vs, b.head.id, b.args, a);
  if (a.tag === 'VNe' && a.head.tag === 'HMeta')
    return solve(vs, a.head.id, a.args, b);
  if (b.tag === 'VNe' && b.head.tag === 'HMeta')
    return solve(vs, b.head.id, b.args, a);
  return unifyFail(vs, a, b);
};
