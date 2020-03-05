import { Head, Val, vapp, showTermQ, VVar, VAbs, VType } from './domain';
import { Ix } from './names';
import { terr } from './utils/util';
import { forceLazy } from './utils/lazy';
import { zipWithR_, length } from './utils/list';
import { log } from './config';

const eqHead = (a: Head, b: Head): boolean => {
  if (a === b) return true;
  if (a.tag === 'HVar') return b.tag === 'HVar' && a.index === b.index;
  if (a.tag === 'HGlobal') return b.tag === 'HGlobal' && a.name === b.name;
  return a;
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
  if (a.tag === 'VAbs' && a.plicity) return unify(k, a, VAbs(true, '_', VType, _ => b));
  if (b.tag === 'VAbs' && b.plicity) return unify(k, VAbs(true, '_', VType, _ => a), b);
  if (a.tag === 'VAbs' && b.tag === 'VAbs') {
    const v = VVar(k);
    return unify(k + 1, a.body(v), b.body(v));
  }
  if (a.tag === 'VAbs') {
    const v = VVar(k);
    return unify(k + 1, a.body(v), vapp(b, a.plicity, v));
  }
  if (b.tag === 'VAbs') {
    const v = VVar(k);
    return unify(k + 1, vapp(a, b.plicity, v), b.body(v));
  }
  if (a.tag === 'VNe' && b.tag === 'VNe' && eqHead(a.head, b.head) && length(a.eargs) === length(b.eargs))
    return zipWithR_((x, y) => unify(k, x, y), a.eargs, b.eargs);
  if (a.tag === 'VGlued' && b.tag === 'VGlued' && eqHead(a.head, b.head) && length(a.eargs) === length(b.eargs)) {
    try {
      zipWithR_((x, y) => unify(k, x, y), a.eargs, b.eargs);
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
