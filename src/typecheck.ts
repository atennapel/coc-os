import { log } from './config';
import { Core, Pi, show } from './core';
import { getGlobal } from './globals';
import { indexEnvT, Local } from './local';
import { impossible, terr, tryT } from './utils/utils';
import { evaluate, force, quote, Val, vinst, VType } from './values';
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

const synth = (local: Local, tm: Core): Val => {
  log(() => `synth ${show(tm)}`);
  if (tm.tag === 'Type') {
    if (!local.erased) return terr(`type in non-type context: ${show(tm)}`);
    return VType;
  }
  if (tm.tag === 'Var') {
    const [entry] = indexEnvT(local.ts, tm.index) || terr(`var out of scope ${show(tm)}`);
    if (entry.erased && !local.erased) return terr(`erased var used ${show(tm)}`);
    return entry.type;
  }
  if (tm.tag === 'Global') {
    const e = getGlobal(tm.name);
    if (!e) return terr(`undefined global ${show(tm)}`);
    if (e.erased && !local.erased) return terr(`erased global used: ${show(tm)}`);
    return e.type;
  }
  if (tm.tag === 'App') {
    const fnty = synth(local, tm.fn);
    const rty = synthapp(local, fnty, tm.erased, tm.arg);
    return rty;
  }
  if (tm.tag === 'Abs') {
    check(local.inType(), tm.type, VType);
    const ty = evaluate(tm.type, local.vs);
    const rty = synth(local.bind(tm.erased, tm.name, ty), tm.body);
    const qpi = Pi(tm.erased, tm.name, tm.type, quote(rty, local.level + 1));
    const pi = evaluate(qpi, local.vs);
    return pi;
  }
  if (tm.tag === 'Pi') {
    if (!local.erased) return terr(`pi type in non-type context: ${show(tm)}`);
    check(local.inType(), tm.type, VType);
    const ty = evaluate(tm.type, local.vs);
    check(local.inType().bind(tm.erased, tm.name, ty), tm.body, VType);
    return VType;
  }
  if (tm.tag === 'Let') {
    check(local.inType(), tm.type, VType);
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
