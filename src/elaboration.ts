import { log } from './config';
import { Abs, App, Let, Meta, Pi, Term, Var, Prim, Sigma, Pair, Proj, Global, Mode } from './core';
import * as C from './core';
import { Ix, Name } from './names';
import { Cons, filter, foldl, foldr, indexOf, length, List, listToString, map, Nil, reverse, toArray, zipWith, zipWithIndex } from './utils/list';
import { terr, tryT } from './utils/utils';
import { EnvV, evaluate, force, HMeta, quote, Val, vinst, VNe, vproj, VType, VVar, zonk } from './values';
import * as S from './surface';
import { show } from './surface';
import { allProblems, amountOfProblems, contextSolved, freshMeta, getHoleEntries, getMeta, registerHole, resetContext } from './context';
import { unify } from './unification';
import { primType } from './primitives';
import { getGlobal, hasGlobal, setGlobal } from './globals';

type EntryT = { type: Val, bound: boolean, mode: Mode, erased: boolean, inserted: boolean };
const EntryT = (type: Val, bound: boolean, mode: Mode, erased: boolean, inserted: boolean): EntryT =>
  ({ type, bound, mode, erased, inserted });

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
  erased: boolean;
}
const Local = (index: Ix, ns: List<Name>, nsSurface: List<Name>, ts: EnvT, vs: EnvV, erased: boolean): Local => ({ index, ns, nsSurface, ts, vs, erased });
const localEmpty: Local = Local(0, Nil, Nil, Nil, Nil, false);
const localExtend = (local: Local, name: Name, ty: Val, mode: Mode, erased: boolean, bound: boolean = true, inserted: boolean = false, val: Val = VVar(local.index)): Local =>
  Local(local.index + 1, Cons(name, local.ns), inserted ? local.nsSurface: Cons(name, local.nsSurface), Cons(EntryT(ty, bound, mode, erased, inserted), local.ts), Cons(val, local.vs), local.erased);
const localErased = (local: Local): Local => Local(local.index, local.ns, local.nsSurface, local.ts, local.vs, true);

export type HoleInfo = [Val, Val, Local];

const showVal = (local: Local, val: Val): string => S.showValZ(val, local.vs, local.index, local.ns);

const constructMetaType = (l: List<[number, string, EntryT]>, b: Val, k: Ix = 0, skipped: Ix = 0): Term => {
  if (l.tag === 'Cons') {
    const [, x, e] = l.head;
    if (!e.bound) return constructMetaType(l.tail, b, k + 1, skipped + 1);
    const q = quote(e.type, k);
    const sq = C.shift(-skipped, k - skipped, q);
    return Pi(e.mode, e.erased, x, sq, constructMetaType(l.tail, b, k + 1, skipped));
  }
  return C.shift(-skipped, k - skipped, quote(b, k));
};
const newMeta = (local: Local, ty: Val): Term => {
  log(() => `new meta return type: ${showVal(local, ty)}`);
  const zipped = zipWithIndex((x, y, i) => [i, x, y] as [Ix, Name, EntryT], local.ns, local.ts);
  const boundOnly = filter(zipped, ([_, __, ty]) => ty.bound);
  log(() => `new meta spine (${local.index}, ${length(boundOnly)}): ${listToString(boundOnly, ([i, x, entry]) => `${i} | ${x} | ${showVal(local, entry.type)}`)}`);
  const spine: List<[Mode, Term]> = map(boundOnly, x => [x[2].mode, Var(x[0])] as [Mode, Term]);
  log(() => `new meta spine: ${listToString(spine, ([m, t]) => m === C.ImplUnif ? `{${C.show(t)}}` : C.show(t))}`);
  const mty = constructMetaType(reverse(zipped), ty);
  log(() => `new meta type: ${C.show(mty)}`);
  const vmty = evaluate(mty, Nil);
  log(() => `new meta type val: ${S.showVal(vmty)}`);
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
  return [ty_, Nil];
};

