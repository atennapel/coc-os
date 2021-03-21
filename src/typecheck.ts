import { log } from './config';
import { Core, liftType, Pi, show } from './core';
import { getGlobal } from './globals';
import { indexEnvT, Local } from './local';
import { impossible, terr, tryT } from './utils/utils';
import { evaluate, force, quote, Val, vinst, VType } from './values';
import * as V from './values';
import { unify } from './unification';
import { Ix } from './names';

const showV = (local: Local, v: Val) => V.show(v, local.level);

const check = (local: Local, tm: Core, ty: Val, u: Ix): void => {
  log(() => `check (*${u}) ${show(tm)} : ${showV(local, ty)}`);
  const [ty2, u2] = synth(local, tm);
  return tryT(() => {
    if (u !== u2) return terr(`universe mismatch: *${u2} ~ *${u}`);
    log(() => `unify ${showV(local, ty2)} ~ ${showV(local, ty)}`);
    unify(local.level, ty2, ty);
    return;
  }, e => terr(`check failed (${show(tm)}): ${showV(local, ty2)} ~ ${showV(local, ty)}: ${e}`));
};

const synthType = (local: Local, tm: Core): Ix => {
  const [ty] = synth(local, tm);
  const fty = force(ty);
  if (fty.tag !== 'VType') return terr(`expected type but got ${showV(local, ty)}, while synthesizing ${show(tm)}`);
  return fty.index;
};

