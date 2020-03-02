import { Term, showTerm, Pi } from './syntax';
import { Ix } from '../names';
import { List, Cons, listToString, Nil, index } from '../utils/list';
import { Val, showTermQ, EnvV, extendV, VVar, evaluate, quote, showEnvV, VType, force } from './domain';
import { log } from '../config';
import { terr } from '../utils/util';
import { unify } from './unify';
import { Plicity } from '../surface';
import { globalGet } from '../globalenv';

type EnvT = List<[boolean, Val]>;
const extendT = (ts: EnvT, val: Val, bound: boolean): EnvT => Cons([bound, val], ts);
const showEnvT = (ts: EnvT, k: Ix = 0, full: boolean = false): string =>
  listToString(ts, ([b, v]) => `${b ? '' : 'def '}${showTermQ(v, k, full)}`);

interface Local {
  ts: EnvT;
  vs: EnvV;
  index: Ix;
  indexErased: Ix;
}
const localEmpty: Local = { ts: Nil, vs: Nil, index: 0, indexErased: 0 };
const extend = (l: Local, ty: Val, bound: boolean, val: Val, erased: boolean = false): Local => ({
  ts: extendT(l.ts, ty, bound),
  vs: extendV(l.vs, val),
  index: l.index + 1,
  indexErased: erased ? l.indexErased : l.indexErased + 1,
});

const erasedUsed = (k: Ix, t: Term): boolean => {
  if (t.tag === 'Var') return t.index === k;
  if (t.tag === 'App') return erasedUsed(k, t.left) || (!t.plicity && erasedUsed(k, t.right));
  if (t.tag === 'Abs') return erasedUsed(k + 1, t.body);
  if (t.tag === 'Let') return erasedUsed(k + 1, t.body) || (!t.plicity && erasedUsed(k, t.val));
  if (t.tag === 'Roll') return erasedUsed(k, t.term);
  if (t.tag === 'Unroll') return erasedUsed(k, t.term);
  return false;
};

const check = (local: Local, tm: Term, ty: Val): void => {
  log(() => `check ${showTerm(tm)} : ${showTermQ(ty, local.index)} in ${showEnvT(local.ts, local.indexErased, false)} and ${showEnvV(local.vs, local.indexErased, false)}`);
  const tyf = force(ty);
  if (tm.tag === 'Abs' && !tm.type && tyf.tag === 'VPi' && tm.plicity === tyf.plicity) {
    const v = VVar(local.index);
    check(extend(local, tyf.type, true, v, tyf.plicity), tm.body, tyf.body(v));
    if (tm.plicity && erasedUsed(0, tm.body))
      return terr(`erased argument used in ${showTerm(tm)}`);
    return;
  }
  if (tm.tag === 'Abs' && !tm.type && tyf.tag === 'VPi' && !tm.plicity && tyf.plicity) {
    const v = VVar(local.index);
    check(extend(local, tyf.type, true, v, tyf.plicity), tm, tyf.body(v));
    return;
  }
  if (tm.tag === 'Let') {
    const vty = synth(local, tm.val);
    check(extend(local, vty, false, evaluate(tm.val, local.vs), tm.plicity), tm.body, ty);
    if (tm.plicity && erasedUsed(0, tm.body))
      return terr(`erased argument used in ${showTerm(tm)}`);
    return;
  }
  if (tyf.tag === 'VFix' && tm.tag === 'Abs') {
    check(local, tm, tyf.body(evaluate(tm, local.vs), ty));
    return;
  }
  const ty2 = synth(local, tm);
  try {
    log(() => `unify ${showTermQ(ty2, local.index)} ~ ${showTermQ(ty, local.index)}`);
    unify(local.index, ty2, ty);
    return;
  } catch(err) {
    if (!(err instanceof TypeError)) throw err;
    return terr(`failed to unify ${showTermQ(ty2, local.index)} ~ ${showTermQ(ty, local.index)}: ${err.message}`);
  }
};

