import { Head, Elim, Val, vapp, showTermQ, VVar } from './domain';
import { Ix } from '../names';
import { terr } from '../utils/util';
import { forceLazy } from '../utils/lazy';
import { zipWithR_, length } from '../utils/list';
import { log } from '../config';

const eqHead = (a: Head, b: Head): boolean => {
  if (a === b) return true;
  if (a.tag === 'HVar') return b.tag === 'HVar' && a.index === b.index;
  if (a.tag === 'HGlobal') return b.tag === 'HGlobal' && a.name === b.name;
  return a;
};
const unifyElim = (k: Ix, a: Elim, b: Elim, x: Val, y: Val): void => {
  if (a === b) return;
  if (a.tag === 'EApp' && b.tag === 'EApp') return unify(k, a.arg, b.arg);
  return terr(`unify failed (${k}): ${showTermQ(x, k)} ~ ${showTermQ(y, k)}`);
};
export const unify = (k: Ix, a: Val, b: Val): void => {
  log(() => `unify ${showTermQ(a, k)} ~ ${showTermQ(b, k)}`);
  if (a === b) return;
  if (a.tag === 'VType' && b.tag === 'VType') return;
  if (a.tag === 'VPi' && b.tag === 'VPi' && a.plicity === b.plicity) {
    unify(k, a.type, b.type);
    const v = VVar(k);
    return unify(k + 1, a.body(v), b.body(v));
  }
  if (a.tag === 'VFix' && b.tag === 'VFix') {
    unify(k, a.type, b.type);
    const v = VVar(k);
    const w = VVar(k + 1);
    return unify(k + 2, a.body(v, w), b.body(v, w));
  }
  if (a.tag === 'VAbs' && b.tag === 'VAbs') {
    const v = VVar(k);
    return unify(k + 1, a.body(v), b.body(v));
  }
  if (a.tag === 'VAbs') {
    const v = VVar(k);
    return unify(k + 1, a.body(v), vapp(b, v));
  }
  if (b.tag === 'VAbs') {
    const v = VVar(k);
    return unify(k + 1, vapp(a, v), b.body(v));
  }
  if (a.tag === 'VNe' && b.tag === 'VNe' && eqHead(a.head, b.head) && length(a.args) === length(b.args))
    return zipWithR_((x, y) => unifyElim(k, x, y, a, b), a.args, b.args);
  if (a.tag === 'VGlued' && b.tag === 'VGlued' && eqHead(a.head, b.head) && length(a.args) === length(b.args)) {
    try {
      zipWithR_((x, y) => unifyElim(k, x, y, a, b), a.args, b.args);
      return;
    } catch(err) {
      if (!(err instanceof TypeError)) throw err;
      return unify(k, forceLazy(a.val), forceLazy(b.val));
    }
  }
  if (a.tag === 'VGlued') return unify(k, forceLazy(a.val), b);
  if (b.tag === 'VGlued') return unify(k, a, forceLazy(b.val));
  return terr(`unify failed (${k}): ${showTermQ(a, k)} ~ ${showTermQ(b, k)}`);
};
