import { config, log } from './config';
import { conv } from './conversion';
import { Pi, show, Term, Mode } from './core';
import { getGlobal } from './globals';
import { Ix, Name } from './names';
import { primType } from './primitives';
import { Cons, List, listFrom, listToString, Nil } from './utils/list';
import { terr, tryT } from './utils/utils';
import { EnvV, evaluate, force, quote, Val, vinst, vproj, VType, VVar } from './values';
import * as E from './erased';
import * as EV from './erasedvalues';
import { primErased } from './erasedprimitives';
import { getMeta } from './context';
import * as S from './surface';
import { getFromBase } from './base';
import * as V from './values';
import * as C from './core';

type EntryT = [Val, boolean];
type EnvT = List<EntryT>;

interface Local {
  index: Ix;
  ns: List<Name>;
  ts: EnvT;
  vs: EnvV;
  erased: boolean;
}
const Local = (index: Ix, ns: List<Name>, ts: EnvT, vs: EnvV, erased: boolean): Local => ({ index, ns, ts, vs, erased });
const localEmpty: Local = Local(0, Nil, Nil, Nil, false);
const localExtend = (local: Local, name: Name, ty: Val, erased: boolean, val: Val = VVar(local.index)): Local =>
  Local(local.index + 1, Cons(name, local.ns), Cons([ty, erased], local.ts), Cons(val, local.vs), local.erased);
const localErased = (local: Local): Local => Local(local.index, local.ns, local.ts, local.vs, true);

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

const showTerm = (local: Local, tm: Term): string => S.showCore(tm, local.ns);
const showVal = (local: Local, val: Val): string => S.showValZ(val, local.vs, local.index, local.ns);

const check = (local: Local, tm: Term, ty: Val): E.Term => {
  log(() => `check ${showTerm(local, tm)} : ${showVal(local, ty)}`);
  const [ty2, er] = synth(local, tm);
  tryT(() => conv(local. index, ty2, ty),
    e => terr(`check failed (${showTerm(local, tm)}): ${showVal(local, ty2)} ~ ${showVal(local, ty)}: ${e}`));
  return er;
};