const check = (local: Local, tm: S.Term, ty: Val): Term => {
  log(() => `check ${show(tm)} : ${showVal(local, ty)}`);
  if (tm.tag === 'Hole') {
    const x = newMeta(local, ty);
    if (tm.name) registerHole(tm.name, [evaluate(x, local.vs), ty, local]);
    return x;
  }
  const fty = force(ty);
  if (tm.tag === 'Abs' && !tm.type && fty.tag === 'VPi' && tm.mode === fty.mode) {
    if (tm.erased && !fty.erased) return terr(`erasability mismatch in check ${show(tm)} : ${showVal(local, ty)}`);
    const v = VVar(local.index);
    const x = tm.name;
    const body = check(localExtend(local, x, fty.type, tm.mode, fty.erased, true, false, v), tm.body, vinst(fty, v));
    return Abs(tm.mode, fty.erased, x, quote(fty.type, local.index), body);
  }
  if (fty.tag === 'VPi' && fty.mode === C.ImplUnif) {
    const v = VVar(local.index);
    const term = check(localExtend(local, fty.name, fty.type, fty.mode, fty.erased, true, true, v), tm, vinst(fty, v));
    return Abs(fty.mode, fty.erased, fty.name, quote(fty.type, local.index), term);
  }
  if (tm.tag === 'Pair' && fty.tag === 'VSigma') {
    const fst = check(local, tm.fst, fty.type);
    const snd = check(local, tm.snd, vinst(fty, evaluate(fst, local.vs)));
    return Pair(fst, snd, quote(ty, local.index));
  }
  if (tm.tag === 'Let') {
    let vtype: Term;
    let vty: Val;
    let val: Term;
    if (tm.type) {
      vtype = check(localErased(local), tm.type, VType);
      vty = evaluate(vtype, local.vs);
      val = check(tm.erased ? localErased(local) : local, tm.val, ty);
    } else {
      [val, vty] = synth(tm.erased ? localErased(local) : local, tm.val);
      vtype = quote(ty, local.index);
    }
    const v = evaluate(val, local.vs);
    const body = check(localExtend(local, tm.name, vty, C.Expl, tm.erased, false, false, v), tm.body, ty);
    return Let(tm.erased, tm.name, vtype, val, body);
  }
  const [term, ty2] = synth(local, tm);
  const [ty2inst, ms] = inst(local, ty2);
  return tryT(() => {
    log(() => `unify ${showVal(local, ty2inst)} ~ ${showVal(local, ty)}`);
    unify(local.index, ty2inst, ty);
    return foldl((a, m) => App(a, C.ImplUnif, m), term, ms);
  }, e => terr(`check failed (${show(tm)}): ${showVal(local, ty2)} ~ ${showVal(local, ty)}: ${e}`));
};

const freshPi = (local: Local, mode: Mode, erased: boolean, x: Name): Val => {
  const a = newMeta(local, VType);
  const va = evaluate(a, local.vs);
  const b = newMeta(localExtend(local, '_', va, mode, erased), VType);
  return evaluate(Pi(mode, erased, x, a, b), local.vs);
};

