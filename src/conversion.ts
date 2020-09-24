import { log } from './config';
import { Ix } from './names';
import { zipWithR_ } from './utils/list';
import { terr } from './utils/utils';
import { Elim, showV, Val, vapp, vinst, VVar } from './values';

const convElim = (k: Ix, a: Elim, b: Elim, x: Val, y: Val): void => {
  if (a === b) return;
  if (a.tag === 'EApp' && b.tag === 'EApp') return conv(k, a.right, b.right);
  return terr(`conv failed (${k}): ${showV(x, k)} ~ ${showV(y, k)}`);
};
export const conv = (k: Ix, a: Val, b: Val): void => {
  log(() => `conv(${k}): ${showV(a, k)} ~ ${showV(b, k)}`);
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

  if (a.tag === 'VNe' && b.tag === 'VNe' && a.head === b.head)
    return zipWithR_((x, y) => convElim(k, x, y, a, b), a.spine, b.spine);

  return terr(`conv failed (${k}): ${showV(a, k)} ~ ${showV(b, k)}`);
};
