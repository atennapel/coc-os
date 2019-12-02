import { Name, freshName } from '../names';
import { List, map, contains, Cons, foldl, Nil, length, zipWith_ } from '../list';
import { Val, force, EnvV, quote, evaluate, showEnvV, VVar, vapp } from './vals';
import { terr, impossible } from '../util';
import { Term, showTerm, Type, Abs } from './syntax';
import { log } from '../config';
import { Nothing } from '../maybe';
import { TMetaId, setMeta } from './metas';

const checkSpine = (spine: List<Val>): List<Name> =>
  map(spine, v_ => {
    const v = force(v_);
    if (v.tag === 'VNe' && v.head.tag === 'HVar')
      return v.head.name;
    return terr(`not a var in spine`);
  });

const checkSolution = (m: TMetaId, spine: List<Name>, tm: Term): void => {
  if (tm.tag === 'Var') {
    if (!contains(spine,  tm.name))
      return terr(`scope error ${tm.name}`);
    return;
  }
  if (tm.tag === 'App') {
    checkSolution(m, spine, tm.left);
    checkSolution(m, spine, tm.right);
    return;
  }
  if (tm.tag === 'Type') return;
  if (tm.tag === 'Meta') {
    if (m === tm.id)
      return terr(`occurs check failed: ${showTerm(tm)}`);
    return;
  }
  if (tm.tag === 'Abs' && tm.type) {
    checkSolution(m, spine, tm.type);
    checkSolution(m, Cons(tm.name, spine), tm.body);
    return;
  }
  if (tm.tag === 'Pi') {
    checkSolution(m, spine, tm.type);
    checkSolution(m, Cons(tm.name, spine), tm.body);
    return;
  }
  return impossible(`checkSolution (?${m}): non-normal term: ${showTerm(tm)}`);
};

const solve = (vs: EnvV, m: TMetaId, spine: List<Val>, val: Val): void => {
  const spinex = checkSpine(spine);
  const rhs = quote(val, vs);
  checkSolution(m, spinex, rhs);
  const solution = evaluate(foldl((x, y) => Abs(y, Type, x), rhs, spinex), Nil);
  setMeta(m, solution);
};

export const unify = (vs: EnvV, a_: Val, b_: Val): void => {
  const a = force(a_);
  const b = force(b_);
  log(() => `unify ${showTerm(quote(a, vs))} ~ ${showTerm(quote(b, vs))} in ${showEnvV(vs)}`);
  if (a.tag === 'VType' && b.tag === 'VType') return;
  if (a.tag === 'VAbs' && b.tag === 'VAbs') {
    unify(vs, a.type, b.type);
    const x = freshName(vs, a.name);
    const vx = VVar(x);
    unify(Cons([x, Nothing], vs), a.body(vx), b.body(vx));
    return;
  }
  if (a.tag === 'VPi' && b.tag === 'VPi') {
    unify(vs, a.type, b.type);
    const x = freshName(vs, a.name);
    const vx = VVar(x);
    unify(Cons([x, Nothing], vs), a.body(vx), b.body(vx));
    return;
  }
  if (a.tag === 'VAbs') {
    const x = freshName(vs, a.name);
    const vx = VVar(x);
    unify(Cons([x, Nothing], vs), a.body(vx), vapp(b, vx));
    return;
  }
  if (b.tag === 'VAbs') {
    const x = freshName(vs, b.name);
    const vx = VVar(x);
    unify(Cons([x, Nothing], vs), vapp(a, vx), b.body(vx));
    return;
  }
  if (a.tag === 'VNe' && b.tag === 'VNe' && a.head.tag === 'HVar' && b.head.tag === 'HVar' && a.head.name === b.head.name)
    return zipWith_((x, y) => unify(vs, x, y), a.args, b.args);
  if (a.tag === 'VNe' && b.tag === 'VNe' && a.head.tag === 'HMeta' && b.head.tag === 'HMeta')
    return length(a.args) > length(b.args) ?
      solve(vs, a.head.id, a.args, b) :
      solve(vs, b.head.id, b.args, a);
  if (a.tag === 'VNe' && a.head.tag === 'HMeta')
    return solve(vs, a.head.id, a.args, b);
  if (b.tag === 'VNe' && b.head.tag === 'HMeta')
    return solve(vs, b.head.id, b.args, a);
  const ta = quote(a, vs);
  const tb = quote(b, vs);
  return terr(`cannot unify: ${showTerm(ta)} ~ ${showTerm(tb)}`);
};
