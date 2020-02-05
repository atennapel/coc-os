import { EnvV, Val, quote, evaluate, VType, extendV, VVar, showTermU, force, showEnvV } from './domain';
import { Term, showFromSurface, Pi, App, Abs, Let, Fix, Roll, Unroll, showTerm } from './syntax';
import { terr } from '../util';
import { Ix, Name } from '../names';
import { index, Nil, List, Cons } from '../list';
import { globalGet, globalSet } from './globalenv';
import { eqPlicity } from '../syntax';
import { unify } from './unify';
import { Def, showDef } from './definitions';
import { log } from '../config';

const erasedUsed = (k: Ix, t: Term): boolean => {
  if (t.tag === 'Var') return t.index === k;
  if (t.tag === 'Global') return false;
  if (t.tag === 'App') return erasedUsed(k, t.left) || (!t.plicity.erased && erasedUsed(k, t.right));
  if (t.tag === 'Abs') return erasedUsed(k + 1, t.body);
  if (t.tag === 'Let') return erasedUsed(k + 1, t.body) || (!t.plicity.erased && erasedUsed(k, t.val));
  if (t.tag === 'Roll') return erasedUsed(k, t.term);
  if (t.tag === 'Unroll') return erasedUsed(k, t.term);
  if (t.tag === 'Ann') return erasedUsed(k, t.term);
  if (t.tag === 'Pi') return false;
  if (t.tag === 'Fix') return false;
  if (t.tag === 'Type') return false;
  if (t.tag === 'Hole') return false;
  if (t.tag === 'Meta') return false;
  return t;
};

const check = (ns: List<Name>, ts: EnvV, vs: EnvV, k: Ix, tm: Term, ty: Val): Term => {
  log(() => `check ${showFromSurface(tm, ns)} : ${showTermU(ty, ns, k)} in ${showEnvV(ts, k, false)} and ${showEnvV(vs, k, false)}`);
  const tyf = force(ty);
  if (tm.tag === 'Abs' && !tm.type && tyf.tag === 'VPi' && eqPlicity(tm.plicity, tyf.plicity)) {
    const v = VVar(k);
    const body = check(Cons(tm.name, ns), extendV(ts, tyf.type), extendV(vs, v), k + 1, tm.body, tyf.body(v));
    if (tm.plicity.erased && erasedUsed(0, tm.body))
      return terr(`erased argument used in ${showFromSurface(tm, ns)}`);
    return Abs(tm.plicity, tm.name, quote(tyf.type, k, false), body);
  }
  if (tm.tag === 'Roll' && !tm.type && tyf.tag === 'VFix') {
    const term = check(ns, ts, vs, k, tm.term, tyf.body(ty));
    return Roll(quote(ty, k, false), term);
  }
  if (tm.tag === 'Let') {
    const [val, vty] = synth(ns, ts, vs, k, tm.val);
    const body = check(Cons(tm.name, ns), extendV(ts, vty), extendV(vs, evaluate(val, vs)), k + 1, tm.body, ty);
    if (tm.plicity.erased && erasedUsed(0, tm.body))
      return terr(`erased argument used in ${showFromSurface(tm, ns)}`);
    return Let(tm.plicity, tm.name, val, body);
  }
  const [etm, ty2] = synth(ns, ts, vs, k, tm);
  try {
    unify(ns, k, ty2, ty);
  } catch(err) {
    if (!(err instanceof TypeError)) throw err;
    terr(`failed to unify ${showTermU(ty2, ns, k)} ~ ${showTermU(ty, ns, k)}: ${err.message}`);
  }
  return etm;
};

