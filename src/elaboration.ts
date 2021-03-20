import { Abs, App, Core, ElimEnum, Enum, EnumLit, Global, InsertedMeta, Let, Lift, LiftTerm, liftType, Pair, Pi, Sigma, Type, Var } from './core';
import { indexEnvT, Local } from './local';
import { allMetasSolved, freshMeta, resetMetas } from './metas';
import { show, Surface } from './surface';
import { cons, List, nil } from './utils/List';
import { evaluate, force, quote, VAbs, Val, vapp, VEnum, VEnumLit, VFlex, vinst, VLift, VPi, VType, VVar, zonk } from './values';
import * as S from './surface';
import { log } from './config';
import { terr, tryT } from './utils/utils';
import { unify } from './unification';
import { Ix, Name } from './names';
import { getGlobal, setGlobal } from './globals';
import { typecheck } from './typecheck';

export type HoleInfo = [Val, Val, Local, boolean];

const showV = (local: Local, val: Val): string => S.showVal(val, local.level, false, local.ns);

const newMeta = (local: Local): Core => {
  const id = freshMeta();
  const bds = local.ts.map(e => e.bound);
  return InsertedMeta(id, bds);
};

const inst = (local: Local, ty_: Val): [Val, List<Core>] => {
  const ty = force(ty_);
  if (ty.tag === 'VPi' && ty.erased) {
    const m = newMeta(local);
    const vm = evaluate(m, local.vs);
    const [res, args] = inst(local, vinst(ty, vm));
    return [res, cons(m, args)];
  }
  return [ty_, nil];
};

const check = (local: Local, tm: Surface, ty: Val): Core => {
  log(() => `check ${show(tm)} : ${showV(local, ty)}`);
  if (tm.tag === 'Hole') {
    const x = newMeta(local);
    if (tm.name) {
      if (holes[tm.name]) return terr(`duplicate hole ${tm.name}`);
      holes[tm.name] = [evaluate(x, local.vs), ty, local];
    }
    return x;
  }
  const fty = force(ty);
  log(() => `check(full) ${show(tm)} : ${showV(local, fty)}`);
  if (tm.tag === 'Abs' && !tm.type && fty.tag === 'VPi' && tm.erased === fty.erased) {
    const v = VVar(local.level);
    const x = tm.name;
    const body = check(local.bind(fty.erased, x, fty.type), tm.body, vinst(fty, v));
    return Abs(fty.erased, x, quote(fty.type, local.level), body);
  }
  if (fty.tag === 'VPi' && fty.erased) {
    const v = VVar(local.level);
    const term = check(local.insert(true, fty.name, fty.type), tm, vinst(fty, v));
    return Abs(fty.erased, fty.name, quote(fty.type, local.level), term);
  }
  if (tm.tag === 'Enum' && fty.tag === 'VType' && (tm.lift === null || tm.lift <= fty.index)) {
    if (!local.erased) return terr(`enum type in non-type context: ${show(tm)}`);
    return Enum(tm.num, fty.index);
  }
  if (tm.tag === 'EnumLit' && fty.tag === 'VEnum' && (tm.num === null || tm.num === fty.num) && (tm.lift === null || tm.lift <= fty.lift))
    return EnumLit(tm.val, fty.num, fty.lift);
  if (tm.tag === 'ElimEnum' && !tm.motive) {
    if (tm.cases.length !== tm.num) return terr(`cases amount mismatch, expected ${tm.num} but got ${tm.cases.length}: ${show(tm)}`);
    const lift = tm.lift || 0;
    const vmotive = VAbs(false, '_', VEnum(tm.num, lift), _ => ty);
    const motive = quote(vmotive, local.level);
    const scrut = check(local, tm.scrut, VEnum(tm.num, lift));
    const cases = tm.cases.map((c, i) => check(local, c, vapp(vmotive, false, VEnumLit(i, tm.num, lift))));
    return ElimEnum(tm.num, lift, motive, scrut, cases);
  }
  if (tm.tag === 'Lift' && fty.tag === 'VType') {
    if (!local.erased) return terr(`Lift type in non-type context: ${show(tm)}`);
    const type = check(local, tm.type, VType(fty.index - tm.lift - 1));
    return Lift(tm.lift, type);
  }
  if (tm.tag === 'LiftTerm' && fty.tag === 'VLift') {
    /*
    t : A
    -------------------
    lift^l t : Lift^l A
    */
    const term = check(local, tm.term, fty.type);
    return LiftTerm(tm.lift, term);
  }
  if (tm.tag === 'Pair') {
    if (fty.tag !== 'VSigma') return terr(`not a sigma type in pair (${show(tm)}): ${showV(local, ty)}`);
    if (tm.erased !== fty.erased) return terr(`erasure mismatch in pair (${show(tm)}): ${showV(local, ty)}`);
    const fst = check(tm.erased ? local.inType() : local, tm.fst, fty.type);
    const snd = check(local, tm.snd, vinst(fty, evaluate(fst, local.vs)));
    return Pair(tm.erased, fst, snd, quote(ty, local.level));
  }
  if (tm.tag === 'Let') {
    let vtype: Core;
    let vty: Val;
    let val: Core;
    if (tm.type) {
      [vtype] = synthType(local.inType(), tm.type);
      vty = evaluate(vtype, local.vs);
      val = check(tm.erased ? local.inType() : local, tm.val, ty);
    } else {
      [val, vty] = synth(tm.erased ? local.inType() : local, tm.val);
      vtype = quote(vty, local.level);
    }
    const v = evaluate(val, local.vs);
    const body = check(local.define(tm.erased, tm.name, vty, v), tm.body, ty);
    return Let(tm.erased, tm.name, vtype, val, body);
  }
  const [term, ty2] = synth(local, tm);
  const [ty2inst, ms] = inst(local, ty2);
  return tryT(() => {
    log(() => `unify ${showV(local, ty2inst)} ~ ${showV(local, ty)}`);
    log(() => `for check ${show(tm)} : ${showV(local, ty)}`);
    unify(local.level, ty2inst, ty);
    return ms.foldl((a, m) => App(a, true, m), term);
  }, e => terr(`check failed (${show(tm)}): ${showV(local, ty2)} ~ ${showV(local, ty)}: ${e}`));
};

