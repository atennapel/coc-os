import { log } from './config';
import { eqHead } from './conversion';
import { Abs, App, Pair, Pi, Proj, show, Sigma, Term, Var } from './core';
import { Ix } from './names';
import { Cons, contains, indexOf, isEmpty, length, List, listToString, map, Nil, toArray, zipWithR_ } from './utils/list';
import { hasDuplicates, impossible, terr, tryT } from './utils/utils';
import { Elim, force, Spine, Val, vapp, vproj, vinst, VVar, VMeta, quote, evaluate, showVal } from './values';
import * as V from './values';
import { getMeta, isMetaSolved, postpone, problemsBlockedBy, solveMeta, Unsolved } from './context';

const unifyElim = (k: Ix, a: Elim, b: Elim, x: Val, y: Val): void => {
  if (a === b) return;
  if (a.tag === 'EApp' && b.tag === 'EApp' && a.mode === b.mode) return unify(k, a.right, b.right);
  if (a.tag === 'EProj' && b.tag === 'EProj' && a.proj === b.proj) return;
  return terr(`unify failed (${k}): ${showVal(x, k)} ~ ${showVal(y, k)}`);
};
export const unify = (k: Ix, a_: Val, b_: Val): void => {
  const a = force(a_);
  const b = force(b_);
  log(() => `unify(${k}): ${showVal(a, k)} ~ ${showVal(b, k)}`);
  if (a === b) return;
  if (a.tag === 'VType' && b.tag === 'VType') return;
  if (a.tag === 'VPi' && b.tag === 'VPi' && a.mode === b.mode) {
    unify(k, a.type, b.type);
    const v = VVar(k);
    return unify(k + 1, vinst(a, v), vinst(b, v));
  }
  if (a.tag === 'VSigma' && b.tag === 'VSigma') {
    unify(k, a.type, b.type);
    const v = VVar(k);
    return unify(k + 1, vinst(a, v), vinst(b, v));
  }
  if (a.tag === 'VAbs' && b.tag === 'VAbs' && a.mode === b.mode) {
    const v = VVar(k);
    return unify(k + 1, vinst(a, v), vinst(b, v));
  }
  if (a.tag === 'VPair' && b.tag === 'VPair') {
    unify(k, a.fst, b.fst);
    return unify(k, a.snd, b.snd);
  }

  if (a.tag === 'VAbs') {
    const v = VVar(k);
    return unify(k + 1, vinst(a, v), vapp(b, a.mode, v));
  }
  if (b.tag === 'VAbs') {
    const v = VVar(k);
    return unify(k + 1, vapp(a, b.mode, v), vinst(b, v));
  }
  if (a.tag === 'VPair') {
    unify(k, a.fst, vproj('fst', b));
    return unify(k, a.snd, vproj('snd', b));
  }
  if (b.tag === 'VPair') {
    unify(k, vproj('fst', a), b.fst);
    return unify(k, vproj('snd', a), b.snd);
  }

  if (a.tag === 'VNe' && b.tag === 'VNe' && eqHead(a.head, b.head))
    return zipWithR_((x, y) => unifyElim(k, x, y, a, b), a.spine, b.spine);
  if (a.tag === 'VNe' && b.tag === 'VNe' && a.head.tag === 'HMeta' && b.head.tag === 'HMeta')
    return length(a.spine) > length(b.spine) ?
      solve(k, a.head.index, a.spine, b) :
      solve(k, b.head.index, b.spine, a);
  if (a.tag === 'VNe' && a.head.tag === 'HMeta')
    return solve(k, a.head.index, a.spine, b);
  if (b.tag === 'VNe' && b.head.tag === 'HMeta')
    return solve(k, b.head.index, b.spine, a);

  return terr(`unify failed (${k}): ${showVal(a, k)} ~ ${showVal(b, k)}`);
};

