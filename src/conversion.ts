import { log } from './config';
import { Ix } from './names';
import { zipWithR_ } from './utils/list';
import { terr } from './utils/utils';
import { Elim, Head, Val, vapp, vproj, vinst, VVar, showVal } from './values';

export const eqHead = (a: Head, b: Head): boolean => {
  if (a === b) return true;
  if (a.tag === 'HVar') return b.tag === 'HVar' && a.index === b.index;
  if (a.tag === 'HMeta') return b.tag === 'HMeta' && a.index === b.index;
  return a;
};
const convElim = (k: Ix, a: Elim, b: Elim, x: Val, y: Val): void => {
  if (a === b) return;
  if (a.tag === 'EApp' && b.tag === 'EApp' && a.mode === b.mode) return conv(k, a.right, b.right);
  if (a.tag === 'EProj' && b.tag === 'EProj' && a.proj === b.proj) return;
  return terr(`conv failed (${k}): ${showVal(x, k)} ~ ${showVal(y, k)}`);
};
export const conv = (k: Ix, a: Val, b: Val): void => {
  log(() => `conv(${k}): ${showVal(a, k)} ~ ${showVal(b, k)}`);
  if (a === b) return;
  if (a.tag === 'VType' && b.tag === 'VType') return;
  if (a.tag === 'VPi' && b.tag === 'VPi' && a.mode === b.mode) {
    conv(k, a.type, b.type);
    const v = VVar(k);
    return conv(k + 1, vinst(a, v), vinst(b, v));
  }
  if (a.tag === 'VSigma' && b.tag === 'VSigma') {
    conv(k, a.type, b.type);
    const v = VVar(k);
    return conv(k + 1, vinst(a, v), vinst(b, v));
  }
  if (a.tag === 'VAbs' && b.tag === 'VAbs' && a.mode === b.mode) {
    const v = VVar(k);
    return conv(k + 1, vinst(a, v), vinst(b, v));
  }
  if (a.tag === 'VPair' && b.tag === 'VPair') {
    conv(k, a.fst, b.fst);
    return conv(k, a.snd, b.snd);
  }
  if (a.tag === 'VAbs') {
    const v = VVar(k);
    return conv(k + 1, vinst(a, v), vapp(b, a.mode, v));
  }
  if (b.tag === 'VAbs') {
    const v = VVar(k);
    return conv(k + 1, vapp(a, b.mode, v), vinst(b, v));
  }
  if (a.tag === 'VPair') {
    conv(k, a.fst, vproj('fst', b));
    return conv(k, a.snd, vproj('snd', b));
  }
  if (b.tag === 'VPair') {
    conv(k, vproj('fst', a), b.fst);
    return conv(k, vproj('snd', a), b.snd);
  }

  if (a.tag === 'VNe' && b.tag === 'VNe' && eqHead(a.head, b.head))
    return zipWithR_((x, y) => convElim(k, x, y, a, b), a.spine, b.spine);

  return terr(`conv failed (${k}): ${showVal(a, k)} ~ ${showVal(b, k)}`);
};
