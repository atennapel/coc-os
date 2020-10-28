import { config, log } from './config';
import { Abs, App, Let, Meta, Pi, Term, Var, Prim, Sigma, Pair, Proj, Global, Mode } from './core';
import * as C from './core';
import { Ix, Name } from './names';
import { Cons, filter, foldl, foldr, indexOf, isEmpty, length, List, listToString, map, Nil, reverse, tail, toArray, zipWith, zipWithIndex, listFrom, each } from './utils/list';
import { terr, tryT } from './utils/utils';
import { EnvV, evaluate, force, HMeta, quote, Val, vinst, VNe, vproj, VType, VVar, zonk } from './values';
import * as S from './surface';
import { show } from './surface';
import { allProblems, amountOfProblems, contextSolved, freshInstanceId, freshMeta, getHoleEntries, getMeta, registerHole, resetContext } from './context';
import { unify } from './unification';
import { primType } from './primitives';
import { getGlobal, hasGlobal, setGlobal } from './globals';
import { typecheck } from './typecheck';
import * as E from './erased';
import * as EV from './erasedvalues';
import * as V from './values';
import { addToBase, getFromBase } from './base';

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

export type HoleInfo = [Val, Val, Local, boolean];

const showVal = (local: Local, val: Val): string => S.showValZ(val, local.vs, local.index, local.ns);

const constructMetaType = (l: List<[number, string, EntryT]>, b: Val, k: Ix = 0, skipped: Ix = 0, since: Ix = 0): Term => {
  if (l.tag === 'Cons') {
    const [, x, e] = l.head;
    if (!e.bound) {
      const rest = constructMetaType(l.tail, b, k + 1, skipped + 1, 0);
      return C.shift(-1, 1, rest);
    }
    const q = quote(e.type, k);
    return Pi(e.mode, e.erased, x, q, constructMetaType(l.tail, b, k + 1, skipped, since + 1));
  }
  return quote(b, k);
};
const newMeta = (local: Local, erased: boolean, ty: Val): Term => {
  log(() => `new ${erased ? 'erased ' : ''}meta return type: ${showVal(local, ty)}`);
  const zipped = zipWithIndex((x, y, i) => [i, x, y] as [Ix, Name, EntryT], local.ns, local.ts);
  const boundOnly = filter(zipped, ([_, __, ty]) => ty.bound);
  log(() => `new meta spine (${local.index}, ${length(boundOnly)}): ${listToString(boundOnly, ([i, x, entry]) => `${i} | ${x} | ${showVal(local, entry.type)}`)}`);
  const spine: List<[Mode, Term]> = map(boundOnly, x => [x[2].mode, Var(x[0])] as [Mode, Term]);
  log(() => `new meta spine: ${listToString(spine, ([m, t]) => m.tag === 'ImplUnif' ? `{${C.show(t)}}` : C.show(t))}`);
  const mty = constructMetaType(reverse(zipped), ty);
  log(() => `new meta type: ${C.show(mty)}`);
  const vmty = evaluate(mty, Nil);
  log(() => `new meta type val: ${S.showVal(vmty)}`);
  const newmeta = foldr(([m, x], y) => App(y, m, x), Meta(freshMeta(vmty, erased)) as Term, spine);
  log(() => `new meta term: ${S.showCore(newmeta, local.ns)}`);
  return newmeta;
};

const inst = (local: Local, ty_: Val): [Val, List<Term>] => {
  const ty = force(ty_);
  if (ty.tag === 'VPi' && ty.mode.tag === 'ImplUnif') {
    const m = newMeta(local, local.erased || ty.erased, ty.type);
    const vm = evaluate(m, local.vs);
    const [res, args] = inst(local, vinst(ty, vm));
    return [res, Cons(m, args)];
  }
  return [ty_, Nil];
};

