import { Head, Elim, Val, VVar, vapp, showTermU, showElimU, quote, evaluate, forceGlue } from './domain';
import { Ix, Name } from '../names';
import { terr, impossible } from '../util';
import { eqPlicity, PlicityR } from '../syntax';
import { zipWithR_, length, List, Cons, map, toArray, Nil, index, contains, toString, indexOf, foldl } from '../list';
import { forceLazy } from '../lazy';
import { log } from '../config';
import { Term, Abs, Type, showFromSurface, showTerm, Var, App, Pi } from './syntax';
import { metaSet, metaPush, metaDiscard, metaPop } from './metas';

const eqHead = (a: Head, b: Head): boolean => {
  if (a === b) return true;
  if (a.tag === 'HVar') return b.tag === 'HVar' && a.index === b.index;
  if (a.tag === 'HGlobal') return b.tag === 'HGlobal' && a.name === b.name;
  if (a.tag === 'HMeta') return b.tag === 'HMeta' && a.index === b.index;
  return a;
};

const unifyElim = (ns: List<Name>, k: Ix, a: Elim, b: Elim, x: Val, y: Val): void => {
  if (a === b) return;
  if (a.tag === 'EApp' && b.tag === 'EApp') return unify(ns, k, a.arg, b.arg);
  return terr(`unify failed (${k}): ${showTermU(x, ns, k)} ~ ${showTermU(y, ns, k)}`);
};

export const unify = (ns: List<Name>, k: Ix, a_: Val, b_: Val): void => {
  const a = forceGlue(a_);
  const b = forceGlue(b_);
  log(() => `unify ${showTermU(a, ns, k)} ~ ${showTermU(b, ns, k)}`);
  if (a === b) return;
  if (a.tag === 'VType' && b.tag === 'VType') return;
  if (a.tag === 'VPi' && b.tag === 'VPi' && eqPlicity(a.plicity, b.plicity)) {
    unify(ns, k, a.type, b.type);
    const v = VVar(k);
    return unify(Cons(a.name, ns), k + 1, a.body(v), b.body(v));
  }
  if (a.tag === 'VAbs' && b.tag === 'VAbs') {
    if (a.type && b.type) unify(ns, k, a.type, b.type);
    const v = VVar(k);
    return unify(Cons(a.name, ns), k + 1, a.body(v), b.body(v));
  }
  if (a.tag === 'VAbs') {
    const v = VVar(k);
    return unify(Cons(a.name, ns), k + 1, a.body(v), vapp(b, v));
  }
  if (b.tag === 'VAbs') {
    const v = VVar(k);
    return unify(Cons(b.name, ns), k + 1, vapp(a, v), b.body(v));
  }
  if (a.tag === 'VNe' && b.tag === 'VNe' && eqHead(a.head, b.head) && length(a.args) === length(b.args))
    return zipWithR_((x, y) => unifyElim(ns, k, x, y, a, b), a.args, b.args);
  if (a.tag === 'VNe' && b.tag === 'VNe' && a.head.tag === 'HMeta' && b.head.tag === 'HMeta')
    return length(a.args) > length(b.args) ?
      solve(ns, k, a.head.index, a.args, b) :
      solve(ns, k, b.head.index, b.args, a);
  if (a.tag === 'VNe' && a.head.tag === 'HMeta')
    return solve(ns, k, a.head.index, a.args, b);
  if (b.tag === 'VNe' && b.head.tag === 'HMeta')
    return solve(ns, k, b.head.index, b.args, a);
  if (a.tag === 'VGlued' && b.tag === 'VGlued' && eqHead(a.head, b.head) && length(a.args) === length(b.args)) {
    try {
      metaPush();
      zipWithR_((x, y) => unifyElim(ns, k, x, y, a, b), a.args, b.args);
      metaDiscard();
      return;
    } catch(err) {
      if (!(err instanceof TypeError)) throw err;
      metaPop();
      return unify(ns, k, forceLazy(a.val), forceLazy(b.val));
    }
  }
  if (a.tag === 'VGlued') return unify(ns, k, forceLazy(a.val), b);
  if (b.tag === 'VGlued') return unify(ns, k, a, forceLazy(b.val));
  return terr(`unify failed (${k}): ${showTermU(a, ns, k)} ~ ${showTermU(b, ns, k)}`);
};

