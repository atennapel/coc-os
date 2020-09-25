import { log } from './config';
import { Abs, App, Let, Meta, Pi, Term, Type, Var, Mode } from './core';
import * as C from './core';
import { Ix, Name } from './names';
import { Cons, filter, foldl, foldr, indexOf, List, map, Nil, reverse, zipWithIndex } from './utils/list';
import { terr, tryT } from './utils/utils';
import { EnvV, evaluate, force, HMeta, quote, Val, vinst, VNe, VType, VVar, zonk } from './values';
import * as V from './values';
import * as S from './surface';
import { show } from './surface';
import { allProblems, amountOfProblems, contextSolved, freshMeta, getMeta, resetContext } from './context';
import { unify } from './unification';

type EntryT = { type: Val, bound: boolean, mode: Mode, inserted: boolean };
const EntryT = (type: Val, bound: boolean, mode: Mode, inserted: boolean): EntryT =>
  ({ type, bound, mode, inserted });

type EnvT = List<EntryT>;

const indexT = (ts: EnvT, ix: Ix): [EntryT, Ix] | null => {
  let l = ts;
  let i = 0;
  while (l.tag === 'Cons') {
    if (l.head.inserted) {
      l = l.tail;
      i++;
      continue;
    }
    if (ix === 0) return [l.head, i];
    i++;
    ix--;
    l = l.tail;
  }
  return null;
};

interface Local {
  index: Ix;
  ns: List<Name>;
  nsSurface: List<Name>;
  ts: EnvT;
  vs: EnvV;
}
const Local = (index: Ix, ns: List<Name>, nsSurface: List<Name>, ts: EnvT, vs: EnvV): Local => ({ index, ns, nsSurface, ts, vs });
const localEmpty: Local = Local(0, Nil, Nil, Nil, Nil);
const localExtend = (local: Local, name: Name, ty: Val, mode: Mode, bound: boolean = true, inserted: boolean = false, val: Val = VVar(local.index)): Local =>
  Local(local.index + 1, Cons(name, local.ns), inserted ? local.nsSurface: Cons(name, local.nsSurface), Cons(EntryT(ty, bound, mode, inserted), local.ts), Cons(val, local.vs));

const showVal = (local: Local, val: Val): string => S.showValZ(val, local.vs, local.index, local.ns);

const selectName = (a: Name, b: Name): Name => a === '_' ? b : a;

const constructMetaType = (l: List<[number, string, EntryT]>, b: Val, k: Ix): Term =>
  l.tag === 'Cons' ? Pi(l.head[2].mode, l.head[1], quote(l.head[2].type, k), constructMetaType(l.tail, b, k + 1)) : quote(b, k);
const newMeta = (local: Local, ty: Val): Term => {
  const zipped = zipWithIndex((x, y, i) => [i, x, y] as [Ix, Name, EntryT], local.ns, local.ts);
  const boundOnly = filter(zipped, ([_, __, ty]) => ty.bound);
  const spine: List<[Mode, Term]> = map(boundOnly, x => [x[2].mode, Var(x[0])] as [Mode, Term]);
  const mty = constructMetaType(reverse(boundOnly), ty, 0);
  log(() => `new meta type: ${C.show(mty)}`);
  const vmty = evaluate(mty, Nil);
  log(() => `new meta type: ${V.showVal(vmty, 0)}`);
  return foldr(([m, x], y) => App(y, m, x), Meta(freshMeta(vmty)) as Term, spine);
};

const inst = (local: Local, ty_: Val): [Val, List<Term>] => {
  const ty = force(ty_);
  if (ty.tag === 'VPi' && ty.mode === C.ImplUnif) {
    const m = newMeta(local, ty.type);
    const vm = evaluate(m, local.vs);
    const [res, args] = inst(local, vinst(ty, vm));
    return [res, Cons(m, args)];
  }
  return [ty, Nil];
};