const freshPi = (local: Local, erased: boolean, x: Name): Val => {
  const a = newMeta(local);
  const va = evaluate(a, local.vs);
  const b = newMeta(local.bind(erased, '_', va));
  return evaluate(Pi(erased, x, a, b), local.vs);
};

const synthType = (local: Local, tm: Surface): [Core, Ix] => {
  const [type, ty] = synth(local, tm);
  const fty = force(ty);
  if (fty.tag !== 'VType') return terr(`expected type but got ${showV(local, ty)}, while synthesizing ${show(tm)}`);
  return [type, fty.index];
};

const synth = (local: Local, tm: Surface): [Core, Val] => {
  log(() => `synth ${show(tm)}`);
  if (tm.tag === 'Type') {
    if (!local.erased) return terr(`type in non-type context: ${show(tm)}`);
    return [Type(tm.index), VType(tm.index + 1)];
  }
  if (tm.tag === 'Var') {
    const i = local.nsSurface.indexOf(tm.name);
    if (i < 0) {
      const entry = getGlobal(tm.name);
      if (!entry) return terr(`global ${tm.name} not found`);
      if (entry.erased && !local.erased) return terr(`erased global used: ${show(tm)}`);
      let ty;
      if (tm.lift === 0) {
        ty = entry.type;
      } else {
        ty = evaluate(liftType(tm.lift, entry.etype), local.vs);
      }
      return [Global(tm.name, tm.lift), ty];
    } else {
      if (tm.lift > 0) return terr(`local variables cannot be lifted: ${show(tm)}`);
      const [entry, j] = indexEnvT(local.ts, i) || terr(`var out of scope ${show(tm)}`);
      if (entry.erased && !local.erased) return terr(`erased var used: ${show(tm)}`);
      return [Var(j), entry.type];
    }
  }
  if (tm.tag === 'App') {
    const [fn, fnty] = synth(local, tm.fn);
    const [arg, rty, ms] = synthapp(local, fnty, tm.erased, tm.arg, tm);
    return [App(ms.foldl((a, m) => App(a, true, m), fn), tm.erased, arg), rty];
  }
  if (tm.tag === 'Abs') {
    if (tm.type) {
      const [type] = synthType(local.inType(), tm.type);
      const ty = evaluate(type, local.vs);
      const [body, rty] = synth(local.bind(tm.erased, tm.name, ty), tm.body);
      const qpi = Pi(tm.erased, tm.name, type, quote(rty, local.level + 1));
      const pi = evaluate(qpi, local.vs);
      return [Abs(tm.erased, tm.name, type, body), pi];
    } else {
      const pi = freshPi(local, tm.erased, tm.name);
      const term = check(local, tm, pi);
      return [term, pi];
    }
  }
  if (tm.tag === 'Pi') {
    if (!local.erased) return terr(`pi type in non-type context: ${show(tm)}`);
    const [type, s1] = synthType(local.inType(), tm.type);
    const ty = evaluate(type, local.vs);
    const [body, s2] = synthType(local.inType().bind(tm.erased, tm.name, ty), tm.body);
    return [Pi(tm.erased, tm.name, type, body), VType(Math.max(s1, s2))];
  }
  if (tm.tag === 'Sigma') {
    if (!local.erased) return terr(`sigma type in non-type context: ${show(tm)}`);
    const [type, s1] = synthType(local.inType(), tm.type);
    const ty = evaluate(type, local.vs);
    const [body, s2] = synthType(local.inType().bind(tm.erased, tm.name, ty), tm.body);
    return [Sigma(tm.erased, tm.name, type, body), VType(Math.max(s1, s2))];
  }
  if (tm.tag === 'Let') {
    let type: Core;
    let ty: Val;
    let val: Core;
    if (tm.type) {
      [type] = synthType(local.inType(), tm.type);
      ty = evaluate(type, local.vs);
      val = check(tm.erased ? local.inType() : local, tm.val, ty);
    } else {
      [val, ty] = synth(tm.erased ? local.inType() : local, tm.val);
      type = quote(ty, local.level);
    }
    const v = evaluate(val, local.vs);
    const [body, rty] = synth(local.define(tm.erased, tm.name, ty, v), tm.body);
    return [Let(tm.erased, tm.name, type, val, body), rty];
  }
  if (tm.tag === 'Hole') {
    const t = newMeta(local);
    const vt = evaluate(newMeta(local), local.vs);
    if (tm.name) {
      if (holes[tm.name]) return terr(`duplicate hole ${tm.name}`);
      holes[tm.name] = [evaluate(t, local.vs), vt, local];
    }
    return [t, vt];
  }
  if (tm.tag === 'Pair') {
    const [fst, fstty] = synth(tm.erased ? local.inType() : local, tm.fst);
    const [snd, sndty] = synth(local, tm.snd);
    const ty = Sigma(false, '_', quote(fstty, local.level), quote(sndty, local.level + 1));
    return [Pair(tm.erased, fst, snd, ty), evaluate(ty, local.vs)];
  }
  if (tm.tag === 'Enum') {
    if (!local.erased) return terr(`enum type in non-type context: ${show(tm)}`);
    return [Enum(tm.num, tm.lift || 0), VType(tm.lift || 0)];
  }
  if (tm.tag === 'EnumLit' && tm.num !== null) {
    if (tm.val >= tm.num) return terr(`invalid enum literal: ${show(tm)}`);
    return [EnumLit(tm.val, tm.num, tm.lift || 0), VEnum(tm.num, tm.lift || 0)];
  }
  if (tm.tag === 'ElimEnum') {
    if (tm.cases.length !== tm.num) return terr(`cases amount mismatch, expected ${tm.num} but got ${tm.cases.length}: ${show(tm)}`);
    const lift = tm.lift || 0;
    let premotive: Surface;
    if (!tm.motive) {
      premotive = S.App(S.Abs(false, 't', S.Type(0), S.Abs(false, '_', S.Enum(tm.num, lift), S.Var('t', 0))), false, S.Hole(null));
      // TODO: universe variable
    } else premotive = tm.motive;
    const motive = check(local.inType(), premotive, VPi(false, '_', VEnum(tm.num, lift), _ => VType(lift)));
    const vmotive = evaluate(motive, local.vs);
    const scrut = check(local, tm.scrut, VEnum(tm.num, lift));
    const vscrut = evaluate(scrut, local.vs);
    const cases = tm.cases.map((c, i) => check(local, c, vapp(vmotive, false, VEnumLit(i, tm.num, lift))));
    return [ElimEnum(tm.num, lift, motive, scrut, cases), vapp(vmotive, false, vscrut)];
  }
  if (tm.tag === 'Lift') {
    if (!local.erased) return terr(`Lift type in non-type context: ${show(tm)}`);
    /*
    t : *k
    -------------------
    Lift^l t : *(l + k)
    */
    const [type, ty] = synth(local, tm.type);
    const vty = force(ty);
    if (vty.tag !== 'VType') return terr(`not a type in ${show(tm)}: ${showV(local, ty)}`);
    return [Lift(tm.lift, type), VType(tm.lift + vty.index + 1)];
  }
  if (tm.tag === 'LiftTerm') {
    /*
    t : A
    -------------------
    lift^l t : Lift^l A
    */
    const [term, ty] = synth(local, tm.term);
    return [LiftTerm(tm.lift, term), VLift(tm.lift, ty)];
  }
  return terr(`unable to synth ${show(tm)}`);
};