const synth = (local: Local, tm: Term): Val => {
  log(() => `synth ${showTerm(tm)} in ${showEnvT(local.ts, local.indexErased, false)} and ${showEnvV(local.vs, local.indexErased, false)}`);
  if (tm.tag === 'Type') return VType;
  if (tm.tag === 'Var') {
    const res = index(local.ts, tm.index);
    if (!res) return terr(`var out of scope ${showTerm(tm)}`);
    return res[1];
  }
  if (tm.tag === 'Global') {
    const entry = globalGet(tm.name);
    if (!entry) return terr(`global ${tm.name} not found`);
    return entry.coretype;
  }
  if (tm.tag === 'App') {
    const fn = synth(local, tm.left);
    const rt = synthapp(local, tm.left, fn, tm.plicity, tm.right);
    return rt;
  }
  if (tm.tag === 'Abs' && tm.type) {
    check(local, tm.type, VType);
    const vtype = evaluate(tm.type, local.vs);
    const rt = synth(extend(local, vtype, true, VVar(local.index), tm.plicity), tm.body);
    if (tm.plicity && erasedUsed(0, tm.body))
      return terr(`erased argument used in ${showTerm(tm)}`);
    // TODO: avoid quote here
    const pi = evaluate(Pi(tm.plicity, tm.type, quote(rt, local.index + 1, false)), local.vs);
    return pi;
  }
  if (tm.tag === 'Let') {
    const vty = synth(local, tm.val);
    const rt = synth(extend(local, vty, false, evaluate(tm.val, local.vs), tm.plicity), tm.body);
    if (tm.plicity && erasedUsed(0, tm.body))
      return terr(`erased argument used in ${showTerm(tm)}`);
    return rt;
  }
  if (tm.tag === 'Pi') {
    check(local, tm.type, VType);
    check(extend(local, evaluate(tm.type, local.vs), true, VVar(local.index), false), tm.body, VType);
    return VType;
  }
  if (tm.tag === 'Fix') {
    check(local, tm.type, VType);
    const vty = evaluate(tm.type, local.vs);
    const vfix = evaluate(tm, local.vs);
    // TODO: is this correct?
    check(
      extend(
        extend(local, vfix, true, VVar(local.index), false),
          vty, false, vfix, false),
      tm.body, vty
    );
    return vty;
  }
  if (tm.tag === 'Roll') {
    check(local, tm.type, VType);
    const vt = evaluate(tm.type, local.vs);
    const vtf = force(vt);
    if (vtf.tag !== 'VFix')
      return terr(`fix type expected in ${showTerm(tm)}: ${showTermQ(vt, local.index)}`);
    check(local, tm.term, vtf.body(evaluate(tm, local.vs), vt));
    return vt;
  }
  if (tm.tag === 'Unroll') {
    const ty = synth(local, tm.term);
    const vt = force(ty);
    if (vt.tag !== 'VFix') 
      return terr(`fix type expected in ${showTerm(tm)}: ${showTermQ(vt, local.index)}`);
    return vt.body(evaluate(tm, local.vs), ty);
  }
  return terr(`cannot synth ${showTerm(tm)}`);
};

const synthapp = (local: Local, fn: Term, ty_: Val, plicity: Plicity, arg: Term): Val => {
  const ty = force(ty_);
  log(() => `synthapp ${showTermQ(ty, local.index)} ${plicity ? '-' : ''}@ ${showTerm(arg)} in ${showEnvT(local.ts, local.indexErased, false)} and ${showEnvV(local.vs, local.indexErased, false)}`);
  if (ty.tag === 'VFix') return synthapp(local, fn, ty.body(evaluate(fn, local.vs), ty_), plicity, arg);
  if (ty.tag === 'VPi' && ty.plicity === plicity) {
    check(local, arg, ty.type);
    const vm = evaluate(arg, local.vs);
    return ty.body(vm);
  }
  return terr(`invalid type or plicity mismatch in synthapp in ${showTermQ(ty, local.index)} ${plicity ? '-' : ''}@ ${showTerm(arg)}`);
};

export const typecheck = (tm_: Term): Val => {
  const ty = synth(localEmpty, tm_);
  return ty;
};
