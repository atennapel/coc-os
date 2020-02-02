import { EnvV, Val, quote, evaluate, VType, extendV, VVar, showTermQ, force } from './domain';
import { Term, showTerm, Pi } from './syntax';
import { terr, impossible } from '../util';
import { Ix, Name } from '../names';
import { index, Nil } from '../list';
import { globalGet, globalSet } from './globalenv';
import { eqMeta } from '../syntax';
import { unify } from './unify';
import { Def } from './definitions';

const erasedUsed = (k: Ix, t: Term): boolean => {
  if (t.tag === 'Var') return t.index === k;
  if (t.tag === 'Global') return false;
  if (t.tag === 'App') return erasedUsed(k, t.left) || (!t.meta.erased && erasedUsed(k, t.right));
  if (t.tag === 'Abs') return erasedUsed(k + 1, t.body);
  if (t.tag === 'Let') return erasedUsed(k + 1, t.body) || (!t.meta.erased && erasedUsed(k, t.val));
  if (t.tag === 'Roll') return erasedUsed(k, t.term);
  if (t.tag === 'Unroll') return erasedUsed(k, t.term);
  if (t.tag === 'Ann') return erasedUsed(k, t.term);
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
    if (ty.tag === 'VPi' && eqMeta(ty.meta, tm.meta)) {
      check(ts, vs, k, tm.right, ty.type);
      return ty.body(evaluate(tm.right, vs));
    }
    return terr(`invalid type or meta mismatch in synthapp in ${showTerm(tm)}: ${showTermQ(ty, k)} ${tm.meta.erased ? '-' : ''}@ ${showTerm(tm.right)}`);
  }
  if (tm.tag === 'Abs') {
    check(ts, vs, k, tm.type, VType);
    const type = evaluate(tm.type, vs);
    const rt = synth(extendV(ts, type), extendV(vs, VVar(k)), k + 1, tm.body);
    if (tm.meta.erased && erasedUsed(0, tm.body))
      return terr(`erased argument used in ${showTerm(tm)}`);
    // TODO: avoid quote here
    return evaluate(Pi(tm.meta, tm.name, tm.type, quote(rt, k + 1, false)), vs);
  }
  if (tm.tag === 'Let') {
    const vty = synth(ts, vs, k, tm.val);
    const rt = synth(extendV(ts, vty), extendV(vs, evaluate(tm.val, vs)), k + 1, tm.body);
    if (tm.meta.erased && erasedUsed(0, tm.body))
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
  if (tm.tag === 'Ann') {
    check(ts, vs, k, tm.type, VType);
    const vt = evaluate(tm.type, vs);
    check(ts, vs, k, tm.term, vt);
    return vt;
  }
  return terr(`cannot synth ${showTerm(tm)}`);
};

export const typecheck = (tm: Term, ts: EnvV = Nil, vs: EnvV = Nil, k: Ix = 0, full: boolean = false): Term =>
  quote(synth(ts, vs, k, tm), k, full);

export const typecheckDefs = (ds: Def[]): Name[] => {
  const xs: Name[] = [];
  for (let i = 0; i < ds.length; i++) {
    const d = ds[i];
    if (d.tag === 'DDef') {
      const ty = typecheck(d.value, Nil, Nil, 0, false);
      globalSet(d.name, evaluate(d.value), evaluate(ty));
      xs.push(d.name);
    }
  }
  return xs;
};
