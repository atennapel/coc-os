import { List, map, contains, Cons, Nil, foldl, zipWith_, length } from '../list';
import { Val, force, EnvV, quote, evaluate, Head, fresh, VVar, vapp } from './vals';
import { Name, Meta, Term, showTerm, Abs, Type } from './terms';
import { terr, impossible } from '../util';

const checkSpine = (spine: List<Val>): List<Name> =>
  map(spine, v_ => {
    const v = force(v_);
    if (v.tag === 'VNe' && v.head.tag === 'Var')
      return v.head.name;
    return terr(`not a var in spine`);
  });

const checkSolution = (m: Meta, spine: List<Name>, tm: Term): void => {
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
    if (m === tm)
      return terr(`occurs check failed: ${showTerm(m)}`);
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
  return impossible(`checkSolution (${showTerm(m)}): non-normal term: ${showTerm(tm)}`);
};

const solve = (vs: EnvV, m: Meta, spine: List<Val>, val: Val): void => {
  const spinex = checkSpine(spine);
  const rhs = quote(val, vs);
  checkSolution(m, spinex, rhs);
  // TODO: solve with correct type for the parameters
  // although I don't think it matters at all
  m.val = evaluate(foldl((x, y) => Abs(y, Type, false, x), rhs, spinex), Nil);
};

const eqHead = (a: Head, b: Head): boolean =>
  a === b || (a.tag === 'Var' && b.tag === 'Var' && a.name === b.name);

export const unify = (vs: EnvV, a_: Val, b_: Val): void => {
  const a = force(a_);
  const b = force(b_);
  if (a.tag === 'Type' && b.tag === 'Type') return;
  if (a.tag === 'VAbs' && b.tag === 'VAbs' && a.impl === b.impl) {
    unify(vs, a.type, b.type);
    const x = fresh(vs, a.name);
    const vx = VVar(x);
    unify(Cons([x, true], vs), a.body(vx), b.body(vx));
    return;
  }
  if (a.tag === 'VPi' && b.tag === 'VPi' && a.impl === b.impl) {
    unify(vs, a.type, b.type);
    const x = fresh(vs, a.name);
    const vx = VVar(x);
    unify(Cons([x, true], vs), a.body(vx), b.body(vx));
    return;
  }
  if (a.tag === 'VAbs') {
    const x = fresh(vs, a.name);
    const vx = VVar(x);
    unify(Cons([x, true], vs), a.body(vx), vapp(b, a.impl, vx));
    return;
  }
  if (b.tag === 'VAbs') {
    const x = fresh(vs, b.name);
    const vx = VVar(x);
    unify(Cons([x, true], vs), vapp(a, b.impl, vx), b.body(vx));
    return;
  }
  if (a.tag === 'VNe' && b.tag === 'VNe' && a.head.tag === 'Var' && b.head.tag === 'Var' && eqHead(a.head, b.head))
    return zipWith_(([i, x], [j, y]) => unify(vs, x, y), a.args, b.args);
  if (a.tag === 'VNe' && b.tag === 'VNe' && a.head.tag === 'Meta' && b.head.tag === 'Meta')
    return length(a.args) > length(b.args) ?
      solve(vs, a.head, map(a.args, ([_, v]) => v), b) :
      solve(vs, b.head, map(b.args, ([_, v]) => v), a);
  if (a.tag === 'VNe' && a.head.tag === 'Meta')
    return solve(vs, a.head, map(a.args, ([_, v]) => v), b);
  if (b.tag === 'VNe' && b.head.tag === 'Meta')
    return solve(vs, b.head, map(b.args, ([_, v]) => v), a);
  const ta = quote(a, vs);
  const tb = quote(b, vs);
  return terr(`cannot unify: ${showTerm(ta)} ~ ${showTerm(tb)}`);
};
