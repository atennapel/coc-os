import { Abs, App, Core, ElimEnum, Enum, EnumLit, Global, InsertedMeta, Let, Lift, LiftTerm, liftType, Lower, Pair, Pi, Sigma, Type, Var, Proj } from './core';
import { indexEnvT, Local } from './local';
import { allMetasSolved, freshMeta, resetMetas } from './metas';
import { show, Surface } from './surface';
import { cons, List, nil } from './utils/List';
import { evaluate, force, quote, VAbs, Val, vapp, VEnum, VEnumLit, VFlex, vinst, VLift, VPi, vproj, VType, VVar, zonk } from './values';
import * as S from './surface';
import { log } from './config';
import { iterate, terr, tryT } from './utils/utils';
import { unify } from './unification';
import { Ix, Name } from './names';
import { getGlobal, setGlobal } from './globals';
import { typecheck } from './typecheck';

export type HoleInfo = [Val, Val, Local, boolean];

const showV = (local: Local, val: Val): string => S.showVal(val, local.level, false, local.ns);

const newMeta = (local: Local, universe: Ix): Core => {
  const id = freshMeta(universe);
  const bds = local.ts.map(e => e.bound);
  return InsertedMeta(id, bds);
};

const inst = (local: Local, ty_: Val): [Val, List<Core>] => {
  const ty = force(ty_);
  if (ty.tag === 'VPi' && ty.erased) {
    const m = newMeta(local, ty.u1);
    const vm = evaluate(m, local.vs);
    const [res, args] = inst(local, vinst(ty, vm));
    return [res, cons(m, args)];
  }
  return [ty_, nil];
};

const check = (local: Local, tm: Surface, ty: Val, u: Ix): Core => {
  log(() => `check(*${u}) ${show(tm)} : ${showV(local, ty)}`);
  if (tm.tag === 'Hole') {
    const x = newMeta(local, 0); // TODO: is 0 fine here?
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
    const body = check(local.bind(fty.erased, x, fty.type, fty.u1), tm.body, vinst(fty, v), fty.u2);
    return Abs(fty.erased, x, quote(fty.type, local.level), body);
  }
  if (fty.tag === 'VPi' && fty.erased) {
    const v = VVar(local.level);
    const term = check(local.insert(true, fty.name, fty.type, fty.u1), tm, vinst(fty, v), u);
    return Abs(fty.erased, fty.name, quote(fty.type, local.level), term);
  }
  if (fty.tag === 'VLift' && tm.tag === 'EnumLit') {
    const term = check(local, tm, fty.type, u - 1);
    return LiftTerm(term);
  }
  if (tm.tag === 'Enum' && fty.tag === 'VType') {
    if (!local.erased) return terr(`enum type in non-type context: ${show(tm)}`);
    return iterate(fty.index, Enum(tm.num) as Core, x => Lift(x) as Core);
  }
  if (tm.tag === 'EnumLit' && fty.tag === 'VEnum' && (tm.num === null || tm.num === fty.num))
    return EnumLit(tm.val, fty.num);
  if (tm.tag === 'ElimEnum' && !tm.motive) {
    if (tm.cases.length !== tm.num) return terr(`cases amount mismatch, expected ${tm.num} but got ${tm.cases.length}: ${show(tm)}`);
    const lift = tm.lift || 0;
    const vmotive = VAbs(false, '_', VEnum(tm.num), _ => ty);
    const motive = quote(vmotive, local.level);
    const scrut = check(local, tm.scrut, VEnum(tm.num), 0);
    const cases = tm.cases.map((c, i) => check(local, c, vapp(vmotive, false, VEnumLit(i, tm.num)), u));
    return ElimEnum(tm.num, lift, motive, scrut, cases);
  }
  if (tm.tag === 'Lift' && fty.tag === 'VType' && fty.index > 0) {
    if (!local.erased) return terr(`Lift type in non-type context: ${show(tm)}`);
    const type = check(local, tm.type, VType(fty.index - 1), u - 1);
    return Lift(type);
  }
  if (tm.tag === 'LiftTerm' && fty.tag === 'VLift') {
    const term = check(local, tm.term, fty.type, u - 1);
    return LiftTerm(term);
  }
  if (tm.tag === 'Pair') {
    if (fty.tag !== 'VSigma') return terr(`not a sigma type in pair (${show(tm)}): ${showV(local, ty)}`);
    if (tm.erased !== fty.erased) return terr(`erasure mismatch in pair (${show(tm)}): ${showV(local, ty)}`);
    const fst = check(tm.erased ? local.inType() : local, tm.fst, fty.type, u);
    const snd = check(local, tm.snd, vinst(fty, evaluate(fst, local.vs)), u);
    return Pair(tm.erased, fst, snd, quote(ty, local.level));
  }
  if (tm.tag === 'Let') {
    let vtype: Core;
    let vty: Val;
    let val: Core;
    let ul: Ix;
    if (tm.type) {
      [vtype, ul] = synthType(local.inType(), tm.type);
      vty = evaluate(vtype, local.vs);
      val = check(tm.erased ? local.inType() : local, tm.val, ty, ul);
    } else {
      [val, vty, ul] = synth(tm.erased ? local.inType() : local, tm.val);
      vtype = quote(vty, local.level);
    }
    const v = evaluate(val, local.vs);
    const body = check(local.define(tm.erased, tm.name, vty, v, ul), tm.body, ty, u);
    return Let(tm.erased, tm.name, vtype, val, body);
  }
  const [term, ty2, u2] = synth(local, tm);
  if (u2 !== u) return terr(`check failed (${show(tm)}): ${showV(local, ty2)} ~ ${showV(local, ty)}, universe mismatch: *${u2} ~ *${u}`);
  const [ty2inst, ms] = inst(local, ty2);
  return tryT(() => {
    log(() => `unify ${showV(local, ty2inst)} ~ ${showV(local, ty)}`);
    log(() => `for check ${show(tm)} : ${showV(local, ty)}`);
    unify(local.level, ty2inst, ty);
    return ms.foldl((a, m) => App(a, true, m), term);
  }, e => terr(`check failed (${show(tm)}): ${showV(local, ty2)} ~ ${showV(local, ty)}: ${e}`));
};