const synth = (ns: List<Name>, ts: EnvV, vs: EnvV, k: Ix, tm: Term): [Term, Val] => {
  log(() => `synth ${showFromSurface(tm, ns)} in ${showEnvV(ts, k, false)} and ${showEnvV(vs, k, false)}`);
  if (tm.tag === 'Type') return [tm, VType];
  if (tm.tag === 'Var') {
    const ty = index(ts, tm.index);
    if (!ty) return terr(`var out of scope ${showFromSurface(tm, ns)}`);
    return [tm, ty];
  }
  if (tm.tag === 'Global') {
    const entry = globalGet(tm.name);
    if (!entry) return terr(`global ${tm.name} not found`);
    return [tm, entry.type];
  }
  if (tm.tag === 'App') {
    const [left, ty_] = synth(ns, ts, vs, k, tm.left);
    const ty = force(ty_);
    if (ty.tag === 'VPi' && eqPlicity(ty.plicity, tm.plicity)) {
      const right = check(ns, ts, vs, k, tm.right, ty.type);
      return [App(left, tm.plicity, right), ty.body(evaluate(right, vs))];
    }
    return terr(`invalid type or plicity mismatch in synthapp in ${showFromSurface(tm, ns)}: ${showTermU(ty, ns, k)} ${tm.plicity.erased ? '-' : ''}@ ${showFromSurface(tm.right, ns)}`);
  }
  if (tm.tag === 'Abs' && tm.type) {
    const type = check(ns, ts, vs, k, tm.type, VType);
    const vtype = evaluate(type, vs);
    const [body, rt] = synth(Cons(tm.name, ns), extendV(ts, vtype), extendV(vs, VVar(k)), k + 1, tm.body);
    if (tm.plicity.erased && erasedUsed(0, tm.body))
      return terr(`erased argument used in ${showFromSurface(tm, ns)}`);
    // TODO: avoid quote here
    const pi = evaluate(Pi(tm.plicity, tm.name, type, quote(rt, k + 1, false)), vs);
    return [Abs(tm.plicity, tm.name, type, body), pi];
  }
  if (tm.tag === 'Let') {
    const [val, vty] = synth(ns, ts, vs, k, tm.val);
    const [body, rt] = synth(Cons(tm.name, ns), extendV(ts, vty), extendV(vs, evaluate(val, vs)), k + 1, tm.body);
    if (tm.plicity.erased && erasedUsed(0, tm.body))
      return terr(`erased argument used in ${showFromSurface(tm, ns)}`);
    return [Let(tm.plicity, tm.name, val, body), rt];
  }
  if (tm.tag === 'Pi') {
    const type = check(ns, ts, vs, k, tm.type, VType);
    const body = check(Cons(tm.name, ns), extendV(ts, evaluate(type, vs)), extendV(vs, VVar(k)), k + 1, tm.body, VType);
    return [Pi(tm.plicity, tm.name, type, body), VType];
  }
  if (tm.tag === 'Fix') {
    const type = check(ns, ts, vs, k, tm.type, VType);
    const vt = evaluate(type, vs);
    const body = check(Cons(tm.name, ns), extendV(ts, vt), extendV(vs, VVar(k)), k + 1, tm.body, vt);
    return [Fix(tm.name, type, body), vt];
  }
  if (tm.tag === 'Roll' && tm.type) {
    const type = check(ns, ts, vs, k, tm.type, VType);
    const vt = evaluate(type, vs);
    const vtf = force(vt);
    if (vtf.tag === 'VFix') {
      const term = check(ns, ts, vs, k, tm.term, vtf.body(vt));
      return [Roll(type, term), vt];
    }
    return terr(`fix type expected in ${showFromSurface(tm, ns)}: ${showTermU(vt, ns, k)}`);
  }
  if (tm.tag === 'Unroll') {
    const [term, ty] = synth(ns, ts, vs, k, tm.term);
    const vt = force(ty);
    if (vt.tag === 'VFix') return [Unroll(term), vt.body(ty)];
    return terr(`fix type expected in ${showFromSurface(tm, ns)}: ${showTermU(vt, ns, k)}`);
  }
  if (tm.tag === 'Ann') {
    const type = check(ns, ts, vs, k, tm.type, VType);
    const vt = evaluate(type, vs);
    const term = check(ns, ts, vs, k, tm.term, vt);
    return [term, vt];
  }
  return terr(`cannot synth ${showFromSurface(tm, ns)}`);
};

export const typecheck = (tm: Term): [Term, Val] =>
  synth(Nil, Nil, Nil, 0, tm);

export const typecheckDefs = (ds: Def[], allowRedefinition: boolean = false): Name[] => {
  const xs: Name[] = [];
  if (!allowRedefinition) {
    for (let i = 0; i < ds.length; i++) {
      const d = ds[i];
      if (d.tag === 'DDef'&& globalGet(d.name))
        return terr(`cannot redefine global ${d.name}`);
    }
  }
  for (let i = 0; i < ds.length; i++) {
    const d = ds[i];
    log(() => `typecheckDefs ${showDef(d)}`);
    if (d.tag === 'DDef') {
      const [tm, ty] = typecheck(d.value);
      log(() => `set ${d.name} = ${showTerm(tm)}`);
      globalSet(d.name, evaluate(tm), ty);
      xs.push(d.name);
    }
  }
  return xs;
};