const synthapp = (local: Local, ty_: Val, erased: boolean, tm: Surface, tmall: Surface): [Core, Val, List<Core>] => {
  log(() => `synthapp ${showV(local, ty_)} ${erased ? '-' : ''}@ ${show(tm)}`);
  const ty = force(ty_);
  if (ty.tag === 'VPi' && ty.erased && !erased) {
    const m = newMeta(local);
    const vm = evaluate(m, local.vs);
    const [rest, rt, l] = synthapp(local, vinst(ty, vm), erased, tm, tmall);
    return [rest, rt, cons(m, l)];
  }
  if (ty.tag === 'VPi' && ty.erased === erased) {
    const right = check(erased ? local.inType() : local, tm, ty.type);
    const rt = vinst(ty, evaluate(right, local.vs));
    return [right, rt, nil];
  }
  if (ty.tag === 'VFlex') {
    const a = freshMeta();
    const b = freshMeta();
    const pi = VPi(erased, '_', VFlex(a, ty.spine), () => VFlex(b, ty.spine));
    unify(local.level, ty, pi);
    return synthapp(local, pi, erased, tm, tmall);
  }
  return terr(`invalid type or plicity mismatch in synthapp in ${show(tmall)}: ${showV(local, ty)} ${erased ? '-' : ''}@ ${show(tm)}`);
};

