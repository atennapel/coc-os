import { EnvV, Val, quote, evaluate, VType, extendV, VVar, Head, vapp, Elim, showTermQ, force } from './domain';
import { Term, showTerm, Pi } from './syntax';
import { terr, impossible } from '../util';
import { Ix } from '../names';
import { index, length, zipWithR_, Nil } from '../list';
import { globalGet } from './globalenv';
import { forceLazy } from '../lazy';
import { eqPlicity } from '../syntax';

const eqHead = (a: Head, b: Head): boolean => {
  if (a === b) return true;
  if (a.tag === 'HVar') return b.tag === 'HVar' && a.index === b.index;
  if (a.tag === 'HGlobal') return b.tag === 'HGlobal' && a.name === b.name;
  return a;
};
const unifyElim = (k: Ix, a: Elim, b: Elim, x: Val, y: Val): void => {
  if (a === b) return;
  if (a.tag === 'EUnroll' && b.tag === 'EUnroll') return;
  if (a.tag === 'EApp' && b.tag === 'EApp' && eqPlicity(a.plicity, b.plicity))
    return unify(k, a.arg, b.arg);
  if (a.tag === 'EInd' && b.tag === 'EInd')
    return unify(k, a.type, b.type);
  return terr(`unify failed (${k}): ${showTermQ(x, k)} ~ ${showTermQ(y, k)}`);
};
const unify = (k: Ix, a: Val, b: Val): void => {
  if (a === b) return;
  if (a.tag === 'VType' && b.tag === 'VType') return;
  if (a.tag === 'VRoll' && b.tag === 'VRoll') {
    unify(k, a.type, b.type);
    return unify(k, a.term, b.term);
  }
  if (a.tag === 'VPi' && b.tag === 'VPi' && eqPlicity(a.plicity, b.plicity)) {
    unify(k, a.type, b.type);
    const v = VVar(k);
    return unify(k + 1, a.body(v), b.body(v));
  }
  if (a.tag === 'VFix' && b.tag === 'VFix') {
    unify(k, a.type, b.type);
    const v = VVar(k);
    return unify(k + 1, a.body(v), b.body(v));
  }
  if (a.tag === 'VAbs' && b.tag === 'VAbs' && eqPlicity(a.plicity, b.plicity)) {
    unify(k, a.type, b.type);
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

const erasedUsed = (k: Ix, t: Term): boolean => {
  if (t.tag === 'Var') return t.index === k;
  if (t.tag === 'Global') return false;
  if (t.tag === 'App') return erasedUsed(k, t.left) || (!t.plicity.erased && erasedUsed(k, t.right));
  if (t.tag === 'Abs') return erasedUsed(k + 1, t.body);
  if (t.tag === 'Let') return erasedUsed(k + 1, t.body) || (!t.plicity.erased && erasedUsed(k, t.val));
  if (t.tag === 'Roll') return erasedUsed(k, t.term);
  if (t.tag === 'Unroll') return erasedUsed(k, t.term);
  if (t.tag === 'Ind') return erasedUsed(k, t.term);
  if (t.tag === 'IndFix') return erasedUsed(k, t.term);
  if (t.tag === 'Pi') return false;
  if (t.tag === 'Fix') return false;
  if (t.tag === 'Type') return false;
  return t;
};

const check = (ts: EnvV, vs: EnvV, k: Ix, tm: Term, ty: Val): void => {
  const ty2 = synth(ts, vs, k, tm);
  try {
    unify(k, ty2, ty);
  } catch(err) {
    if (!(err instanceof TypeError)) throw err;
    terr(`failed to unify ${showTermQ(ty2, k)} ~ ${showTermQ(ty, k)}: ${err.message}`);
  }
};

const synth = (ts: EnvV, vs: EnvV, k: Ix, tm: Term): Val => {
  if (tm.tag === 'Type') return VType;
  if (tm.tag === 'Var')
    return index(ts, tm.index) || terr(`var out of scope ${showTerm(tm)}`);
  if (tm.tag === 'Global') {
    const entry = globalGet(tm.name);
    return entry ? entry.type : impossible(`global ${tm.name} not found`);
  }
  if (tm.tag === 'App') {
    const ty = force(synth(ts, vs, k, tm.left));
    if (ty.tag === 'VPi' && eqPlicity(ty.plicity, tm.plicity)) {
      check(ts, vs, k, tm.right, ty.type);
      return ty.body(evaluate(tm.right, vs));
    }
    return terr(`invalid type or plicity mismatch in synthapp in ${showTerm(tm)}: ${showTermQ(ty, k)} ${tm.plicity.erased ? '-' : ''}@ ${showTerm(tm.right)}`);
  }
  if (tm.tag === 'Abs') {
    check(ts, vs, k, tm.type, VType);
    const type = evaluate(tm.type, vs);
    const rt = synth(extendV(ts, type), extendV(vs, VVar(k)), k + 1, tm.body);
    if (tm.plicity.erased && erasedUsed(0, tm.body))
      return terr(`erased argument used in ${showTerm(tm)}`);
    // TODO: avoid quote here
    return evaluate(Pi(tm.plicity, tm.type, quote(rt, k + 1, false)), vs);
  }
  if (tm.tag === 'Let') {
    const vty = synth(ts, vs, k, tm.val);
    const rt = synth(extendV(ts, vty), extendV(vs, evaluate(tm.val, vs)), k + 1, tm.body);
    if (tm.plicity.erased && erasedUsed(0, tm.body))
      return terr(`erased argument used in ${showTerm(tm)}`);
    return rt;
  }
  if (tm.tag === 'Pi') {
    check(ts, vs, k, tm.type, VType);
    check(extendV(ts, evaluate(tm.type, vs)), extendV(vs, VVar(k)), k + 1, tm.body, VType);
    return VType;
  }
  if (tm.tag === 'Fix') {
    check(ts, vs, k, tm.type, VType);
    const vt = evaluate(tm.type, vs);
    check(extendV(ts, vt), extendV(vs, VVar(k)), k + 1, tm.body, vt);
    return vt;
  }
  if (tm.tag === 'Roll') {
    check(ts, vs, k, tm.type, VType);
    const vt = force(evaluate(tm.type, vs));
    if (vt.tag === 'VFix') {
      check(ts, vs, k, tm.term, vt.body(vt));
      return vt;
    }
    return terr(`fix type expected in ${showTerm(tm)}: ${showTermQ(vt, k)}`);
  }
  if (tm.tag === 'Unroll') {
    const vt = force(synth(ts, vs, k, tm.term));
    if (vt.tag === 'VFix') return vt.body(vt);
    return terr(`fix type expected in ${showTerm(tm)}: ${showTermQ(vt, k)}`);
  }
  return terr(`cannot synth ${showTerm(tm)}`);
};

export const typecheck = (tm: Term, ts: EnvV = Nil, vs: EnvV = Nil, k: Ix = 0): Val =>
  synth(ts, vs, k, tm);