const check = (local: Local, tm: S.Term, ty: Val): Term => {
  log(() => `check ${show(tm)} : ${showVal(local, ty)}`);
  if (tm.tag === 'Hole') {
    const x = newMeta(local, ty);
    return x;
  }
  const fty = force(ty);
  if (tm.tag === 'Abs' && !tm.type && fty.tag === 'VPi' && tm.mode === fty.mode) {
    const v = VVar(local.index);
    const x = selectName(tm.name, fty.name);
    const body = check(localExtend(local, x, fty.type, tm.mode, true, false, v), tm.body, vinst(fty, v));
    return Abs(tm.mode, x, quote(fty.type, local.index), body);
  }
  if (tm.tag === 'Abs' && !tm.type && fty.tag === 'VPi' && tm.mode === C.Expl && fty.mode === C.ImplUnif) {
    const v = VVar(local.index);
    const term = check(localExtend(local, fty.name, fty.type, fty.mode, true, true, v), tm, vinst(fty, v));
    return Abs(fty.mode, fty.name, quote(fty.type, local.index), term);
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
    const body = check(localExtend(local, tm.name, ty, C.Expl, false, false, v), tm.body, ty);
    return Let(tm.name, type, val, body);
  }
  const [term, ty2] = synth(local, tm);
  const [ty2inst, ms] = inst(local, ty2);
  return tryT(() => {
    log(() => `unify ${showVal(local, ty2inst)} ~ ${showVal(local, ty)}`);
    unify(local.index, ty2inst, ty);
    return foldl((a, m) => App(a, C.ImplUnif, m), term, ms);
  }, e => terr(`check failed (${show(tm)}): ${showVal(local, ty2)} ~ ${showVal(local, ty)}: ${e}`));
};

const freshPi = (local: Local, mode: Mode, x: Name): Val => {
  const a = newMeta(local, VType);
  const va = evaluate(a, local.vs);
  const b = newMeta(localExtend(local, '_', va, mode), VType);
  return evaluate(Pi(mode, x, a, b), local.vs);
};

const synth = (local: Local, tm: S.Term): [Term, Val] => {
  log(() => `synth ${show(tm)}`);
  if (tm.tag === 'Type') return [Type, VType];
  if (tm.tag === 'Var') {
    const i = indexOf(local.nsSurface, tm.name);
    const [entry, j] = indexT(local.ts, i) || terr(`var out of scope ${show(tm)}`);
    return [Var(j), entry.type];
  }
  if (tm.tag === 'App') {
    const [left, ty] = synth(local, tm.left);
    const [right, rty, ms] = synthapp(local, ty, tm.mode, tm.right);
    return [App(foldl((f, a) => App(f, C.ImplUnif, a), left, ms), tm.mode, right), rty];
  }
  if (tm.tag === 'Abs' && tm.type) {
    if (tm.type) {
      const type = check(local, tm.type, VType);
      const ty = evaluate(type, local.vs);
      const [body, rty] = synth(localExtend(local, tm.name, ty, tm.mode), tm.body);
      const pi = evaluate(Pi(tm.mode, tm.name, type, quote(rty, local.index + 1)), local.vs);
      return [Abs(tm.mode, tm.name, type, body), pi];
    } else {
      const pi = freshPi(local, tm.mode, tm.name);
      const term = check(local, tm, pi);
      return [term, pi];
    }
  }
  if (tm.tag === 'Pi') {
    const type = check(local, tm.type, VType);
    const ty = evaluate(type, local.vs);
    const body = check(localExtend(local, tm.name, ty, tm.mode), tm.body, VType);
    return [Pi(tm.mode, tm.name, type, body), VType];
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
    const [body, rty] = synth(localExtend(local, tm.name, ty, C.Expl, false, false, v), tm.body);
    return [Let(tm.name, type, val, body), rty];
  }
  if (tm.tag === 'Hole') {
    const t = newMeta(local, VType);
    const vt = evaluate(newMeta(local, evaluate(t, local.vs)), local.vs);
    return [t, vt];
  }
  return terr(`unable to synth ${show(tm)}`);
};

const synthapp = (local: Local, ty: Val, mode: Mode, tm: S.Term): [Term, Val, List<Term>] => {
  log(() => `synthapp ${showVal(local, ty)} @${mode === C.ImplUnif ? 'impl' : ''} ${show(tm)}`);
  const fty = force(ty);
  if (fty.tag === 'VPi' && fty.mode === mode) {
    const term = check(local, tm, fty.type);
    const v = evaluate(term, local.vs);
    return [term, vinst(fty, v), Nil];
  }
  if (fty.tag === 'VPi' && fty.mode === C.ImplUnif && mode === C.Expl) {
    const m = newMeta(local, fty.type);
    const vm = evaluate(m, local.vs);
    const [rest, rt, l] = synthapp(local, vinst(fty, vm), mode, tm);
    return [rest, rt, Cons(m, l)];
  }
  if (ty.tag === 'VNe' && ty.head.tag === 'HMeta') {
    const mty = getMeta(ty.head.index).type;
    const a = freshMeta(mty);
    const b = freshMeta(mty);
    const pi = evaluate(Pi(mode, '_', quote(VNe(HMeta(a), ty.spine), local.index), quote(VNe(HMeta(b), ty.spine), local.index + 1)), local.vs);
    unify(local.index, ty, pi);
    return synthapp(local, pi, mode, tm);
  }
  return terr(`not a correct pi type in synthapp: ${showVal(local, ty)} @${mode === C.ImplUnif ? 'impl' : ''} ${show(tm)}`);
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
