import { log } from './config';
import { Ix } from './names';
import { forceLazy } from './utils/lazy';
import { length, zipWithR_ } from './utils/list';
import { terr, tryT } from './utils/utils';
import { Elim, Head, Val, vapp, vproj, vinst, VVar, showVal, isVPrim, force } from './values';

export const eqHead = (a: Head, b: Head): boolean => {
  if (a === b) return true;
  if (a.tag === 'HVar') return b.tag === 'HVar' && a.index === b.index;
  if (a.tag === 'HPrim') return b.tag === 'HPrim' && a.name === b.name;
  if (a.tag === 'HMeta') return b.tag === 'HMeta' && a.index === b.index;
  return a;
};
const convElim = (k: Ix, a: Elim, b: Elim, x: Val, y: Val): void => {
  if (a === b) return;
  if (a.tag === 'EApp' && b.tag === 'EApp' && a.mode.tag === b.mode.tag) return conv(k, a.right, b.right);
  if (a.tag === 'EProj' && b.tag === 'EProj' && a.proj === b.proj) return;
  if (a.tag === 'EPrim' && b.tag === 'EPrim' && a.name === b.name && a.args.length === b.args.length) {
    for (let i = 0, l = a.args.length; i < l; i++)
      conv(k, a.args[i], b.args[i]);
    return;
  }
  return terr(`conv failed (${k}): ${showVal(x, k)} ~ ${showVal(y, k)}`);
};
export const conv = (k: Ix, a_: Val, b_: Val): void => {
  const a = force(a_, false);
  const b = force(b_, false);
  log(() => `conv(${k}): ${showVal(a, k)} ~ ${showVal(b, k)}`);
  if (a === b) return;
  if (a.tag === 'VPi' && b.tag === 'VPi' && a.mode.tag === b.mode.tag && a.erased === b.erased) {
    conv(k, a.type, b.type);
    const v = VVar(k);
    return conv(k + 1, vinst(a, v), vinst(b, v));
  }
  if (a.tag === 'VSigma' && b.tag === 'VSigma' && a.erased === b.erased) {
    conv(k, a.type, b.type);
    const v = VVar(k);
    return conv(k + 1, vinst(a, v), vinst(b, v));
  }
  if (a.tag === 'VAbs' && b.tag === 'VAbs' && a.mode.tag === b.mode.tag && a.erased === b.erased) {
    const v = VVar(k);
    return conv(k + 1, vinst(a, v), vinst(b, v));
  }
  if (a.tag === 'VPair' && b.tag === 'VPair') {
    conv(k, a.fst, b.fst);
    return conv(k, a.snd, b.snd);
  }
  if (a.tag === 'VData' && b.tag === 'VData' && a.cons.length === b.cons.length) {
    conv(k, a.index, b.index);
    for (let i = 0, l = a.cons.length; i < l; i++)
      conv(k, a.cons[i], b.cons[i]);
    return;
  }
  if (a.tag === 'VTCon' && b.tag === 'VTCon' && a.args.length === b.args.length) {
    conv(k, a.data, b.data);
    for (let i = 0, l = a.args.length; i < l; i++)
      conv(k, a.args[i], b.args[i]);
    return;
  }
  if (a.tag === 'VCon' && b.tag === 'VCon' && a.index === b.index && a.args.length === b.args.length) {
    conv(k, a.data, b.data);
    for (let i = 0, l = a.args.length; i < l; i++)
      conv(k, a.args[i], b.args[i]);
    return;
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

  if (isVPrim('ReflHEq', a)) return;
  if (isVPrim('ReflHEq', b)) return;

  if (a.tag === 'VNe' && b.tag === 'VNe' && eqHead(a.head, b.head))
    return zipWithR_((x, y) => convElim(k, x, y, a, b), a.spine, b.spine);

  if (a.tag === 'VGlobal' && b.tag === 'VGlobal' && a.head === b.head && length(a.args) === length(b.args)) {
    return tryT(() => zipWithR_((x, y) => convElim(k, x, y, a, b), a.args, b.args),
      () => conv(k, forceLazy(a.val), forceLazy(b.val)));
  }
  if (a.tag === 'VGlobal') return conv(k, forceLazy(a.val), b);
  if (b.tag === 'VGlobal') return conv(k, a, forceLazy(b.val));

  return terr(`conv failed (${k}): ${showVal(a, k)} ~ ${showVal(b, k)}`);
};