const synth = (local: Local, tm: Term): [Val, E.Term] => {
  log(() => `synth ${showTerm(local, tm)}`);
  if (tm.tag === 'Prim') return [primType(tm.name), EV.quote(primErased(tm.name), 0, false)];
  if (tm.tag === 'Var') {
    const i = tm.index;
    const [entry, , erasedNo] = indexT(local.ts, i) || terr(`undefined index ${tm.index}`);
    if (entry[1] && !local.erased) return terr(`erased var used: ${showTerm(local, tm)}`);
    return [entry[0], E.Var(i - erasedNo)];
  }
  if (tm.tag === 'Global') {
    let ty: Val;
    if (config.useBase) {
      const [, type] = getFromBase(tm.name, local.erased);
      ty = evaluate(type, Nil);
    } else {
      const entry = getGlobal(tm.name);
      if (!entry) return terr(`global ${tm.name} not found`);
      ty = entry.type;
    }
    return [ty, E.Global(tm.name)];
  }
  if (tm.tag === 'App') {
    const [ty, er] = synth(local, tm.left);
    const [ret, arg] = synthapp(local, ty, tm.mode, tm.right);
    return [ret, arg ? E.App(er, arg) : er];
  }
  if (tm.tag === 'Abs') {
    check(localErased(local), tm.type, VType);
    const ty = evaluate(tm.type, local.vs);
    const [rty, body] = synth(localExtend(local, tm.name, ty, tm.erased), tm.body);
    return [evaluate(Pi(tm.mode, tm.erased, tm.name, tm.type, quote(rty, local.index + 1)), local.vs), tm.erased ? body : E.Abs(body)];
  }
  if (tm.tag === 'Pair') {
    check(localErased(local), tm.type, VType);
    const ty = evaluate(tm.type, local.vs);
    const fty = force(ty);
    if (fty.tag !== 'VSigma') return terr(`not a sigma type in pair: ${showTerm(local, tm)}`);
    const fst = check(fty.erased ? localErased(local) : local, tm.fst, fty.type);
    const snd = check(local, tm.snd, vinst(fty, evaluate(tm.fst, local.vs)));
    return [ty, fty.erased ? snd : E.Pair(fst, snd)];
  }
  if (tm.tag === 'Proj') {
    const [ty, er] = synth(local, tm.term);
    const fty = force(ty);
    if (fty.tag !== 'VSigma') return terr(`not a sigma type in ${showTerm(local, tm)}: ${showVal(local, ty)}`);
    if (tm.proj === 'fst' && fty.erased && !local.erased) return terr(`cannot project from erased sigma in non-erased context in ${showTerm(local, tm)}: ${showVal(local, ty)}`);
    return [tm.proj === 'fst' ? fty.type : vinst(fty, vproj('fst', evaluate(tm.term, local.vs))), fty.erased ? er : E.Proj(tm.proj, er)];
  }
  if (tm.tag === 'Pi') {
    check(localErased(local), tm.type, VType);
    const ty = evaluate(tm.type, local.vs);
    check(localErased(localExtend(local, tm.name, ty, tm.erased)), tm.body, VType);
    return [VType, E.termId];
  }
  if (tm.tag === 'Sigma') {
    check(localErased(local), tm.type, VType);
    const ty = evaluate(tm.type, local.vs);
    check(localErased(localExtend(local, tm.name, ty, tm.erased)), tm.body, VType);
    return [VType, E.termId];
  }
  if (tm.tag === 'Let') {
    check(localErased(local), tm.type, VType);
    const ty = evaluate(tm.type, local.vs);
    const valEr = check(tm.erased ? localErased(local) : local, tm.val, ty);
    const val = evaluate(tm.val, local.vs);
    const [ret, body] = synth(localExtend(local, tm.name, ty, tm.erased, val), tm.body);
    return [ret, tm.erased ? body : E.Let(valEr, body)];
  }
  if (tm.tag === 'Meta') {
    const m = getMeta(tm.index);
    return [m.type, E.termId]; // TODO
  }
  if (tm.tag === 'Data') {
    check(localErased(local), tm.index,
      V.VPi(C.Expl, false, 'R', VType, R =>
      V.VPi(C.Expl, false, '_', V.VPi(C.Expl, false, 'T', VType, T => V.VPi(C.Expl, false, '_', V.VPi(C.Expl, false, '_', T, _ => R), _ => R)), _ =>
      V.VPi(C.Expl, false, '_', R, _ => R)))); // (R : *) -> ((T : *) -> (T -> R) -> R) -> R -> R
    const vindex = evaluate(tm.index, local.vs);
    tm.cons.forEach(t => check(localErased(local), t,
      V.VPi(C.Expl, false, 'R', VType, R =>
      V.VPi(C.Expl, false, '_', V.VPi(C.Expl, false, 'T', VType, T => V.VPi(C.Expl, false, '_', V.VPi(C.Expl, false, '_', T, _ => R), _ => R)), _ =>
      V.VPi(C.Expl, false, '_', V.vappEs([vindex, VType, V.VAbsE('T', VType, T => V.VAbsE('K', V.VPiE('_', T, _ => VType), K => V.VPiE('x', T, x => V.vapp(K, C.Expl, x)))), V.VPi(C.Expl, false, '_', R, _ => R)]), _ =>
      V.VPi(C.Expl, false, '_', V.vappEs([vindex, VType, V.VAbsE('T', VType, T => V.VAbsE('K', V.VPiE('_', T, _ => VType), K => V.VPiE('x', T, x => V.vapp(K, C.Expl, x)))), R]), _ => R)))))); // (R : *) -> ((T : *) -> (T -> R) -> R) -> (index * (\(T : *) (K : T -> *). (x : T) -> K x) (R -> R)) -> (index * (\T K. (x : T) -> K x) R) -> R
    return [V.VDataSort, E.termId];
  }
  if (tm.tag === 'TCon') {
    check(localErased(local), tm.data, V.VDataSort);
    const vdata = force(evaluate(tm.data, local.vs));
    if (vdata.tag !== 'VData') return terr(`not a data in tcon: ${show(tm)}`);
    const ty = V.vappEs([vdata.index, VType, V.VAbsE('T', VType, T => V.VAbsE('K', V.VPiE('_', T, _ => VType), K => V.VPiE('x', T, x => V.vappE(K, x)))), VType]); // index * (\(T : *) (K : T -> *). (x : T) -> K x) *
    const [rty] = synthapps(local, ty, listFrom(tm.args.map(t => [C.Expl, t])));
    conv(local.index, rty, VType); // TODO: probably not necessary
    return [VType, E.termId];
  }
  return terr(`synth failed: ${show(tm)}`);
};

const synthapp = (local: Local, ty: Val, mode: Mode, tm: Term): [Val, E.Term | null] => {
  log(() => `synthapp ${showVal(local, ty)} @${mode.tag === 'ImplUnif' ? 'impl' : ''} ${showTerm(local, tm)}`);
  const fty = force(ty);
  if (fty.tag === 'VPi' && fty.mode.tag === mode.tag) {
    const er = check(fty.erased ? localErased(local) : local, tm, fty.type);
    const v = evaluate(tm, local.vs);
    return [vinst(fty, v), fty.erased ? null : er];
  }
  return terr(`not a correct pi type in synthapp: ${showVal(local, ty)} @${mode.tag === 'ImplUnif' ? 'impl' : ''} ${showTerm(local, tm)}`);
};
const synthapps = (local: Local, ty: Val, spine: List<[Mode, Term]>): [Val, List<E.Term>] => {
  log(() => `synthapps ${showVal(local, ty)} ${listToString(spine, ([m, t]) => `@${m.tag === 'ImplUnif' ? 'impl' : ''} ${show(t)}`)}`);
  if (spine.tag === 'Nil') return [ty, Nil];
  const [rty, etm] = synthapp(local, ty, spine.head[0], spine.head[1]);
  const [rty2, etms] = synthapps(local, rty, spine.tail);
  return [rty2, etm ? Cons(etm, etms) : etms];
};

export const typecheck = (t: Term, erased: boolean = false): [Term, E.Term] => {
  const [ty, er] = synth(erased ? localErased(localEmpty) : localEmpty, t);
  return [quote(ty, 0), er];
};
