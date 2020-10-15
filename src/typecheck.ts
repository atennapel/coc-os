import { log } from './config';
import { conv } from './conversion';
import { Pi, show, Term, Mode, ImplUnif } from './core';
import { getGlobal } from './globals';
import { Ix } from './names';
import { primType } from './primitives';
import { Cons, List, Nil } from './utils/list';
import { terr, tryT } from './utils/utils';
import { EnvV, evaluate, force, quote, showValZ, Val, vinst, vproj, VType, VVar } from './values';
import * as E from './erased';
import * as EV from './erasedvalues';
import { primErased } from './erasedprimitives';

type EntryT = [Val, boolean];
type EnvT = List<EntryT>;

interface Local {
  index: Ix;
  ts: EnvT;
  vs: EnvV;
  erased: boolean;
}
const Local = (index: Ix, ts: EnvT, vs: EnvV, erased: boolean): Local => ({ index, ts, vs, erased });
const localEmpty: Local = Local(0, Nil, Nil, false);
const localExtend = (local: Local, ty: Val, erased: boolean, val: Val = VVar(local.index)): Local =>
  Local(local.index + 1, Cons([ty, erased], local.ts), Cons(val, local.vs), local.erased);
const localErased = (local: Local): Local =>
  Local(local.index, local.ts, local.vs, true);

const indexT = (ts: EnvT, ix: Ix): [EntryT, Ix, number] | null => {
  let l = ts;
  let i = 0;
  let erased = 0;
  while (l.tag === 'Cons') {
    if (ix === 0) return [l.head, i, erased];
    if (l.head[1]) erased++;
    i++;
    ix--;
    l = l.tail;
  }
  return null;
};

const showVal = (local: Local, val: Val): string => showValZ(val, local.vs, local.index);

const check = (local: Local, tm: Term, ty: Val): E.Term => {
  log(() => `check ${show(tm)} : ${showVal(local, ty)}`);
  const [ty2, er] = synth(local, tm);
  tryT(() => conv(local. index, ty2, ty),
    e => terr(`check failed (${show(tm)}): ${showVal(local, ty2)} ~ ${showVal(local, ty)}: ${e}`));
  return er;
};

const synth = (local: Local, tm: Term): [Val, E.Term] => {
  log(() => `synth ${show(tm)}`);
  if (tm.tag === 'Prim') return [primType(tm.name), EV.quote(primErased(tm.name), 0, false)];
  if (tm.tag === 'Var') {
    const i = tm.index;
    const [entry, , erasedNo] = indexT(local.ts, i) || terr(`undefined index ${tm.index}`);
    if (entry[1] && !local.erased) return terr(`erased var used: ${show(tm)}`);
    return [entry[0], E.Var(i - erasedNo)];
  }
  if (tm.tag === 'Global') {
    const entry = getGlobal(tm.name);
    if (!entry) return terr(`global ${tm.name} not found`);
    return [entry.type, E.Global(tm.name)];
  }
  if (tm.tag === 'App') {
    const [ty, er] = synth(local, tm.left);
    const [ret, arg] = synthapp(local, ty, tm.mode, tm.right);
    return [ret, arg ? E.App(er, arg) : er];
  }
  if (tm.tag === 'Abs') {
    check(localErased(local), tm.type, VType);
    const ty = evaluate(tm.type, local.vs);
    const [rty, body] = synth(localExtend(local, ty, tm.erased), tm.body);
    return [evaluate(Pi(tm.mode, tm.erased, tm.name, tm.type, quote(rty, local.index + 1)), local.vs), tm.erased ? body : E.Abs(body)];
  }
  if (tm.tag === 'Pair') {
    check(localErased(local), tm.type, VType);
    const ty = evaluate(tm.type, local.vs);
    const fty = force(ty);
    if (fty.tag !== 'VSigma') return terr(`not a sigma type in pair: ${show(tm)}`);
    const fst = check(local, tm.fst, fty.type);
    const snd = check(local, tm.snd, vinst(fty, evaluate(tm.fst, local.vs)));
    return [ty, E.Pair(fst, snd)];
  }
  if (tm.tag === 'Proj') {
    const [ty, er] = synth(local, tm.term);
    const fty = force(ty);
    if (fty.tag !== 'VSigma') return terr(`not a sigma type in ${show(tm)}: ${showVal(local, ty)}`);
    if (tm.proj === 'fst' && fty.erased && !local.erased) return terr(`cannot project from erased sigma in non-erased context in ${show(tm)}: ${showVal(local, ty)}`);
    return [tm.proj === 'fst' ? fty.type : vinst(fty, vproj('fst', evaluate(tm.term, local.vs))), fty.erased ? er : E.Proj(tm.proj, er)];
  }
  if (tm.tag === 'Pi') {
    check(localErased(local), tm.type, VType);
    const ty = evaluate(tm.type, local.vs);
    check(localErased(localExtend(local, ty, tm.erased)), tm.body, VType);
    return [VType, E.termId];
  }
  if (tm.tag === 'Sigma') {
    check(localErased(local), tm.type, VType);
    const ty = evaluate(tm.type, local.vs);
    check(localErased(localExtend(local, ty, tm.erased)), tm.body, VType);
    return [VType, E.termId];
  }
  if (tm.tag === 'Let') {
    check(localErased(local), tm.type, VType);
    const ty = evaluate(tm.type, local.vs);
    const valEr = check(tm.erased ? localErased(local) : local, tm.val, ty);
    const val = evaluate(tm.val, local.vs);
    const [ret, body] = synth(localExtend(local, ty, tm.erased, val), tm.body);
    return [ret, tm.erased ? body : E.Let(valEr, body)];
  }
  return terr(`synth failed: ${show(tm)}`);
};

const synthapp = (local: Local, ty: Val, mode: Mode, tm: Term): [Val, E.Term | null] => {
  log(() => `synthapp ${showVal(local, ty)} @${mode === ImplUnif ? 'impl' : ''} ${show(tm)}`);
  const fty = force(ty);
  if (fty.tag === 'VPi' && fty.mode === mode) {
    const er = check(fty.erased ? localErased(local) : local, tm, fty.type);
    const v = evaluate(tm, local.vs);
    return [vinst(fty, v), fty.erased ? null : er];
  }
  return terr(`not a correct pi type in synthapp: ${showVal(local, ty)} @${mode === ImplUnif ? 'impl' : ''} ${show(tm)}`);
};

export const typecheck = (t: Term, erased: boolean = false): [Term, E.Term] => {
  const [ty, er] = synth(erased ? localErased(localEmpty) : localEmpty, t);
  return [quote(ty, 0), er];
};
