import { log } from './config';
import { Core, Pi, show } from './core';
import { getGlobal } from './globals';
import { indexEnvT, Local } from './local';
import { synthAxiom } from './axioms';
import { impossible, terr, tryT } from './utils/utils';
import { evaluate, force, quote, Val, vinst } from './values';
import * as V from './values';
import { unify } from './unification';

const showV = (local: Local, v: Val) => V.show(v, local.level);

const check = (local: Local, tm: Core, ty: Val): void => {
  log(() => `check ${show(tm)} : ${showV(local, ty)}`);
  const ty2 = synth(local, tm);
  return tryT(() => {
    log(() => `unify ${showV(local, ty2)} ~ ${showV(local, ty)}`);
    unify(local.level, ty2, ty);
    return;
  }, e => terr(`check failed (${show(tm)}): ${showV(local, ty2)} ~ ${showV(local, ty)}: ${e}`));
};

const synthSort = (local: Local, s1: Val, s2: Val): Val => {
  const s1f = force(s1);
  const s2f = force(s2);
  if (s1f.tag === 'VSort' && s2f.tag === 'VSort' && !(s1f.sort === '*' && s2f.sort === '**'))
    return s2;
  return terr(`sort check failed: ${showV(local, s1)} and ${showV(local, s2)}`);
};
const checkSort = (local: Local, s: Val): void => {
  const ss = force(s);
  if (ss.tag !== 'VSort') return terr(`expected sort but got ${showV(local, s)}`);
}

const synth = (local: Local, tm: Core): Val => {
  log(() => `synth ${show(tm)}`);
  if (tm.tag === 'Sort') {
    if (!local.erased) return terr(`sort type in non-type context: ${show(tm)}`);
    return tm.sort === '*' ? V.VBox : impossible(`${tm.sort} (**) in typecheck`);
  }
  if (tm.tag === 'Axiom') return synthAxiom(tm.name);
  if (tm.tag === 'Var') {
    const [entry] = indexEnvT(local.ts, tm.index) || terr(`var out of scope ${show(tm)}`);
    if (entry.erased && !local.erased) return terr(`erased var used ${show(tm)}`);
    return entry.type;
  }
  if (tm.tag === 'Global') {
    const e = getGlobal(tm.name);
    if (!e) return terr(`undefined global ${show(tm)}`);
    if (!e.erasedTerm && !local.erased) return terr(`erased global used: ${show(tm)}`);
    return e.type;
  }
  if (tm.tag === 'App') {
    const fnty = synth(local, tm.fn);
    const rty = synthapp(local, fnty, tm.erased, tm.arg);
    return rty;
  }
  if (tm.tag === 'Abs') {
    const s1 = synth(local.inType(), tm.type);
    checkSort(local, s1);
    const ty = evaluate(tm.type, local.vs);
    const rty = synth(local.bind(tm.erased, tm.name, ty), tm.body);
    const qpi = Pi(tm.erased, tm.name, tm.type, quote(rty, local.level + 1));
    synth(local.inType(), qpi); // TODO: improve sort check
    const pi = evaluate(qpi, local.vs);
    return pi;
  }
  if (tm.tag === 'Pi') {
    if (!local.erased) return terr(`pi type in non-type context: ${show(tm)}`);
    const s1 = synth(local.inType(), tm.type);
    const ty = evaluate(tm.type, local.vs);
    const s2 = synth(local.inType().bind(tm.erased, tm.name, ty), tm.body);
    return synthSort(local, s1, s2);
  }
  if (tm.tag === 'Let') {
    const s1 = synth(local.inType(), tm.type);
    checkSort(local, s1);
    const ty = evaluate(tm.type, local.vs);
    check(tm.erased ? local.inType() : local, tm.val, ty);
    const v = evaluate(tm.val, local.vs);
    const rty = synth(local.define(tm.erased, tm.name, ty, v), tm.body);
    return rty;
  }
  if (tm.tag === 'Meta' || tm.tag === 'InsertedMeta') return impossible(`${tm.tag} in typecheck`)
  return tm;
};

const synthapp = (local: Local, ty_: Val, erased: boolean, arg: Core): Val => {
  log(() => `synthapp ${showV(local, ty_)} ${erased ? '-' : ''}@ ${show(arg)}`);
  const ty = force(ty_);
  if (ty.tag === 'VPi' && ty.erased === erased) {
    const cty = ty.type;
    check(erased ? local.inType() : local, arg, cty);
    const v = evaluate(arg, local.vs);
    return vinst(ty, v);
  }
  return terr(`not a correct pi type in synthapp: ${showV(local, ty)} ${erased ? '-' : ''}@ ${show(arg)}`);
};

export const typecheck = (t: Core, local: Local = Local.empty()): Core => {
  const vty = synth(local, t);
  const ty = quote(vty, local.level);
  return ty;
};