const synth = (local: Local, tm: Core): [Val, Ix] => {
  log(() => `synth ${show(tm)}`);
  if (tm.tag === 'Type') {
    if (!local.erased) return terr(`type in non-type context: ${show(tm)}`);
    return [VType(tm.index + 1), tm.index + 2];
  }
  if (tm.tag === 'Var') {
    const [entry] = indexEnvT(local.ts, tm.index) || terr(`var out of scope ${show(tm)}`);
    if (entry.erased && !local.erased) return terr(`erased var used ${show(tm)}`);
    return [entry.type, entry.universe];
  }
  if (tm.tag === 'Global') {
    const e = getGlobal(tm.name);
    if (!e) return terr(`undefined global ${show(tm)}`);
    if (e.erased && !local.erased) return terr(`erased global used: ${show(tm)}`);
    if (tm.lift === 0) {
      return [e.type, e.universe];
    } else {
      return [evaluate(liftType(tm.lift, e.etype), local.vs), e.universe + tm.lift];
    }
  }
  if (tm.tag === 'App') {
    const [fnty] = synth(local, tm.fn);
    const rty = synthapp(local, fnty, tm.erased, tm.arg);
    return rty;
  }
  if (tm.tag === 'Abs') {
    const u1 = synthType(local.inType(), tm.type);
    const ty = evaluate(tm.type, local.vs);
    const [rty, u2] = synth(local.bind(tm.erased, tm.name, ty, u1), tm.body);
    const qpi = Pi(tm.erased, tm.name, tm.type, u1, quote(rty, local.level + 1), u2);
    const pi = evaluate(qpi, local.vs);
    return [pi, Math.max(u1, u2)];
  }
  if (tm.tag === 'Pair') {
    synthType(local.inType(), tm.type);
    const ty = evaluate(tm.type, local.vs);
    const fty = force(ty);
    if (fty.tag !== 'VSigma') return terr(`not a sigma type in pair (${show(tm)}): ${showV(local, ty)}`);
    if (tm.erased !== fty.erased) return terr(`erasure mismatch in pair (${show(tm)}): ${showV(local, ty)}`);
    check(tm.erased ? local.inType() : local, tm.fst, fty.type, fty.u1);
    check(local, tm.snd, vinst(fty, evaluate(tm.fst, local.vs)), fty.u2);
    return [ty, fty.u2];
  }
  if (tm.tag === 'Proj') {
    const [ty] = synth(local, tm.term);
    const fty = force(ty);
    if (fty.tag !== 'VSigma') return terr(`not a sigma type in proj (${show(tm)}): ${showV(local, ty)}`);
    return tm.proj === 'fst' ? [fty.type, fty.u1] : [vinst(fty, V.vproj('fst', evaluate(tm, local.vs))), fty.u2];
  }
  if (tm.tag === 'Pi') {
    if (!local.erased) return terr(`pi type in non-type context: ${show(tm)}`);
    const s1 = synthType(local.inType(), tm.type);
    const ty = evaluate(tm.type, local.vs);
    const s2 = synthType(local.inType().bind(tm.erased, tm.name, ty, s1), tm.body);
    const u = Math.max(s1, s2);
    return [VType(u), u + 1];
  }
  if (tm.tag === 'Sigma') {
    if (!local.erased) return terr(`sigma type in non-type context: ${show(tm)}`);
    const s1 = synthType(local.inType(), tm.type);
    const ty = evaluate(tm.type, local.vs);
    const s2 = synthType(local.inType().bind(tm.erased, tm.name, ty, s1), tm.body);
    const u = Math.max(s1, s2);
    return [VType(u), u + 1];
  }
  if (tm.tag === 'Let') {
    const u1 = synthType(local.inType(), tm.type);
    const ty = evaluate(tm.type, local.vs);
    check(tm.erased ? local.inType() : local, tm.val, ty, u1);
    const v = evaluate(tm.val, local.vs);
    const rty = synth(local.define(tm.erased, tm.name, ty, v, u1), tm.body);
    return rty;
  }
  if (tm.tag === 'Enum') {
    if (!local.erased) return terr(`enum type in non-type context: ${show(tm)}`);
    return [VType(0), 1];
  }
  if (tm.tag === 'EnumLit') {
    if (tm.val >= tm.num) return terr(`invalid enum literal: ${show(tm)}`);
    return [V.VEnum(tm.num), 0];
  }
  if (tm.tag === 'ElimEnum') {
    if (tm.cases.length !== tm.num) return terr(`cases amount mismatch, expected ${tm.num} but got ${tm.cases.length}: ${show(tm)}`);
    /*
    P : #n^l -> *l
    x : #n^l
    ci : P (@i/n^l)
    ----------------------
    ?n^l P x c1 ... cn : P x
    */
    const u = tm.lift + 1;
    check(local.inType(), tm.motive, V.VPi(false, '_', V.VEnum(tm.num), 0, _ => VType(tm.lift), u), u);
    const motive = evaluate(tm.motive, local.vs);
    check(local, tm.scrut, V.VEnum(tm.num), 0);
    const scrut = evaluate(tm.scrut, local.vs);
    tm.cases.forEach((c, i) => check(local, c, V.vapp(motive, false, V.VEnumLit(i, tm.num)), tm.lift));
    return [V.vapp(motive, false, scrut), tm.lift];
  }
  if (tm.tag === 'Lift') {
    if (!local.erased) return terr(`Lift type in non-type context: ${show(tm)}`);
    /*
    t : *k : u
    -------------------
    Lift t : *(k + 1) : u + 1
    */
    const [ty, u] = synth(local, tm.type);
    const vty = force(ty);
    if (vty.tag !== 'VType') return terr(`not a type in ${show(tm)}: ${showV(local, ty)}`);
    return [VType(vty.index + 1), u + 1];
  }
  if (tm.tag === 'LiftTerm') {
    /*
    t : A : u
    -------------------
    lift t : Lift A : u + 1
    */
    const [ty, u] = synth(local, tm.term);
    return [V.VLift(ty), u + 1];
  }
  if (tm.tag === 'Lower') {
    /*
    t : Lift A : u
    -------------------
    lower t : A : u - 1
    */
    const [ty, u] = synth(local, tm.term);
    const vty = force(ty);
    if (vty.tag !== 'VLift') return terr(`not a Lift type in ${show(tm)}: ${showV(local, ty)}`);
    return [vty.type, u - 1];
  }
  if (tm.tag === 'Meta' || tm.tag === 'InsertedMeta') return impossible(`${tm.tag} in typecheck`);
  return tm;
};

const synthapp = (local: Local, ty_: Val, erased: boolean, arg: Core): [Val, Ix] => {
  log(() => `synthapp ${showV(local, ty_)} ${erased ? '-' : ''}@ ${show(arg)}`);
  const ty = force(ty_);
  if (ty.tag === 'VPi' && ty.erased === erased) {
    check(erased ? local.inType() : local, arg, ty.type, ty.u1);
    const v = evaluate(arg, local.vs);
    return [vinst(ty, v), ty.u2];
  }
  return terr(`not a correct pi type in synthapp: ${showV(local, ty)} ${erased ? '-' : ''}@ ${show(arg)}`);
};

export const typecheck = (t: Core, local: Local = Local.empty()): [Core, Ix] => {
  const [vty, u] = synth(local, t);
  const ty = quote(vty, local.level);
  return [ty, u];
};