const freshPi = (local: Local, erased: boolean, x: Name): Val => {
  const a = newMeta(local, 0); // TODO: is 0 fine here?
  const va = evaluate(a, local.vs);
  const b = newMeta(local.bind(erased, '_', va, 0), 0);
  return evaluate(Pi(erased, x, a, 0, b, 0), local.vs);
};

const synthType = (local: Local, tm: Surface): [Core, Ix] => {
  const [type, ty] = synth(local, tm);
  const fty = force(ty);
  if (fty.tag !== 'VType') return terr(`expected type but got ${showV(local, ty)}, while synthesizing ${show(tm)}`);
  return [type, fty.index];
};

const synth = (local: Local, tm: Surface): [Core, Val, Ix] => {
  log(() => `synth ${show(tm)}`);
  if (tm.tag === 'Type') {
    if (!local.erased) return terr(`type in non-type context: ${show(tm)}`);
    return [Type(tm.index), VType(tm.index + 1), 2];
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
      return [Global(tm.name, tm.lift), ty, entry.universe];
    } else {
      if (tm.lift > 0) return terr(`local variables cannot be lifted: ${show(tm)}`);
      const [entry, j] = indexEnvT(local.ts, i) || terr(`var out of scope ${show(tm)}`);
      if (entry.erased && !local.erased) return terr(`erased var used: ${show(tm)}`);
      return [Var(j), entry.type, entry.universe];
    }
  }
  if (tm.tag === 'App') {
    const [fn, fnty, u1] = synth(local, tm.fn);
    const [arg, rty, ms, u] = synthapp(local, fnty, u1, tm.erased, tm.arg, tm);
    return [App(ms.foldl((a, m) => App(a, true, m), fn), tm.erased, arg), rty, u];
  }
  if (tm.tag === 'Abs') {
    if (tm.type) {
      const [type, u1] = synthType(local.inType(), tm.type);
      const ty = evaluate(type, local.vs);
      const [body, rty, u2] = synth(local.bind(tm.erased, tm.name, ty, u1), tm.body);
      const u = Math.max(u1, u2);
      const qpi = Pi(tm.erased, tm.name, type, u1, quote(rty, local.level + 1), u);
      const pi = evaluate(qpi, local.vs);
      return [Abs(tm.erased, tm.name, type, body), pi, u];
    } else {
      const pi = freshPi(local, tm.erased, tm.name);
      const term = check(local, tm, pi, 0);
      return [term, pi, 0];
    }
  }
  if (tm.tag === 'Pi') {
    if (!local.erased) return terr(`pi type in non-type context: ${show(tm)}`);
    const [type, s1] = synthType(local.inType(), tm.type);
    const ty = evaluate(type, local.vs);
    const [body, s2] = synthType(local.inType().bind(tm.erased, tm.name, ty, s1), tm.body);
    const u = Math.max(s1, s2);
    const pi = Pi(tm.erased, tm.name, type, s1, body, u);
    log(() => `Pi synth done (${u} : ${u + 1}): ${S.showCore(pi, local.ns)}`);
    return [pi, VType(u), u + 1];
  }
  if (tm.tag === 'Sigma') {
    if (!local.erased) return terr(`sigma type in non-type context: ${show(tm)}`);
    const [type, s1] = synthType(local.inType(), tm.type);
    const ty = evaluate(type, local.vs);
    const [body, s2] = synthType(local.inType().bind(tm.erased, tm.name, ty, s1), tm.body);
    const u = Math.max(s1, s2);
    return [Sigma(tm.erased, tm.name, type, s1, body, u), VType(u), u + 1];
  }
  if (tm.tag === 'Proj') {
    const [term, ty, u] = synth(local, tm.term);
    const fty = force(ty);
    if (fty.tag !== 'VSigma') return terr(`not a sigma type in proj (${show(tm)}): ${showV(local, ty)}`);
    return [Proj(tm.proj, term), tm.proj === 'fst' ? fty.type : vinst(fty, vproj('fst', evaluate(term, local.vs))), u];
  }
  if (tm.tag === 'Let') {
    let type: Core;
    let ty: Val;
    let val: Core;
    let uni: Ix;
    if (tm.type) {
      [type, uni] = synthType(local.inType(), tm.type);
      ty = evaluate(type, local.vs);
      val = check(tm.erased ? local.inType() : local, tm.val, ty, uni);
    } else {
      [val, ty, uni] = synth(tm.erased ? local.inType() : local, tm.val);
      type = quote(ty, local.level);
    }
    const v = evaluate(val, local.vs);
    const [body, rty, u] = synth(local.define(tm.erased, tm.name, ty, v, uni), tm.body);
    return [Let(tm.erased, tm.name, type, val, body), rty, u];
  }
  if (tm.tag === 'Hole') {
    const t = newMeta(local, 0); // is 0 fine here?
    const vt = evaluate(newMeta(local, 0), local.vs);
    if (tm.name) {
      if (holes[tm.name]) return terr(`duplicate hole ${tm.name}`);
      holes[tm.name] = [evaluate(t, local.vs), vt, local];
    }
    return [t, vt, 0];
  }
  if (tm.tag === 'Pair') {
    const [fst, fstty, u1] = synth(tm.erased ? local.inType() : local, tm.fst);
    const [snd, sndty, u2] = synth(local, tm.snd);
    const u = Math.max(u1, u2);
    const ty = Sigma(false, '_', quote(fstty, local.level), u1, quote(sndty, local.level + 1), u);
    return [Pair(tm.erased, fst, snd, ty), evaluate(ty, local.vs), u];
  }
  if (tm.tag === 'Enum') {
    if (!local.erased) return terr(`enum type in non-type context: ${show(tm)}`);
    return [Enum(tm.num), VType(0), 1];
  }
  if (tm.tag === 'EnumLit' && tm.num !== null) {
    if (tm.val >= tm.num) return terr(`invalid enum literal: ${show(tm)}`);
    return [EnumLit(tm.val, tm.num), VEnum(tm.num), 0];
  }
  if (tm.tag === 'ElimEnum') {
    if (tm.cases.length !== tm.num) return terr(`cases amount mismatch, expected ${tm.num} but got ${tm.cases.length}: ${show(tm)}`);
    const lift = tm.lift || 0;
    let premotive: Surface;
    if (!tm.motive) {
      premotive = S.App(S.Abs(false, 't', S.Type(lift), S.Abs(false, '_', S.Enum(tm.num), S.Var('t', 0))), false, S.Hole(null));
      // TODO: universe variable
    } else premotive = tm.motive;
    const u = lift + 1;
    const motive = check(local.inType(), premotive, VPi(false, '_', VEnum(tm.num), 0, _ => VType(lift), u), u);
    const vmotive = evaluate(motive, local.vs);
    const scrut = check(local, tm.scrut, VEnum(tm.num), 0);
    const vscrut = evaluate(scrut, local.vs);
    const cases = tm.cases.map((c, i) => check(local, c, vapp(vmotive, false, VEnumLit(i, tm.num)), lift));
    return [ElimEnum(tm.num, lift, motive, scrut, cases), vapp(vmotive, false, vscrut), lift];
  }
  if (tm.tag === 'Lift') {
    if (!local.erased) return terr(`Lift type in non-type context: ${show(tm)}`);
    /*
    t : *k
    -------------------
    Lift t : *(k + 1)
    */
    const [type, ty] = synth(local, tm.type);
    const vty = force(ty);
    if (vty.tag !== 'VType') return terr(`not a type in ${show(tm)}: ${showV(local, ty)}`);
    return [Lift(type), VType(vty.index + 1), vty.index + 2];
  }
  if (tm.tag === 'LiftTerm') {
    /*
    t : A
    -------------------
    lift t : Lift A
    */
    const [term, ty, u] = synth(local, tm.term);
    return [LiftTerm(term), VLift(ty), u + 1];
  }
  if (tm.tag === 'Lower') {
    /*
    t : Lift^l A
    -------------------
    lower t : A
    */
    const [term, ty, u] = synth(local, tm.term);
    const vty = force(ty);
    if (vty.tag !== 'VLift') return terr(`not a Lift type in ${show(tm)}: ${showV(local, ty)}`);
    return [Lower(term), vty.type, u - 1];
  }
  return terr(`unable to synth ${show(tm)}`);
};

