import { log } from './config';
import { Abs, App, Let, Meta, Pi, Term, Type, Var } from './core';
import * as C from './core';
import { Ix, Name } from './names';
import { Cons, filter, foldr, index, indexOf, List, map, Nil, reverse, zipWithIndex } from './utils/list';
import { terr, tryT } from './utils/utils';
import { EnvV, evaluate, force, HMeta, quote, Val, vinst, VNe, VType, VVar, zonk } from './values';
import * as V from './values';
import * as S from './surface';
import { show } from './surface';
import { allProblems, amountOfProblems, contextSolved, freshMeta, getMeta, resetContext } from './context';
import { unify } from './unification';

type EntryT = { type: Val, bound: boolean };
const EntryT = (type: Val, bound: boolean): EntryT => ({ type, bound });

type EnvT = List<EntryT>;

interface Local {
  index: Ix;
  ns: List<Name>;
  ts: EnvT;
  vs: EnvV;
}
const Local = (index: Ix, ns: List<Name>, ts: EnvT, vs: EnvV): Local => ({ index, ns, ts, vs });
const localEmpty: Local = Local(0, Nil, Nil, Nil);
const localExtend = (local: Local, name: Name, ty: Val, bound: boolean = true, val: Val = VVar(local.index)): Local =>
  Local(local.index + 1, Cons(name, local.ns), Cons(EntryT(ty, bound), local.ts), Cons(val, local.vs));

const showVal = (local: Local, val: Val): string => S.showValZ(val, local.vs, local.index, local.ns);

const selectName = (a: Name, b: Name): Name => a === '_' ? b : a;

const constructMetaType = (l: List<[number, string, EntryT]>, b: Val, k: Ix): Term =>
  l.tag === 'Cons' ? Pi(l.head[1], quote(l.head[2].type, k), constructMetaType(l.tail, b, k + 1)) : quote(b, k);
const newMeta = (local: Local, ty: Val): Term => {
  const zipped = zipWithIndex((x, y, i) => [i, x, y] as [Ix, Name, EntryT], local.ns, local.ts);
  const boundOnly = filter(zipped, ([_, __, ty]) => ty.bound);
  const spine: List<Term> = map(boundOnly, x => Var(x[0]));
  const mty = constructMetaType(reverse(boundOnly), ty, 0);
  log(() => `new meta type: ${C.show(mty)}`);
  const vmty = evaluate(mty, Nil);
  log(() => `new meta type: ${V.showVal(vmty, 0)}`);
  return foldr((x, y) => App(y, x), Meta(freshMeta(vmty)) as Term, spine);
};

const check = (local: Local, tm: S.Term, ty: Val): Term => {
  log(() => `check ${show(tm)} : ${showVal(local, ty)}`);
  if (tm.tag === 'Hole') {
    const x = newMeta(local, ty);
    return x;
  }
  const fty = force(ty);
  if (tm.tag === 'Abs' && !tm.type && fty.tag === 'VPi') {
    const v = VVar(local.index);
    const x = selectName(tm.name, fty.name);
    const body = check(localExtend(local, x, fty.type, true, v), tm.body, vinst(fty, v));
    return Abs(x, quote(fty.type, local.index), body);
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
    const body = check(localExtend(local, tm.name, ty, false, v), tm.body, ty);
    return Let(tm.name, type, val, body);
  }
  const [term, ty2] = synth(local, tm);
  return tryT(() => {
    unify(local. index, ty2, ty)
    return term;
  }, e => terr(`check failed (${show(tm)}): ${showVal(local, ty2)} ~ ${showVal(local, ty)}: ${e}`));
};

const freshPi = (local: Local, x: Name): Val => {
  const a = newMeta(local, VType);
  const va = evaluate(a, local.vs);
  const b = newMeta(localExtend(local, '_', va), VType);
  return evaluate(Pi(x, a, b), local.vs);
};

const synth = (local: Local, tm: S.Term): [Term, Val] => {
  log(() => `synth ${show(tm)}`);
  if (tm.tag === 'Type') return [Type, VType];
  if (tm.tag === 'Var') {
    const i = indexOf(local.ns, tm.name);
    if (i < 0) return terr(`undefined variable ${tm.name}`);
    const ty = index(local.ts, i);
    if (!ty) return terr(`undefined variable ${tm.name}: no type found`);
    return [Var(i), ty.type];
  }
  if (tm.tag === 'App') {
    const [left, ty] = synth(local, tm.left);
    const [right, rty] = synthapp(local, ty, tm.right);
    return [App(left, right), rty];
  }
  if (tm.tag === 'Abs' && tm.type) {
    if (tm.type) {
      const type = check(local, tm.type, VType);
      const ty = evaluate(type, local.vs);
      const [body, rty] = synth(localExtend(local, tm.name, ty), tm.body);
      const pi = evaluate(Pi(tm.name, type, quote(rty, local.index + 1)), local.vs);
      return [Abs(tm.name, type, body), pi];
    } else {
      const pi = freshPi(local, tm.name);
      const term = check(local, tm, pi);
      return [term, pi];
    }
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
    const [body, rty] = synth(localExtend(local, tm.name, ty, false, v), tm.body);
    return [Let(tm.name, type, val, body), rty];
  }
  if (tm.tag === 'Hole') {
    const t = newMeta(local, VType);
    const vt = evaluate(newMeta(local, evaluate(t, local.vs)), local.vs);
    return [t, vt];
  }
  return terr(`unable to synth ${show(tm)}`);
};

const synthapp = (local: Local, ty: Val, tm: S.Term): [Term, Val] => {
  log(() => `synthapp ${showVal(local, ty)} @ ${show(tm)}`);
  const fty = force(ty);
  if (fty.tag === 'VPi') {
    const term = check(local, tm, fty.type);
    const v = evaluate(term, local.vs);
    return [term, vinst(fty, v)];
  }
  if (ty.tag === 'VNe' && ty.head.tag === 'HMeta') {
    const mty = getMeta(ty.head.index).type;
    const a = freshMeta(mty);
    const b = freshMeta(mty);
    const pi = evaluate(Pi('_', quote(VNe(HMeta(a), ty.spine), local.index), quote(VNe(HMeta(b), ty.spine), local.index + 1)), local.vs);
    unify(local.index, ty, pi);
    return synthapp(local, pi, tm);
  }
  return terr(`not a pi type in synthapp: ${showVal(local, ty)}`);
};

const tryToSolveBlockedProblems = (): void => {
  if (amountOfProblems() > 0) {
    let changed = true;
    while (changed) {
      const blocked = allProblems();
      changed = false;
      for (let i = 0, l = blocked.length; i < l; i++) {
        const c = blocked[i];
        const l = amountOfProblems();
        unify(c.k, c.a, c.b);
        if (amountOfProblems() > l) changed = true;
      }
    }
  }
};

export const elaborate = (t: S.Term): [Term, Term] => {
  resetContext();
  const [tm, ty] = synth(localEmpty, t);

  tryToSolveBlockedProblems();

  const ztm = zonk(tm);
  const zty = zonk(quote(ty, 0));

  if (!contextSolved())
    return terr(`not all metas are solved: ${S.showCore(ztm)} : ${S.showCore(zty)}`);
  return [ztm, zty];
};