const check = (local: Local, tm: S.Term, ty: Val): Term => {
  log(() => `check ${show(tm)} : ${showVal(local, ty)}`);
  if (tm.tag === 'Hole') {
    const x = newMeta(local, local.erased, ty);
    if (tm.name) {
      const z = tm.name === '_' ? `_${freshInstanceId()}` : tm.name;
      registerHole(z, [evaluate(x, local.vs), ty, local, z[0] === '_']);
    }
    return x;
  }
  const fty = force(ty);
  if (tm.tag === 'Abs' && !tm.type && fty.tag === 'VPi' && tm.mode.tag === fty.mode.tag) {
    if (tm.erased && !fty.erased) return terr(`erasability mismatch in check ${show(tm)} : ${showVal(local, ty)}`);
    const v = VVar(local.index);
    const x = tm.name;
    const body = check(localExtend(local, x, fty.type, tm.mode, fty.erased, true, false, v), tm.body, vinst(fty, v));
    return Abs(tm.mode, fty.erased, x, quote(fty.type, local.index), body);
  }
  if (fty.tag === 'VPi' && fty.mode.tag === 'ImplUnif') {
    const v = VVar(local.index);
    const term = check(localExtend(local, fty.name, fty.type, fty.mode, fty.erased, true, true, v), tm, vinst(fty, v));
    return Abs(fty.mode, fty.erased, fty.name, quote(fty.type, local.index), term);
  }
  if (tm.tag === 'Pair' && fty.tag === 'VSigma') {
    const fst = check(fty.erased ? localErased(local) : local, tm.fst, fty.type);
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
      vtype = quote(vty, local.index);
    }
    const v = evaluate(val, local.vs);
    const body = check(localExtend(local, tm.name, vty, C.Expl, tm.erased, false, false, v), tm.body, ty);
    return Let(tm.erased, tm.name, vtype, val, body);
  }
  if (tm.tag === 'App') {
    const [fn, args] = S.flattenApp(tm);
    const [left, fnty] = synth(local, fn);
    const [term, rty, problems] = synthapps(local, fnty, left, listFrom(args), Nil);
    if (!isEmpty(problems))
      log(() => `unsolved constraints in application spine (${show(tm)}): ${listToString(problems, c => showConstraint(local, c))}`);
    const [rtyinst, ms] = inst(local, rty);
    unify(local.index, rtyinst, ty);
    each(problems, ([er, tm, vty, vm]) => {
      const etm = check(er ? localErased(local) : local, tm, vty);
      unify(local.index, vm, evaluate(etm, local.vs));
    });
    return foldl((a, m) => App(a, C.ImplUnif, m), term, ms);
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
  const a = newMeta(local, true, VType);
  const va = evaluate(a, local.vs);
  const b = newMeta(localExtend(local, '_', va, mode, erased), true, VType);
  return evaluate(Pi(mode, erased, x, a, b), local.vs);
};

const synth = (local: Local, tm: S.Term): [Term, Val] => {
  log(() => `synth ${show(tm)}`);
  if (tm.tag === 'Prim') return [Prim(tm.name), primType(tm.name)];
  if (tm.tag === 'Var') {
    const i = indexOf(local.nsSurface, tm.name);
    if (i < 0) {
      let ty: Val;
      if (config.useBase) {
        const [, type] = getFromBase(tm.name, local.erased);
        ty = evaluate(type, Nil);
      } else {
        const entry = getGlobal(tm.name);
        if (!entry) return terr(`global ${tm.name} not found`);
        if (entry.erased && !local.erased) return terr(`erased global used: ${show(tm)}`);
        ty = entry.type;
      }
      return [Global(tm.name), ty];
    } else {
      const [entry, j] = indexT(local.ts, i) || terr(`var out of scope ${show(tm)}`);
      if (entry.erased && !local.erased) return terr(`erased var used: ${show(tm)}`);
      return [Var(j), entry.type];
    }
  }
  if (tm.tag === 'App') {
    const [fn, args] = S.flattenApp(tm);
    const [left, ty] = synth(local, fn);
    const [term, rty, problems] = synthapps(local, ty, left, listFrom(args), Nil);
    if (!isEmpty(problems))
      log(() => `unsolved constraints in application spine (${show(tm)}): ${listToString(problems, c => showConstraint(local, c))}`);
    each(problems, ([er, tm, vty, vm]) => {
      const etm = check(er ? localErased(local) : local, tm, vty);
      unify(local.index, vm, evaluate(etm, local.vs));
    });
    return [term, rty];
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
    const t = newMeta(local, local.erased, VType);
    const vt = evaluate(newMeta(local, local.erased, evaluate(t, local.vs)), local.vs);
    if (tm.name) {
      const x = tm.name === '_' ? `_${freshInstanceId()}` : tm.name;
      registerHole(x, [evaluate(t, local.vs), vt, local, x[0] === '_']);
    }
    return [t, vt];
  }
  return terr(`unable to synth ${show(tm)}`);
};

type Constraint = [boolean, S.Term, Val, Val];
const showConstraint = (local: Local, c: Constraint): string =>
  `Constraint(${c[0] ? `impl ` : ''}${showVal(local, c[3])} ~> ${show(c[1])} : ${showVal(local, c[2])})`;
