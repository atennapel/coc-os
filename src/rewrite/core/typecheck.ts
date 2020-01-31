import { EnvV, Val, quote, evaluate, VType, extendV, VVar, Head, vapp, Elim } from './domain';
import { Term, showTerm, Pi, eqMeta } from './syntax';
import { terr } from '../../util';
import { Ix } from '../../names';
import { index, length, zipWithR_ } from '../../list';

const eqHead = (a: Head, b: Head): boolean => {
  if (a === b) return true;
  if (a.tag === 'HVar') return b.tag === 'HVar' && a.index === b.index;
  return false;
};
const unifyElim = (k: Ix, a: Elim, b: Elim, x: Val, y: Val): void => {
  if (a === b) return;
  if (a.tag === 'EUnroll' && b.tag === 'EUnroll') return;
  if (a.tag === 'EApp' && b.tag === 'EApp' && eqMeta(a.meta, b.meta))
    return unify(k, a.arg, b.arg);
  return terr(`unify failed (${k}): ${showTerm(quote(x, k))} ~ ${showTerm(quote(y, k))}`);
};
const unify = (k: Ix, a: Val, b: Val): void => {
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
  return terr(`unify failed (${k}): ${showTerm(quote(a, k))} ~ ${showTerm(quote(b, k))}`);
};

const check = (ts: EnvV, vs: EnvV, k: Ix, tm: Term, ty: Val): void => {
  const ty2 = synth(ts, vs, k, tm);
  try {
    unify(k, ty2, ty);
  } catch(err) {
    if (!(err instanceof TypeError)) throw err;
    terr(`failed to unify ${showTerm(quote(ty2, k))} ~ ${showTerm(quote(ty, k))}: ${err.message}`);
  }
};

const synth = (ts: EnvV, vs: EnvV, k: Ix, tm: Term): Val => {
  if (tm.tag === 'Type') return VType;
  if (tm.tag === 'Var')
    return index(ts, tm.index) || terr(`var out of scope ${showTerm(tm)}`);
  if (tm.tag === 'App') {
    const ty = synth(ts, vs, k, tm.left);
    if (ty.tag === 'VPi' && eqMeta(ty.meta, tm.meta)) {
      check(ts, vs, k, tm.right, ty.type);
      return ty.body(evaluate(tm.right, vs));
    }
    return terr(`invalid type or meta mismatch in synthapp in ${showTerm(tm)}: ${showTerm(quote(ty, k))} ${tm.meta.erased ? '-' : ''}@ ${showTerm(tm.right)}`);
  }
  if (tm.tag === 'Abs') {
    // TODO: check erased arguments are not used
    check(ts, vs, k, tm.type, VType);
    const type = evaluate(tm.type, vs);
    const rt = synth(extendV(ts, type), extendV(vs, VVar(k)), k + 1, tm.body);
    // TODO: avoid quote here
    return evaluate(Pi(tm.meta, tm.type, quote(rt, k + 1)), vs);
  }
  if (tm.tag === 'Let') {
    // TODO: check erased arguments are not used
    const vty = synth(ts, vs, k, tm.val);
    return synth(extendV(ts, vty), extendV(vs, evaluate(tm.val, vs)), k + 1, tm.body);
  }
  if (tm.tag === 'Pi') {
    // TODO: check erased arguments are not used
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
    const vt = evaluate(tm.type, vs);
    if (vt.tag === 'VFix') {
      check(ts, vs, k, tm.term, vt.body(vt));
      return vt;
    }
    return terr(`fix type expected in ${showTerm(tm)}: ${showTerm(quote(vt, k))}`);
  }
  if (tm.tag === 'Unroll') {
    const vt = synth(ts, vs, k, tm.term);
    if (vt.tag === 'VFix') return vt.body(vt);
    return terr(`fix type expected in ${showTerm(tm)}: ${showTerm(quote(vt, k))}`);
  }
  return terr(`cannot synth ${showTerm(tm)}`);
};

export const typecheck = (tm: Term, ts: EnvV, vs: EnvV, k: Ix): Term =>
  quote(synth(ts, vs, k, tm), k);
