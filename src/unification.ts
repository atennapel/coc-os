import { config, log } from './config';
import { eqHead } from './conversion';
import { Abs, App, Pair, Pi, Proj, show, Sigma, Term, Var } from './core';
import { Ix } from './names';
import { Cons, head, index, indexOfFn, isEmpty, length, List, listToString, map, Nil, reverse, tail, toArray, zipWithR_ } from './utils/list';
import { hasDuplicates, impossible, terr, tryT, tryTE } from './utils/utils';
import { Elim, force, Spine, Val, vapp, vproj, vinst, VVar, VMeta, quote, evaluate, showVal, isVPrim } from './values';
import * as V from './values';
import { discardContext, getMeta, isMetaSolved, markContext, postpone, problemsBlockedBy, Solution, solveMeta, undoContext } from './context';
import { forceLazy } from './utils/lazy';

const unifyElim = (k: Ix, a: Elim, b: Elim, x: Val, y: Val): void => {
  if (a === b) return;
  if (a.tag === 'EApp' && b.tag === 'EApp' && a.mode.tag === b.mode.tag) return unify(k, a.right, b.right);
  if (a.tag === 'EProj' && b.tag === 'EProj' && a.proj === b.proj) return;
  if (a.tag === 'EPrim' && b.tag === 'EPrim' && a.name === b.name && a.args.length === b.args.length) {
    for (let i = 0, l = a.args.length; i < l; i++)
      unify(k, a.args[i], b.args[i]);
    return;
  }
  return terr(`unify failed (${k}): ${showVal(x, k)} ~ ${showVal(y, k)}`);
};
export const unify = (k: Ix, a_: Val, b_: Val): void => {
  const a = force(a_, false);
  const b = force(b_, false);
  log(() => `unify(${k}): ${showVal(a, k)} ~ ${showVal(b, k)}`);
  if (a === b) return;
  if (a.tag === 'VPi' && b.tag === 'VPi' && a.mode.tag === b.mode.tag && a.erased === b.erased) {
    unify(k, a.type, b.type);
    const v = VVar(k);
    return unify(k + 1, vinst(a, v), vinst(b, v));
  }
  if (a.tag === 'VSigma' && b.tag === 'VSigma' && a.erased === b.erased) {
    unify(k, a.type, b.type);
    const v = VVar(k);
    return unify(k + 1, vinst(a, v), vinst(b, v));
  }
  if (a.tag === 'VAbs' && b.tag === 'VAbs' && a.mode.tag === b.mode.tag && a.erased === b.erased) {
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

  if (isVPrim('ReflHEq', a)) return;
  if (isVPrim('ReflHEq', b)) return;

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

  if (a.tag === 'VGlobal' && b.tag === 'VGlobal' && a.head === b.head && length(a.args) === length(b.args)) {
    markContext();
    return tryT(() => {
      zipWithR_((x, y) => unifyElim(k, x, y, a, b), a.args, b.args);
      discardContext();
    }, () => {
      undoContext();
      unify(k, forceLazy(a.val), forceLazy(b.val));
    });
  }
  if (a.tag === 'VGlobal') return unify(k, forceLazy(a.val), b);
  if (b.tag === 'VGlobal') return unify(k, a, forceLazy(b.val));

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
    log(() => `spine ${listToString(spinex, s => `${s}`)}`);
    if (hasDuplicates(toArray(spinex, x => x))) return terr(`meta spine contains duplicates`);
    const rhs = quote(val, k);
    const meta = getMeta(m) as Solution & { tag: 'Solved' };
    const type = meta.type;
    log(() => `meta type: ${showVal(type, 0)}`);
    const zipped = zipSpine(0, reverse(spinex), type);
    log(() => `zipped: ${listToString(zipped, ([i, er]) => `${i} ${er}`)}`);
    const body = tryTE(() => checkSolution(meta.erased, k, m, zipped, rhs));
    if (body instanceof TypeError) {
      if (config.postponeInvalidSolution) {
        // postpone if solution is invalid
        postpone(k, VMeta(m, spine), val, [m]);
        return;
      } else throw body;
    }
    const solution = constructSolution(0, type, body);
    log(() => `solution ?${m} := ${show(solution)}`);
    /*
     const res = tryTE(() => typecheck(solution, meta.erased));
    if (res instanceof TypeError)
      return terr(`solution was invalid: ${res}`);
    */
    const vsolution = evaluate(solution, Nil);
    solveMeta(m, vsolution);

    // try to solve blocked problems for the meta
    log(() => `try solve problems for ?${m}`);
    problemsBlockedBy(m).forEach(p => unify(p.k, p.a, p.b));

    return;
  }, err => terr(`failed to solve meta ${V.showVal(VMeta(m, spine), k)} := ${showVal(val, k)}: ${err.message}`));
};