const solve = (k: Ix, m: Ix, spine: Spine, val: Val): void => {
  log(() => `solve ${V.showVal(VMeta(m, spine), k)} := ${showVal(val, k)} (${k})`);
  tryT(() => {
    if (isMetaSolved(m)) return impossible(`meta ?${m} is already solved`);
    const spinex = checkSpineTop(k, spine);
    if (spinex instanceof TypeError) {
      // postpone if spine contains non-vars
      postpone(k, VMeta(m, spine), val, [m]);
      return;
    }
    if (hasDuplicates(toArray(spinex, x => x))) return terr(`meta spine contains duplicates`);
    const rhs = quote(val, k);
    const body = checkSolution(k, m, spinex, rhs);
    log(() => `spine ${listToString(spinex, s => `${s}`)}`);
    const meta = getMeta(m) as Unsolved;
    const type = meta.type;
    log(() => `meta type: ${showVal(type, 0)}`);
    const solution = constructSolution(0, type, body);
    log(() => `solution ?${m} := ${show(solution)}`);
    const vsolution = evaluate(solution, Nil);
    return solveMeta(m, vsolution);
  }, err => terr(`failed to solve meta ${V.showVal(VMeta(m, spine), k)} := ${showVal(val, k)}: ${err.message}`));
  
  // try to solve blocked problems for the meta
  problemsBlockedBy(m).forEach(p => unify(p.k, p.a, p.b));
};

const constructSolution = (k: Ix, ty_: Val, body: Term): Term => {
  const ty = force(ty_);
  if (ty.tag === 'VPi') {
    const v = VVar(k);
    return Abs(ty.mode, ty.name, quote(ty.type, k), constructSolution(k + 1, vinst(ty, v), body));
  } else return body;
};

const checkSpineTop = (k: Ix, spine: Spine): List<Ix> | TypeError =>
  tryT<List<Ix> | TypeError>(() => checkSpine(k, spine), err => err);

const checkSpine = (k: Ix, spine: Spine): List<Ix> =>
  map(spine, elim => {
    if (elim.tag === 'EApp') {
      const v = force(elim.right);
      if (v.tag === 'VNe' && v.head.tag === 'HVar' && isEmpty(v.spine))
        return v.head.index;
      return terr(`not a var in spine: ${showVal(v, k)}`);
    }
    return terr(`unexpected elim in meta spine: ${elim.tag}`);
  });

const checkSolution = (k: Ix, m: Ix, is: List<Ix>, t: Term): Term => {
  if (t.tag === 'Type') return t;
  if (t.tag === 'Var') {
    const i = k - t.index - 1;
    if (contains(is, i))
      return Var(indexOf(is, i));
    return terr(`scope error ${t.index} (${i})`);
  }
  if (t.tag === 'Meta') {
    if (m === t.index)
      return terr(`occurs check failed: ${show(t)}`);
    return t;
  }
  if (t.tag === 'App') {
    const l = checkSolution(k, m, is, t.left);
    const r = checkSolution(k, m, is, t.right);
    return App(l, t.mode, r);
  }
  if (t.tag === 'Pair') {
    const fst = checkSolution(k, m, is, t.fst);
    const snd = checkSolution(k, m, is, t.snd);
    const type = checkSolution(k, m, is, t.type);
    return Pair(fst, snd, type);
  }
  if (t.tag === 'Proj') {
    const x = checkSolution(k, m, is, t.term);
    return Proj(t.proj, x);
  }
  if (t.tag === 'Abs') {
    const ty = checkSolution(k, m, is, t.type);
    const body = checkSolution(k + 1, m, Cons(k, is), t.body);
    return Abs(t.mode, t.name, ty, body);
  }
  if (t.tag === 'Pi') {
    const ty = checkSolution(k, m, is, t.type);
    const body = checkSolution(k + 1, m, Cons(k, is), t.body);
    return Pi(t.mode, t.name, ty, body);
  }
  if (t.tag === 'Sigma') {
    const ty = checkSolution(k, m, is, t.type);
    const body = checkSolution(k + 1, m, Cons(k, is), t.body);
    return Sigma(t.name, ty, body);
  }
  return impossible(`checkSolution ?${m}: non-normal term: ${show(t)}`);
};
