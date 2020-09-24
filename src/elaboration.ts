import { log } from './config';
import { conv } from './conversion';
import { Abs, App, Let, Pi, Term, Type, Var } from './core';
import { Ix, Name } from './names';
import { Cons, index, indexOf, List, Nil } from './utils/list';
import { terr, tryT } from './utils/utils';
import { EnvV, evaluate, quote, Val, vinst, VType, VVar } from './values';
import * as S from './surface';
import { show } from './surface';

type EnvT = List<Val>;

interface Local {
  index: Ix;
  ns: List<Name>;
  ts: EnvT;
  vs: EnvV;
}
const Local = (index: Ix, ns: List<Name>, ts: EnvT, vs: EnvT): Local => ({ index, ns, ts, vs });
const localEmpty: Local = Local(0, Nil, Nil, Nil);
const localExtend = (local: Local, name: Name, ty: Val, val: Val = VVar(local.index)): Local =>
  Local(local.index + 1, Cons(name, local.ns), Cons(ty, local.ts), Cons(val, local.vs));

const showVal = (local: Local, val: Val): string => S.showVal(val, local.index, local.ns);

const selectName = (a: Name, b: Name): Name => a === '_' ? b : a;

const check = (local: Local, tm: S.Term, ty: Val): Term => {
  log(() => `check ${show(tm)} : ${showVal(local, ty)}`);
  if (tm.tag === 'Abs' && !tm.type && ty.tag === 'VPi') {
    const v = VVar(local.index);
    const x = selectName(tm.name, ty.name);
    const body = check(localExtend(local, x, ty.type, v), tm.body, vinst(ty, v));
    return Abs(x, quote(ty.type, local.index), body);
  }
  if (tm.tag === 'Let') {
    let type: Term;
    let ty: Val;
    let val: Term;
    if (tm.type) {
      type = check(local, tm.type, VType);
      ty = evaluate(type, local.vs);
      val = check(local, tm.val, ty);
    } else {
      [val, ty] = synth(local, tm.val);
      type = quote(ty, local.index);
    }
    const v = evaluate(val, local.vs);
    const body = check(localExtend(local, tm.name, ty, v), tm.body, ty);
    return Let(tm.name, type, val, body);
  }
  const [term, ty2] = synth(local, tm);
  return tryT(() => {
    conv(local. index, ty2, ty)
    return term;
  }, e => terr(`check failed (${show(tm)}): ${showVal(local, ty2)} ~ ${showVal(local, ty)}: ${e}`));
};

const synth = (local: Local, tm: S.Term): [Term, Val] => {
  log(() => `synth ${show(tm)}`);
  if (tm.tag === 'Type') return [Type, VType];
  if (tm.tag === 'Var') {
    const i = indexOf(local.ns, tm.name);
    if (i < 0) return terr(`undefined variable ${tm.name}`);
    const ty = index(local.ts, i);
    if (!ty) return terr(`undefined variable ${tm.name}: no type found`);
    return [Var(i), ty];
  }
  if (tm.tag === 'App') {
    const [left, ty] = synth(local, tm.left);
    const [right, rty] = synthapp(local, ty, tm.right);
    return [App(left, right), rty];
  }
  if (tm.tag === 'Abs' && tm.type) {
    const type = check(local, tm.type, VType);
    const ty = evaluate(type, local.vs);
    const [body, rty] = synth(localExtend(local, tm.name, ty), tm.body);
    const pi = evaluate(Pi(tm.name, type, quote(rty, local.index + 1)), local.vs);
    return [Abs(tm.name, type, body), pi];
  }
  if (tm.tag === 'Pi') {
    const type = check(local, tm.type, VType);
    const ty = evaluate(type, local.vs);
    const body = check(localExtend(local, tm.name, ty), tm.body, VType);
    return [Pi(tm.name, type, body), VType];
  }
  if (tm.tag === 'Let') {
    let type: Term;
    let ty: Val;
    let val: Term;
    if (tm.type) {
      type = check(local, tm.type, VType);
      ty = evaluate(type, local.vs);
      val = check(local, tm.val, ty);
    } else {
      [val, ty] = synth(local, tm.val);
      type = quote(ty, local.index);
    }
    const v = evaluate(val, local.vs);
    const [body, rty] = synth(localExtend(local, tm.name, ty, v), tm.body);
    return [Let(tm.name, type, val, body), rty];
  }
  return terr(`unable to synth ${show(tm)}`);
};

const synthapp = (local: Local, ty: Val, tm: S.Term): [Term, Val] => {
  log(() => `synthapp ${showVal(local, ty)} @ ${show(tm)}`);
  if (ty.tag === 'VPi') {
    const term = check(local, tm, ty.type);
    const v = evaluate(term, local.vs);
    return [term, vinst(ty, v)];
  }
  return terr(`not a pi type in synthapp: ${showVal(local, ty)}`);
};

export const elaborate = (t: S.Term): [Term, Term] => {
  const [tm, ty] = synth(localEmpty, t);
  return [tm, quote(ty, 0)];
};
