import { Head, Elim, Val, VVar, vapp, showTermU, forceGlue } from './domain';
import { Ix, Name } from '../names';
import { terr, impossible } from '../util';
import { eqPlicity } from '../syntax';
import { zipWithR_, length, List, Cons } from '../list';
import { forceLazy } from '../lazy';
import { log } from '../config';
import { Term } from './syntax';

const eqHead = (a: Head, b: Head): boolean => {
  if (a === b) return true;
  if (a.tag === 'HVar') return b.tag === 'HVar' && a.index === b.index;
  if (a.tag === 'HGlobal') return b.tag === 'HGlobal' && a.name === b.name;
  if (a.tag === 'HMeta') return b.tag === 'HMeta' && a.index === b.index;
  return a;
};

const unifyElim = (ns: List<Name>, k: Ix, a: Elim, b: Elim, x: Val, y: Val): void => {
  if (a === b) return;
  if (a.tag === 'EUnroll' && b.tag === 'EUnroll') return;
  if (a.tag === 'EApp' && b.tag === 'EApp' && eqPlicity(a.plicity, b.plicity))
    return unify(ns, k, a.arg, b.arg);
  return terr(`unify failed (${k}): ${showTermU(x, ns, k)} ~ ${showTermU(y, ns, k)}`);
};

export const unify = (ns: List<Name>, k: Ix, a_: Val, b_: Val): void => {
  const a = forceGlue(a_);
  const b = forceGlue(b_);
  log(() => `unify ${showTermU(a, ns, k)} ~ ${showTermU(b, ns, k)}`);
  if (a === b) return;
  if (a.tag === 'VType' && b.tag === 'VType') return;
  if (a.tag === 'VRoll' && b.tag === 'VRoll') {
    unify(ns, k, a.type, b.type);
    return unify(ns, k, a.term, b.term);
  }
  if (a.tag === 'VPi' && b.tag === 'VPi' && eqPlicity(a.plicity, b.plicity)) {
    unify(ns, k, a.type, b.type);
    const v = VVar(k);
    return unify(Cons(a.name, ns), k + 1, a.body(v), b.body(v));
  }
  if (a.tag === 'VFix' && b.tag === 'VFix') {
    unify(ns, k, a.type, b.type);
    const v = VVar(k);
    return unify(Cons(a.name, ns), k + 1, a.body(v), b.body(v));
  }
  if (a.tag === 'VAbs' && b.tag === 'VAbs' && eqPlicity(a.plicity, b.plicity)) {
    unify(ns, k, a.type, b.type);
    const v = VVar(k);
    return unify(Cons(a.name, ns), k + 1, a.body(v), b.body(v));
  }
  if (a.tag === 'VAbs') {
    const v = VVar(k);
    return unify(Cons(a.name, ns), k + 1, a.body(v), vapp(b, a.plicity, v));
  }
  if (b.tag === 'VAbs') {
    const v = VVar(k);
    return unify(Cons(b.name, ns), k + 1, vapp(a, b.plicity, v), b.body(v));
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
      return zipWithR_((x, y) => unifyElim(ns, k, x, y, a, b), a.args, b.args);
    } catch(err) {
      if (!(err instanceof TypeError)) throw err;
      return unify(ns, k, forceLazy(a.val), forceLazy(b.val));
    }
  }
  if (a.tag === 'VGlued') return unify(ns, k, forceLazy(a.val), b);
  if (b.tag === 'VGlued') return unify(ns, k, a, forceLazy(b.val));
  return terr(`unify failed (${k}): ${showTermU(a, ns, k)} ~ ${showTermU(b, ns, k)}`);
};

const solve = (ns: List<Name>, k: Ix, m: Ix, spine: List<Elim>, val: Val): void => {
  return impossible('unimplemented');
};

// @ts-ignore
const checkSpine = (ns: List<Name>, k: Ix, spine: List<Elim>): List<[boolean, Name]> => {
  return impossible('unimplemented');
};

// @ts-ignore
const checkSolution = (ns: List<Name>, k: Ix, m: Ix, spine: List<Name>, tm: Term): void => {
  return impossible('unimplemented');
};
