import { EnvV, Val, quote, evaluate, VType, extendV, VVar, Head, vapp } from './domain';
import { Term, showTerm, Pi } from './syntax';
import { terr } from '../../util';
import { Ix } from '../../names';
import { index, length, zipWithR_ } from '../../list';

const eqHead = (a: Head, b: Head): boolean => {
  if (a.tag === 'HVar') return b.tag === 'HVar' && a.index === b.index;
  // TODO: what about unroll?
  return false;
};
const unify = (k: Ix, a: Val, b: Val): void => {
  if (a === b) return;
  if (a.tag === 'VType' && b.tag === 'VType') return;
  if (a.tag === 'VRoll' && b.tag === 'VRoll') {
    unify(k, a.type, b.type);
    return unify(k, a.term, b.term);
  }
  if (a.tag === 'VPi' && b.tag === 'VPi') {
    unify(k, a.type, b.type);
    const v = VVar(k);
    return unify(k + 1, a.body(v), a.body(v));
  }
  if (a.tag === 'VFix' && b.tag === 'VFix') {
    unify(k, a.type, b.type);
    const v = VVar(k);
    return unify(k + 1, a.body(v), a.body(v));
  }
  if (a.tag === 'VAbs' && b.tag === 'VAbs') {
    unify(k, a.type, b.type);
    const v = VVar(k);
    return unify(k + 1, a.body(v), a.body(v));
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
    return zipWithR_((x, y) => unify(k, x, y), a.args, b.args);
  return terr(`unify failed(${k}): ${showTerm(quote(a, k))} ~ ${showTerm(quote(b, k))}`);
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
    return synthapp(ts, vs, k, ty, tm.right);
  }
  if (tm.tag === 'Abs') {
    check(ts, vs, k, tm.type, VType);
    const type = evaluate(tm.type, vs);
    const rt = synth(extendV(ts, type), extendV(vs, VVar(k)), k + 1, tm.body);
    return evaluate(Pi(tm.type, quote(rt, k + 1)), vs);
  }
  if (tm.tag === 'Let') {
    const vty = synth(ts, vs, k, tm.val);
    return synth(extendV(ts, vty), extendV(vs, evaluate(tm.val, vs)), k + 1, tm.body);
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
    const vt = evaluate(tm.type, vs);
    if (vt.tag !== 'VFix')
      return terr(`fix type expected in ${showTerm(tm)}: ${showTerm(quote(vt, k))}`);
    check(ts, vs, k, tm.term, vt.body(vt));
    return vt;
  }
  if (tm.tag === 'Unroll') {
    const vt = synth(ts, vs, k, tm.term);
    if (vt.tag !== 'VFix')
      return terr(`fix type expected in ${showTerm(tm)}: ${showTerm(quote(vt, k))}`);
    return vt.body(vt);
  }
  return terr(`cannot synth ${showTerm(tm)}`);
};

const synthapp = (ts: EnvV, vs: EnvV, k: Ix, ty: Val, tm: Term): Val => {
  if (ty.tag === 'VPi') {
    check(ts, vs, k, tm, ty.type);
    return ty.body(evaluate(tm, vs));
  }
  return terr(`invalid type in synthapp: ${showTerm(quote(ty, k))} @ ${showTerm(tm)}`);
};

export const typecheck = (tm: Term, ts: EnvV, vs: EnvV, k: Ix): Term =>
  quote(synth(ts, vs, k, tm), k);