const synth = (local: Local, tm: S.Term): [Term, Val] => {
  log(() => `synth ${show(tm)}`);
  if (tm.tag === 'Prim') return [Prim(tm.name), primType(tm.name)];
  if (tm.tag === 'Var') {
    const i = indexOf(local.nsSurface, tm.name);
    if (i < 0) {
      const entry = getGlobal(tm.name);
      if (!entry) return terr(`global ${tm.name} not found`);
      return [Global(tm.name), entry.type];
    } else {
      const [entry, j] = indexT(local.ts, i) || terr(`var out of scope ${show(tm)}`);
      if (entry.erased && !local.erased) return terr(`erased var used: ${show(tm)}`);
      return [Var(j), entry.type];
    }
  }
  if (tm.tag === 'App') {
    const [left, ty] = synth(local, tm.left);
    const [right, rty, ms] = synthapp(local, ty, tm.mode, tm.right, tm);
    return [App(foldl((f, a) => App(f, C.ImplUnif, a), left, ms), tm.mode, right), rty];
  }
  if (tm.tag === 'Abs') {
    if (tm.type) {
      const type = check(localErased(local), tm.type, VType);
      const ty = evaluate(type, local.vs);
      const [body, rty] = synth(localExtend(local, tm.name, ty, tm.mode, tm.erased), tm.body);
      const pi = evaluate(Pi(tm.mode, tm.erased, tm.name, type, quote(rty, local.index + 1)), local.vs);
      return [Abs(tm.mode, tm.erased, tm.name, type, body), pi];
    } else {
      const pi = freshPi(local, tm.mode, tm.erased, tm.name);
      const term = check(local, tm, pi);
      return [term, pi];
    }
  }
  if (tm.tag === 'Pair') {
    const [fst, fstty] = synth(local, tm.fst);
    const [snd, sndty] = synth(local, tm.snd);
    const ty = Sigma(false, '_', quote(fstty, local.index), quote(sndty, local.index + 1));
    return [Pair(fst, snd, ty), evaluate(ty, local.vs)];
  }
  if (tm.tag === 'Proj') {
    const [term, ty] = synth(local, tm.term);
    const fty = force(ty);
    if (fty.tag !== 'VSigma') return terr(`not a sigma type in ${show(tm)}: ${showVal(local, ty)}`);
    const proj = tm.proj;
    if (proj.tag === 'PCore') {
      const tag = proj.proj;
      if (tag === 'fst' && fty.erased && !local.erased)
        return terr(`cannot project from erased sigma in non-erased context in ${show(tm)}: ${showVal(local, ty)}`);
      const e = Proj(tag, term);
      return tag === 'fst' ? [e, fty.type] : [e, vinst(fty, vproj('fst', evaluate(term, local.vs)))];
    } else if (proj.tag === 'PIndex') {
      let c = term;
      let t: Val = fty;
      let v: Val = evaluate(term, local.vs);
      for (let i = 0; i < proj.index; i++) {
        if (t.tag !== 'VSigma') return terr(`not a sigma type in ${show(tm)}: ${showVal(local, t)}`);
        c = Proj('snd', c);
        t = vinst(t, vproj('fst', v));
        v = vproj('snd', v);
      }
      if (t.tag !== 'VSigma') return terr(`not a sigma type in ${show(tm)}: ${showVal(local, t)}`);
      if (t.erased && !local.erased)
        return terr(`cannot project from erased sigma in non-erased context in ${show(tm)}: ${showVal(local, ty)}`);
      return [Proj('fst', c), t.type];
    } else if (proj.tag === 'PName') {
      let c = term;
      let t: Val = fty;
      let v: Val = evaluate(term, local.vs);
      while (true) {
        if (t.tag !== 'VSigma') return terr(`not a sigma type or name not found in ${show(tm)}: ${showVal(local, t)}`);
        if (t.name === proj.name) break;
        c = Proj('snd', c);
        t = vinst(t, vproj('fst', v));
        v = vproj('snd', v);
      }
      if (t.tag !== 'VSigma') return terr(`not a sigma type in ${show(tm)}: ${showVal(local, t)}`);
      if (t.erased && !local.erased)
        return terr(`cannot project from erased sigma in non-erased context in ${show(tm)}: ${showVal(local, ty)}`);
      return [Proj('fst', c), t.type];
    }
  }
  if (tm.tag === 'Pi') {
    const type = check(localErased(local), tm.type, VType);
    const ty = evaluate(type, local.vs);
    const body = check(localErased(localExtend(local, tm.name, ty, tm.mode, tm.erased)), tm.body, VType);
    return [Pi(tm.mode, tm.erased, tm.name, type, body), VType];
  }
  if (tm.tag === 'Sigma') {
    const type = check(localErased(local), tm.type, VType);
    const ty = evaluate(type, local.vs);
    const body = check(localErased(localExtend(local, tm.name, ty, C.Expl, tm.erased)), tm.body, VType);
    return [Sigma(tm.erased, tm.name, type, body), VType];
  }
  if (tm.tag === 'Let') {
    let type: Term;
    let ty: Val;
    let val: Term;
    if (tm.type) {
      type = check(localErased(local), tm.type, VType);
      ty = evaluate(type, local.vs);
      val = check(tm.erased ? localErased(local) : local, tm.val, ty);
    } else {
      [val, ty] = synth(tm.erased ? localErased(local) : local, tm.val);
      type = quote(ty, local.index);
    }
    const v = evaluate(val, local.vs);
    const [body, rty] = synth(localExtend(local, tm.name, ty, C.Expl, tm.erased, false, false, v), tm.body);
    return [Let(tm.erased, tm.name, type, val, body), rty];
  }
  if (tm.tag === 'Hole') {
    const t = newMeta(local, VType);
    const vt = evaluate(newMeta(local, evaluate(t, local.vs)), local.vs);
    if (tm.name) registerHole(tm.name, [evaluate(t, local.vs), vt, local]);
    return [t, vt];
  }
  return terr(`unable to synth ${show(tm)}`);
};

