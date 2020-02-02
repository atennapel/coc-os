import { Head, Elim, Val, showTermQ, VVar, vapp } from './domain';
import { Ix } from '../names';
import { terr } from '../util';
import { eqMeta } from '../syntax';
import { zipWithR_, length } from '../list';
import { forceLazy } from '../lazy';

const eqHead = (a: Head, b: Head): boolean => {
  if (a === b) return true;
  if (a.tag === 'HVar') return b.tag === 'HVar' && a.index === b.index;
  if (a.tag === 'HGlobal') return b.tag === 'HGlobal' && a.name === b.name;
  return a;
};

const unifyElim = (k: Ix, a: Elim, b: Elim, x: Val, y: Val): void => {
  if (a === b) return;
  if (a.tag === 'EUnroll' && b.tag === 'EUnroll') return;
  if (a.tag === 'EApp' && b.tag === 'EApp' && eqMeta(a.meta, b.meta))
    return unify(k, a.arg, b.arg);
  return terr(`unify failed (${k}): ${showTermQ(x, k)} ~ ${showTermQ(y, k)}`);
};

export const unify = (k: Ix, a: Val, b: Val): void => {
  if (a === b) return;
  if (a.tag === 'VType' && b.tag === 'VType') return;
  if (a.tag === 'VRoll' && b.tag === 'VRoll') {
    unify(k, a.type, b.type);
    return unify(k, a.term, b.term);
  }
  if (a.tag === 'VPi' && b.tag === 'VPi' && eqMeta(a.meta, b.meta)) {
    unify(k, a.type, b.type);
    const v = VVar(k);
    return unify(k + 1, a.body(v), a.body(v));
  }
  if (a.tag === 'VFix' && b.tag === 'VFix') {
    unify(k, a.type, b.type);
    const v = VVar(k);
    return unify(k + 1, a.body(v), a.body(v));
  }
  if (a.tag === 'VAbs' && b.tag === 'VAbs' && eqMeta(a.meta, b.meta)) {
    unify(k, a.type, b.type);
    const v = VVar(k);
    return unify(k + 1, a.body(v), a.body(v));
  }
  if (a.tag === 'VAbs') {
    const v = VVar(k);
    return unify(k + 1, a.body(v), vapp(b, a.meta, v));
  }
  if (b.tag === 'VAbs') {
    const v = VVar(k);
    return unify(k + 1, vapp(a, b.meta, v), b.body(v));
  }
  if (a.tag === 'VNe' && b.tag === 'VNe' && eqHead(a.head, b.head) && length(a.args) === length(b.args))
    return zipWithR_((x, y) => unifyElim(k, x, y, a, b), a.args, b.args);
  if (a.tag === 'VGlued' && b.tag === 'VGlued' && eqHead(a.head, b.head) && length(a.args) === length(b.args)) {
    try {
      return zipWithR_((x, y) => unifyElim(k, x, y, a, b), a.args, b.args);
    } catch(err) {
      if (!(err instanceof TypeError)) throw err;
      return unify(k, forceLazy(a.val), forceLazy(b.val));
    }
  }
  if (a.tag === 'VGlued') return unify(k, forceLazy(a.val), b);
  if (b.tag === 'VGlued') return unify(k, a, forceLazy(b.val));
  return terr(`unify failed (${k}): ${showTermQ(a, k)} ~ ${showTermQ(b, k)}`);
};
