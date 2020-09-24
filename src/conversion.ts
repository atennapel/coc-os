import { log } from './config';
import { Ix } from './names';
import { zipWithR_ } from './utils/list';
import { terr } from './utils/utils';
import { Elim, Head, Val, vapp, vinst, VVar, showVal } from './values';

export const eqHead = (a: Head, b: Head): boolean => {
  if (a === b) return true;
  if (a.tag === 'HVar') return b.tag === 'HVar' && a.index === b.index;
  if (a.tag === 'HMeta') return b.tag === 'HMeta' && a.index === b.index;
  return a;
};
const convElim = (k: Ix, a: Elim, b: Elim, x: Val, y: Val): void => {
  if (a === b) return;
  if (a.tag === 'EApp' && b.tag === 'EApp') return conv(k, a.right, b.right);
  return terr(`conv failed (${k}): ${showVal(x, k)} ~ ${showVal(y, k)}`);
};
export const conv = (k: Ix, a: Val, b: Val): void => {
  log(() => `conv(${k}): ${showVal(a, k)} ~ ${showVal(b, k)}`);
  if (a === b) return;
  if (a.tag === 'VType' && b.tag === 'VType') return;
  if (a.tag === 'VPi' && b.tag === 'VPi') {
    conv(k, a.type, b.type);
    const v = VVar(k);
    return conv(k + 1, vinst(a, v), vinst(b, v));
  }
  if (a.tag === 'VAbs' && b.tag === 'VAbs') {
    const v = VVar(k);
    return conv(k + 1, vinst(a, v), vinst(b, v));
  }
  if (a.tag === 'VAbs') {
    const v = VVar(k);
    return conv(k + 1, vinst(a, v), vapp(b, v));
  }
  if (b.tag === 'VAbs') {
    const v = VVar(k);
    return conv(k + 1, vapp(a, v), vinst(b, v));
  }

  if (a.tag === 'VNe' && b.tag === 'VNe' && eqHead(a.head, b.head))
    return zipWithR_((x, y) => convElim(k, x, y, a, b), a.spine, b.spine);

  return terr(`conv failed (${k}): ${showVal(a, k)} ~ ${showVal(b, k)}`);
};