const synthapps = (local: Local, ty: Val, tm: Term, spine: List<[Mode, S.Term]>, problems: List<Constraint>): [Term, Val, List<Constraint>] => {
  log(() => `synthapp ${showVal(local, ty)} ${listToString(spine, ([m, t]) => `@${m.tag === 'ImplUnif' ? 'impl' : ''} ${show(t)}`)} | ${S.showCore(tm, local.ns)}`);
  if (isEmpty(spine)) return [tm, ty, problems];
  const fty = force(ty);
  const [mode, stm] = spine.head;
  if (fty.tag === 'VPi' && fty.mode.tag === mode.tag) {
    const cty = fty.type;
    /*
    const fcty = force(cty);
    if (false && fcty.tag === 'VNe' && fcty.head.tag === 'HMeta' && (stm.tag !== 'Hole' && stm.tag !== 'Prim' && stm.tag !== 'Meta' && stm.tag !== 'App')) {
      const m = newMeta(local, local.erased || fty.erased, fty.type);
      const vm = evaluate(m, local.vs);
      return synthapps(local, vinst(fty, vm), App(tm, mode, m), tail(spine), Cons([fty.erased, stm, fcty, vm], problems));
    } else
    */ {
      const term = check(fty.erased ? localErased(local) : local, stm, cty);
      const v = evaluate(term, local.vs);
      return synthapps(local, vinst(fty, v), App(tm, mode, term), tail(spine), problems);
    }
  }
  if (fty.tag === 'VPi' && fty.mode.tag === 'ImplUnif' && mode.tag === 'Expl') {
    const m = newMeta(local, local.erased || fty.erased, fty.type);
    const vm = evaluate(m, local.vs);
    return synthapps(local, vinst(fty, vm), App(tm, C.ImplUnif, m), spine, problems);
  }
  if (ty.tag === 'VNe' && ty.head.tag === 'HMeta') {
    const m = getMeta(ty.head.index)
    const mty = m.type;
    const a = freshMeta(mty, m.erased);
    const b = freshMeta(mty, m.erased);
    const pi = evaluate(Pi(mode, false, '_', quote(VNe(HMeta(a), ty.spine), local.index), quote(VNe(HMeta(b), ty.spine), local.index + 1)), local.vs);
    unify(local.index, ty, pi);
    return synthapps(local, pi, tm, spine, problems);
  }
  return terr(`not a correct pi type in synthapp: ${showVal(local, ty)} ${listToString(spine, ([m, t]) => `@${m.tag === 'ImplUnif' ? 'impl' : ''} ${show(t)}`)} | ${S.showCore(tm, local.ns)}`);
};

const solveInstances = (): void => {
  log(() => `solve instances`);
  const instances = getHoleEntries().filter(p => p[1][3]);
  for (let [name, [tm_, ty_, local]] of instances) {
    const ty = force(ty_);
    const tm = force(tm_);
    log(() => `searchInstance _${name} = ${showVal(local, tm)} : ${showVal(local, ty)}`);
    if (ty.tag === 'VNe' && ty.head.tag === 'HMeta') return terr(`cannot solve instance _${name}, expected type is a meta: ${showVal(local, ty)}`);
    if (tm.tag === 'VNe' && tm.head.tag !== 'HMeta') return terr(`cannot solve instance _${name}, expected term is not a meta: ${showVal(local, tm)}`);
    return terr(`failed to find instance for _${name} = ${showVal(local, tm_)} : ${showVal(local, ty_)}`);
  }
};

const MAX_SOLVING_COUNT = 100;
const tryToSolveBlockedProblems = (): void => {
  log(() => `try solve unsolved problems`);
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

export const elaborate = (t: S.Term, erased: boolean = false): [Term, Term] => {
  resetContext();
  const [tm, ty] = synth(erased ? localErased(localEmpty) : localEmpty, t);

  tryToSolveBlockedProblems();
  solveInstances();
  tryToSolveBlockedProblems();

  const ztm = zonk(tm);
  const zty = zonk(quote(ty, 0));

  showHoles(ztm, zty);  

  if (!contextSolved())
    return terr(`not all metas are solved: ${S.showCore(ztm)} : ${S.showCore(zty)}`);
  return [ztm, zty];
};

export const elaborateDefs = (ds: S.Def[], allowRedefinition: boolean = false): Name[] => {
  log(() => `elaborateDefs ${S.showDefs(ds)}`);
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
        const [tm, ty] = elaborate(d.value, d.erased);
        log(() => `set ${d.name} : ${S.showCore(ty)} = ${S.showCore(tm)}`);

        const [, er] = typecheck(tm, d.erased);
        log(() => `erased term: ${E.show(er)}`);

        setGlobal(d.name, d.erased, tm, evaluate(tm, Nil), evaluate(ty, Nil), er, EV.evaluate(er, Nil));
        if (config.writeToBase) addToBase(d.name, tm, d.erased, true);

        const i = xs.indexOf(d.name);
        if (i >= 0) xs.splice(i, 1);
        xs.push(d.name);
      } catch (err) {
        err.message = `error in def ${d.name}: ${err.message}`;
        throw err;
      }
    } else if (d.tag === 'DExecute') {
      try {
        console.log(S.showDef(d));
        console.log(`term: ${S.show(d.term)}`);

        const [eterm, etype] = elaborate(d.term, d.erased);
        console.log(`type: ${S.showCore(etype)}`);
        console.log(`etrm: ${S.showCore(eterm)}`);

        if (!d.typeOnly) {
          const unfolded = V.normalize(eterm, false);
          console.log(`etru: ${S.showCore(unfolded)}`);

          const [ttype, er] = typecheck(eterm, d.erased);
          console.log(`ctyp: ${S.showCore(ttype)}`);
          console.log(`eras: ${E.show(er)}`);
          console.log(`nera: ${E.show(EV.normalize(er, true))}`);
        }

        console.log();
      } catch (err) {
        err.message = `error in ${S.showDef(d)}: ${err.message}`;
        throw err;
      }
    }
  }
  return xs;
};

const showValSZ = (local: Local, v: Val) =>
  S.showCore(zonk(quote(v, local.index, false), local.vs, local.index, false), local.ns);

const showHoles = (tm: Term, ty: Term) => {
  const holeprops = getHoleEntries().filter(p => !p[1][3]);
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
