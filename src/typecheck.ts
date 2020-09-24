import { log } from './config';
import { conv } from './conversion';
import { Pi, show, Term } from './core';
import { Ix } from './names';
import { Cons, index, List, Nil } from './utils/list';
import { terr, tryT } from './utils/utils';
import { EnvV, evaluate, quote, showValZ, Val, vinst, VType, VVar } from './values';

type EnvT = List<Val>;

interface Local {
  index: Ix;
  ts: EnvT;
  vs: EnvV;
}
const Local = (index: Ix, ts: EnvT, vs: EnvT): Local => ({ index, ts, vs });
const localEmpty: Local = Local(0, Nil, Nil);
const localExtend = (local: Local, ty: Val, val: Val = VVar(local.index)): Local =>
  Local(local.index + 1, Cons(ty, local.ts), Cons(val, local.vs));

const showVal = (local: Local, val: Val): string => showValZ(val, local.vs, local.index);

const check = (local: Local, tm: Term, ty: Val): void => {
  log(() => `check ${show(tm)} : ${showVal(local, ty)}`);
  const ty2 = synth(local, tm);
  tryT(() => conv(local. index, ty2, ty),
    e => terr(`check failed (${show(tm)}): ${showVal(local, ty2)} ~ ${showVal(local, ty)}: ${e}`));
};

const synth = (local: Local, tm: Term): Val => {
  log(() => `synth ${show(tm)}`);
  if (tm.tag === 'Type') return VType;
  if (tm.tag === 'Var') {
    const ty = index(local.ts, tm.index);
    if (!ty) return terr(`undefined index ${tm.index}`);
    return ty;
  }
  if (tm.tag === 'App') {
    const ty = synth(local, tm.left);
    return synthapp(local, ty, tm.right);
  }
  if (tm.tag === 'Abs') {
    check(local, tm.type, VType);
    const ty = evaluate(tm.type, local.vs);
    const rty = synth(localExtend(local, ty), tm.body);
    return evaluate(Pi(tm.name, tm.type, quote(rty, local.index + 1)), local.vs);
  }
  if (tm.tag === 'Pi') {
    check(local, tm.type, VType);
    const ty = evaluate(tm.type, local.vs);
    check(localExtend(local, ty), tm.body, VType);
    return VType;
  }
  if (tm.tag === 'Let') {
    check(local, tm.type, VType);
    const ty = evaluate(tm.type, local.vs);
    check(local, tm.val, ty);
    const val = evaluate(tm.val, local.vs);
    return synth(localExtend(local, ty, val), tm.body);
  }
  return terr(`synth failed: ${show(tm)}`);
};

const synthapp = (local: Local, ty: Val, tm: Term): Val => {
  log(() => `synthapp ${showVal(local, ty)} @ ${show(tm)}`);
  if (ty.tag === 'VPi') {
    check(local, tm, ty.type);
    const v = evaluate(tm, local.vs);
    return vinst(ty, v);
  }
  return terr(`not a pi type in synthapp: ${showVal(local, ty)}`);
};

export const typecheck = (t: Term): Term => {
  const ty = synth(localEmpty, t);
  return quote(ty, 0);
};