type Holes = { [key: string]: [Val, Val, Local] }
let holes: Holes = {};

const showValSZ = (local: Local, v: Val) =>
  S.showCore(zonk(quote(v, local.level, false), local.vs, local.level, false), local.ns);
const showHoles = (tm: Core, ty: Core) => {
  const holeprops = Object.entries(holes);
  if (holeprops.length === 0) return;
  const strtype = S.showCore(ty);
  const strterm = S.showCore(tm);
  const str = holeprops.map(([x, [t, v, local]]) => {
    const fst = local.ns.zipWith(local.vs, (x, v) => [x, v] as [Name, Val]);
    const all = fst.zipWith(local.ts, ([x, v], { bound: def, type: ty, inserted, erased }) => [x, v, def, ty, inserted, erased] as [Name, Val, boolean, Val, boolean, boolean]);
    const allstr = all.toMappedArray(([x, v, b, t, _, p]) => `${p ? `{${x}}` : x} : ${showValSZ(local, t)}${b ? '' : ` = ${showValSZ(local, v)}`}`).join('\n');
    return `\n_${x} : ${showValSZ(local, v)} = ${showValSZ(local, t)}\nlocal:\n${allstr}\n`;
  }).join('\n');
  return terr(`unsolved holes\ntype: ${strtype}\nterm: ${strterm}\n${str}`);
};

export const elaborate = (t: Surface, erased: boolean = false): [Core, Core] => {
  holes = {};
  resetMetas();
  const [tm, ty] = synth(erased ? Local.empty().inType() : Local.empty(), t);

  const ztm = zonk(tm);
  const zty = zonk(quote(ty, 0));

  showHoles(ztm, zty);

  if (!allMetasSolved())
    return terr(`not all metas are solved: ${S.showCore(ztm)} : ${S.showCore(zty)}`);
  return [ztm, zty];
};

export const elaborateDef = (d: S.Def): void => {
  log(() => `elaborateDef ${S.showDef(d)}`);
  if (d.tag === 'DDef') {
    tryT(() => {
      const [term, type] = elaborate(d.value, d.erased);
      log(() => `elaborated def ${d.name}: ${S.showCore(term)} : ${S.showCore(type)}`);
      // verify elaboration
      const vty = typecheck(term, d.erased ? Local.empty().inType() : Local.empty());
      log(() => `verified def ${d.name}: ${S.showCore(vty)}`);
      setGlobal(d.name, evaluate(type, nil), evaluate(term, nil), type, term, d.erased);
    }, err => {
      terr(`while elaborating definition ${d.name}: ${err}`);
    });
    return;
  }
  return d.tag;
};

export const elaborateDefs = (ds: S.Def[]): void => {
  for (let i = 0, l = ds.length; i < l; i++)
    elaborateDef(ds[i]);
};