const synthapp = (local: Local, ty_: Val, ul: Ix, erased: boolean, tm: Surface, tmall: Surface): [Core, Val, List<Core>, Ix] => {
  log(() => `synthapp ${showV(local, ty_)} ${erased ? '-' : ''}@ ${show(tm)}`);
  const ty = force(ty_);
  if (ty.tag === 'VPi' && ty.erased && !erased) {
    const m = newMeta(local, ty.u1);
    const vm = evaluate(m, local.vs);
    const [rest, rt, l, u] = synthapp(local, vinst(ty, vm), ul, erased, tm, tmall);
    return [rest, rt, cons(m, l), u];
  }
  if (ty.tag === 'VPi' && ty.erased === erased) {
    const right = check(erased ? local.inType() : local, tm, ty.type, ty.u1);
    const rt = vinst(ty, evaluate(right, local.vs));
    return [right, rt, nil, ty.u2];
  }
  if (ty.tag === 'VFlex') {
    const a = freshMeta(0); // TODO: is 0 fine here?
    const b = freshMeta(0);
    const pi = VPi(erased, '_', VFlex(a, ty.spine), 0, () => VFlex(b, ty.spine), 0);
    unify(local.level, ty, pi);
    return synthapp(local, pi, ul, erased, tm, tmall);
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

export const elaborate = (t: Surface, erased: boolean = false): [Core, Core, Ix] => {
  holes = {};
  resetMetas();
  const [tm, ty, u] = synth(erased ? Local.empty().inType() : Local.empty(), t);

  const ztm = zonk(tm);
  const zty = zonk(quote(ty, 0));

  showHoles(ztm, zty);

  if (!allMetasSolved())
    return terr(`not all metas are solved: ${S.showCore(ztm)} : ${S.showCore(zty)}`);
  return [ztm, zty, u];
};

export const elaborateDef = (d: S.Def): void => {
  log(() => `elaborateDef ${S.showDef(d)}`);
  if (d.tag === 'DDef') {
    tryT(() => {
      const [term, type, u] = elaborate(d.value, d.erased);
      log(() => `elaborated def ${d.name}: ${S.showCore(term)} : ${S.showCore(type)} (*${u})`);
      // verify elaboration
      const [vty] = typecheck(term, d.erased ? Local.empty().inType() : Local.empty());
      log(() => `verified def ${d.name}: ${S.showCore(vty)}`);
      setGlobal(d.name, evaluate(type, nil), u, evaluate(term, nil), type, term, d.erased);
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