const solve = (ns: List<Name>, k: Ix, m: Ix, spine: List<Elim>, val: Val): void => {
  log(() => `solve ?${m} ${toString(spine, e => showElimU(e, ns, k, false))} := ${showTermU(val, ns, k)} (${k}, ${toString(ns)})`);
  try {
    const spinex = checkSpine(ns, k, spine);
    const rhs = quote(val, k, false);
    const body = checkSolution(ns, k, m, spinex, rhs);
    // Note: I'm solving with an abstraction that has * as type for all the parameters
    // TODO: I think it might actually matter
    log(() => `spinex ${toString(spinex, s => `${s}`)}`);
    const solution = foldl((body, y) => {
      if (typeof y === 'string') return Abs(PlicityR, '_', Type, body);
      const x = index(ns, k - y - 1);
      if (!x) return terr(`index ${y} out of range in meta spine`);
      return Abs(PlicityR, x, Type, body);
    }, body, spinex);
    log(() => `solution ?${m} := ${showFromSurface(solution, Nil)} | ${showTerm(solution)}`);
    const vsolution = evaluate(solution, Nil);
    metaSet(m, vsolution);
  } catch (err) {
    if (!(err instanceof TypeError)) throw err;
    const a = toArray(spine, e => showElimU(e, ns, k));
    terr(`failed to solve meta (?${m}${a.length > 0 ? ' ': ''}${a.join(' ')}) := ${showTermU(val, ns, k)}: ${err.message}`);
  }
};

const checkSpine = (ns: List<Name>, k: Ix, spine: List<Elim>): List<Ix | Name> =>
  map(spine, elim => {
    if (elim.tag === 'EApp') {
      const v = forceGlue(elim.arg);
      if ((v.tag === 'VNe' || v.tag === 'VGlued') && v.head.tag === 'HVar' && length(v.args) === 0)
        return v.head.index;
      if ((v.tag === 'VNe' || v.tag === 'VGlued') && v.head.tag === 'HGlobal' && length(v.args) === 0)
        return v.head.name;
      return terr(`not a var in spine: ${showTermU(v, ns, k)}`);
    }
    return elim.tag;
  });

const checkSolution = (ns: List<Name>, k: Ix, m: Ix, is: List<Ix | Name>, t: Term): Term => {
  if (t.tag === 'Type') return t;
  if (t.tag === 'Global') return t;
  if (t.tag === 'Var') {
    const i = k - t.index - 1;
    if (contains(is, i))
      return Var(indexOf(is, i));
    return terr(`scope error ${t.index} (${i}) | ${index(ns, t.index)}`);
  }
  if (t.tag === 'Meta') {
    if (m === t.index)
      return terr(`occurs check failed: ${showFromSurface(t, ns)}`);
    return t;
  }
  if (t.tag === 'App') {
    const l = checkSolution(ns, k, m, is, t.left);
    const r = checkSolution(ns, k, m, is, t.right);
    return App(l, t.plicity, r);
  }
  if (t.tag === 'Abs') {
    const ty = t.type && checkSolution(ns, k, m, is, t.type);
    const body = checkSolution(ns, k + 1, m, Cons(k, is), t.body);
    return Abs(t.plicity, t.name, ty, body);
  }
  if (t.tag === 'Pi') {
    const ty = checkSolution(ns, k, m, is, t.type);
    const body = checkSolution(ns, k + 1, m, Cons(k, is), t.body);
    return Pi(t.plicity, t.name, ty, body);
  }
  return impossible(`checkSolution ?${m}: non-normal term: ${showFromSurface(t, ns)}`);
};