const synthapp = (local: Local, ty: Val, mode: Mode, tm: S.Term, full: S.Term): [Term, Val, List<Term>] => {
  log(() => `synthapp ${showVal(local, ty)} @${mode === C.ImplUnif ? 'impl' : ''} ${show(tm)}`);
  const fty = force(ty);
  if (fty.tag === 'VPi' && fty.mode === mode) {
    const term = check(fty.erased ? localErased(local) : local, tm, fty.type);
    const v = evaluate(term, local.vs);
    return [term, vinst(fty, v), Nil];
  }
  if (fty.tag === 'VPi' && fty.mode === C.ImplUnif && mode === C.Expl) {
    const m = newMeta(local, fty.type);
    const vm = evaluate(m, local.vs);
    const [rest, rt, l] = synthapp(local, vinst(fty, vm), mode, tm, full);
    return [rest, rt, Cons(m, l)];
  }
  if (ty.tag === 'VNe' && ty.head.tag === 'HMeta') {
    const mty = getMeta(ty.head.index).type;
    const a = freshMeta(mty);
    const b = freshMeta(mty);
    const pi = evaluate(Pi(mode, false, '_', quote(VNe(HMeta(a), ty.spine), local.index), quote(VNe(HMeta(b), ty.spine), local.index + 1)), local.vs);
    unify(local.index, ty, pi);
    return synthapp(local, pi, mode, tm, full);
  }
  return terr(`not a correct pi type in synthapp in ${show(full)}: ${showVal(local, ty)} @${mode === C.ImplUnif ? 'impl' : ''} ${show(tm)}`);
};

const MAX_SOLVING_COUNT = 1000;
const tryToSolveBlockedProblems = (): void => {
  if (amountOfProblems() > 0) {
    let changed = true;
    let count = 0;
    while (changed && count++ < MAX_SOLVING_COUNT) {
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

  log(() => `try solve unsolved problems`);
  tryToSolveBlockedProblems();

  const ztm = zonk(tm);
  const zty = zonk(quote(ty, 0));

  showHoles(ztm, zty);  

  if (!contextSolved())
    return terr(`not all metas are solved: ${S.showCore(ztm)} : ${S.showCore(zty)}`);
  return [ztm, zty];
};

export const elaborateDefs = (ds: S.Def[], allowRedefinition: boolean = false): Name[] => {
  log(() => `elaborateDefs ${ds.map(x => x.name).join(' ')}`);
  const xs: Name[] = [];
  if (!allowRedefinition) {
    for (let i = 0; i < ds.length; i++) {
      const d = ds[i];
      if (d.tag === 'DDef' && hasGlobal(d.name))
        return terr(`cannot redefine global ${d.name}`);
    }
  }
  for (let i = 0; i < ds.length; i++) {
    const d = ds[i];
    log(() => `elaborateDef ${S.showDef(d)}`);
    if (d.tag === 'DDef') {
      try {
        const [tm, ty] = elaborate(d.value);
        log(() => `set ${d.name} : ${S.showCore(ty)} = ${S.showCore(tm)}`);
        setGlobal(d.name, tm, evaluate(tm, Nil), evaluate(ty, Nil));

        const i = xs.indexOf(d.name);
        if (i >= 0) xs.splice(i, 1);
        xs.push(d.name);
      } catch (err) {
        err.message = `type error in def ${d.name}: ${err.message}`;
        throw err;
      }
    }
  }
  return xs;
};

const showValSZ = (local: Local, v: Val) =>
  S.showCore(zonk(quote(v, local.index, false), local.vs, local.index, false), local.ns);

const showHoles = (tm: Term, ty: Term) => {
  const holeprops = getHoleEntries();
  if (holeprops.length === 0) return;
  const strtype = S.showCore(ty);
  const strterm = S.showCore(tm);
  const str = holeprops.map(([x, [t, v, local]]) => {
    const all = zipWith(([x, v], { bound: def, type: ty, inserted, mode }) => [x, v, def, ty, inserted, mode] as [Name, Val, boolean, Val, boolean, Mode], zipWith((x, v) => [x, v] as [Name, Val], local.ns, local.vs), local.ts);
    const allstr = toArray(all, ([x, v, b, t, _, p]) => `${p !== C.Expl ? `{${x}}` : x} : ${showValSZ(local, t)}${b ? '' : ` = ${showValSZ(local, v)}`}`).join('\n');
    return `\n_${x} : ${showValSZ(local, v)} = ${showValSZ(local, t)}\nlocal:\n${allstr}\n`;
  }).join('\n');
  return terr(`unsolved holes\ntype: ${strtype}\nterm: ${strterm}\n${str}`);
};
