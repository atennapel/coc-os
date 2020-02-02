import { EnvV, Val, VType, quote, evaluate, extendV, VVar } from './values';
import { Term, showTerm, Pi } from './syntax';
import { unify } from './unification';
import { index, length, Nil } from '../../list';
import { terr } from '../../util';
import { forceLazy } from '../../lazy';
import { getEnv } from './env';

const check = (ts: EnvV, vs: EnvV, k: number, tm: Term, ty: Val): void => {
  const ty2 = synth(ts, vs, k, tm);
  unify(k, ty2, ty);
};

const synth = (ts: EnvV, vs: EnvV, k: number, tm: Term): Val => {
  if (tm.tag === 'Type') return VType;
  if (tm.tag === 'Var')
    return index(ts, tm.index) || terr(`var out of scope ${showTerm(tm)}`);
  if (tm.tag === 'Global') {
    const res = getEnv(tm.name);
    return res ? res.type : terr(`undefined var ${showTerm(tm)}`);
  }
  if (tm.tag === 'App') {
    const ty = synth(ts, vs, k, tm.left);
    return synthapp(ts, vs, k, ty, tm.right);
  }
  if (tm.tag === 'Abs') {
    check(ts, vs, k, tm.type, VType);
    const type = evaluate(tm.type, vs);
    const rt = synth(extendV(ts, type), extendV(vs, VVar(k)), k + 1, tm.body);
    return evaluate(Pi(tm.name, tm.type, quote(rt, k + 1)), vs);
  }
  if (tm.tag === 'Pi') {
    check(ts, vs, k, tm.type, VType);
    check(extendV(ts, evaluate(tm.type, vs)), extendV(vs, VVar(k)), k + 1, tm.body, VType);
    return VType;
  }
  if (tm.tag === 'Let') {
    const vty = synth(ts, vs, k, tm.val);
    return synth(extendV(ts, vty), extendV(vs, evaluate(tm.val, vs)), k + 1, tm.body);
  }
  if (tm.tag === 'Ann') {
    check(ts, vs, k, tm.type, VType);
    const vty = evaluate(tm.type, vs);
    check(ts, vs, k, tm.term, vty);
    return vty;
  }
  return terr(`cannot synth ${showTerm(tm)}`);
};

const synthapp = (ts: EnvV, vs: EnvV, k: number, ty: Val, tm: Term): Val => {
  if (ty.tag === 'VPi') {
    check(ts, vs, k, tm, ty.type);
    return ty.body(evaluate(tm, vs));
  }
  if (ty.tag === 'VGlued')
    return synthapp(ts, vs, k, forceLazy(ty.val), tm);
  return terr(`invalid type in synthapp: ${showTerm(quote(ty, k))} @ ${showTerm(tm)}`);
};

export const elaborate = (tm: Term, ts: EnvV = Nil, vs: EnvV = Nil): Term =>
  quote(synth(ts, vs, length(ts), tm));