const constructSolution = (k: Ix, ty_: Val, body: Term): Term => {
  const ty = force(ty_);
  if (ty.tag === 'VPi') {
    const v = VVar(k);
    return Abs(ty.mode, ty.erased, ty.name, quote(ty.type, k), constructSolution(k + 1, vinst(ty, v), body));
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

const zipSpine = (k: Ix, is: List<Ix>, ty_: Val, acc: List<[Ix, boolean]> = Nil): List<[Ix, boolean]> => {
  const ty = force(ty_);
  if (isEmpty(is)) return acc;  
  if (ty.tag === 'VPi') return zipSpine(k + 1, tail(is), ty.clos(VVar(k)), Cons([head(is), ty.erased], acc));
  return terr(`not a pi ${ty.tag} in zipSpine`);
};

const checkSolution = (erased: boolean, k: Ix, m: Ix, is: List<[Ix, boolean]>, t: Term): Term => {
  if (t.tag === 'Prim') return t;
  if (t.tag === 'Global') return t;
  if (t.tag === 'Var') {
    const i = k - t.index - 1;
    const j = indexOfFn(is, ([k]) => i === k);
    if (j >= 0) {
      const data = index(is, j);
      if (!erased && data && data[1])
        return terr(`invalid solution, erased variable used: ${t.index} (${i}, ${j})`);
      return Var(j);
    }
    return terr(`scope error ${t.index} (${i})`);
  }
  if (t.tag === 'Meta') {
    if (m === t.index)
      return terr(`occurs check failed: ${show(t)}`);
    return t;
  }
  if (t.tag === 'App') {
    const l = checkSolution(erased, k, m, is, t.left);
    const r = checkSolution(erased, k, m, is, t.right);
    return App(l, t.mode, r);
  }
  if (t.tag === 'Pair') {
    const fst = checkSolution(erased, k, m, is, t.fst);
    const snd = checkSolution(erased, k, m, is, t.snd);
    const type = checkSolution(erased, k, m, is, t.type);
    return Pair(fst, snd, type);
  }
  if (t.tag === 'Proj') {
    const x = checkSolution(erased, k, m, is, t.term);
    return Proj(t.proj, x);
  }
  if (t.tag === 'Abs') {
    const ty = checkSolution(erased, k, m, is, t.type);
    const body = checkSolution(erased, k + 1, m, Cons([k, t.erased], is), t.body);
    return Abs(t.mode, t.erased, t.name, ty, body);
  }
  if (t.tag === 'Pi') {
    const ty = checkSolution(erased, k, m, is, t.type);
    const body = checkSolution(erased, k + 1, m, Cons([k, t.erased], is), t.body);
    return Pi(t.mode, t.erased, t.name, ty, body);
  }
  if (t.tag === 'Sigma') {
    const ty = checkSolution(erased, k, m, is, t.type);
    const body = checkSolution(erased, k + 1, m, Cons([k, t.erased], is), t.body);
    return Sigma(t.erased, t.name, ty, body);
  }
  return impossible(`checkSolution ?${m}: non-normal term: ${show(t)}`);
};
