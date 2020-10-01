import { log } from './config';
import { conv } from './conversion';
import { Pi, show, Term, Mode, ImplUnif } from './core';
import { Ix } from './names';
import { primType } from './primitives';
import { Cons, index, List, Nil } from './utils/list';
import { terr, tryT } from './utils/utils';
import { EnvV, evaluate, force, quote, showValZ, Val, vinst, vproj, VType, VVar } from './values';

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
  if (tm.tag === 'Prim') return primType(tm.name);
  if (tm.tag === 'Var') {
    const ty = index(local.ts, tm.index);
    if (!ty) return terr(`undefined index ${tm.index}`);
    return ty;
  }
  if (tm.tag === 'App') {
    const ty = synth(local, tm.left);
    return synthapp(local, ty, tm.mode, tm.right);
  }
  if (tm.tag === 'Abs') {
    check(local, tm.type, VType);
    const ty = evaluate(tm.type, local.vs);
    const rty = synth(localExtend(local, ty), tm.body);
    return evaluate(Pi(tm.mode, tm.name, tm.type, quote(rty, local.index + 1)), local.vs);
  }
  if (tm.tag === 'Pair') {
    check(local, tm.type, VType);
    const ty = evaluate(tm.type, local.vs);
    const fty = force(ty);
    if (fty.tag !== 'VSigma') return terr(`not a sigma type in pair: ${show(tm)}`);
    check(local, tm.fst, fty.type);
    check(local, tm.snd, vinst(fty, evaluate(tm.fst, local.vs)));
    return ty;
  }
  if (tm.tag === 'Proj') {
    const ty = synth(local, tm.term);
    const fty = force(ty);
    if (fty.tag !== 'VSigma') return terr(`not a sigma type in ${tm.proj}: ${show(tm)}: ${showVal(local, ty)}`);
    return tm.proj === 'fst' ? fty.type : vinst(fty, vproj('fst', evaluate(tm.term, local.vs)));
  }
  if (tm.tag === 'Pi') {
    check(local, tm.type, VType);
    const ty = evaluate(tm.type, local.vs);
    check(localExtend(local, ty), tm.body, VType);
    return VType;
  }
  if (tm.tag === 'Sigma') {
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

const synthapp = (local: Local, ty: Val, mode: Mode, tm: Term): Val => {
  log(() => `synthapp ${showVal(local, ty)} @${mode === ImplUnif ? 'impl' : ''} ${show(tm)}`);
  const fty = force(ty);
  if (fty.tag === 'VPi' && fty.mode === mode) {
    check(local, tm, fty.type);
    const v = evaluate(tm, local.vs);
    return vinst(fty, v);
  }
  return terr(`not a correct pi type in synthapp: ${showVal(local, ty)} @${mode === ImplUnif ? 'impl' : ''} ${show(tm)}`);
};

export const typecheck = (t: Term): Term => {
  const ty = synth(localEmpty, t);
  return quote(ty, 0);
};
