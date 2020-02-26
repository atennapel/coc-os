import { Term, showSurface, showTerm, Pi } from './syntax';
import { Ix, Name } from './names';
import { List, Cons, listToString, Nil, index } from './utils/list';
import { Val, showTermQ, EnvV, extendV, force, showTermU, VVar, evaluate, quote, showEnvV, VType } from './domain';
import { log } from './config';
import { terr } from './utils/util';
import { Def, showDef } from './definitions';
import { globalGet, globalSet } from './globalenv';
import { unify } from './unify';
import { Plicity } from './surface';

type EnvT = List<[boolean, Val]>;
const extendT = (ts: EnvT, val: Val, bound: boolean): EnvT => Cons([bound, val], ts);
const showEnvT = (ts: EnvT, k: Ix = 0, full: boolean = false): string =>
  listToString(ts, ([b, v]) => `${b ? '' : 'def '}${showTermQ(v, k, full)}`);

interface Local {
  names: List<Name>;
  namesErased: List<Name>;
  ts: EnvT;
  vs: EnvV;
  index: Ix;
  indexErased: Ix;
}
const localEmpty: Local = { names: Nil, namesErased: Nil, ts: Nil, vs: Nil, index: 0, indexErased: 0 };
const extend = (l: Local, x: Name, ty: Val, bound: boolean, val: Val, erased: boolean = false): Local => ({
  names: Cons(x, l.names),
  namesErased: erased ? l.namesErased : Cons(x, l.namesErased),
  ts: extendT(l.ts, ty, bound),
  vs: extendV(l.vs, val),
  index: l.index + 1,
  indexErased: erased ? l.indexErased : l.indexErased + 1,
});

const erasedUsed = (k: Ix, t: Term): boolean => {
  if (t.tag === 'Var') return t.index === k;
  if (t.tag === 'App') return erasedUsed(k, t.left) || (!t.plicity && erasedUsed(k, t.right));
  if (t.tag === 'Abs') return erasedUsed(k + 1, t.body);
  if (t.tag === 'Let') return erasedUsed(k + 1, t.body) || (!t.plicity && erasedUsed(k, t.val));
  if (t.tag === 'Ann') return erasedUsed(k, t.term);
  return false;
};

const check = (local: Local, tm: Term, ty: Val): void => {
  log(() => `check ${showSurface(tm, local.names)} : ${showTermU(ty, local.names, local.index)} in ${showEnvT(local.ts, local.indexErased, false)} and ${showEnvV(local.vs, local.indexErased, false)}`);
  if (ty.tag === 'VType' && tm.tag === 'Type') return;
  const tyf = force(ty);
  if (tm.tag === 'Abs' && !tm.type && tyf.tag === 'VPi' && tm.plicity === tyf.plicity) {
    const v = VVar(local.index);
    check(extend(local, tm.name, tyf.type, true, v, tyf.plicity), tm.body, tyf.body(v));
    if (tm.plicity && erasedUsed(0, tm.body))
      return terr(`erased argument used in ${showSurface(tm, local.names)}`);
    return;
  }
  if (tm.tag === 'Abs' && !tm.type && tyf.tag === 'VPi' && !tm.plicity && tyf.plicity) {
    const v = VVar(local.index);
    check(extend(local, tm.name, tyf.type, true, v, tyf.plicity), tm, tyf.body(v));
    return;
  }
  if (tm.tag === 'Let') {
    const vty = synth(local, tm.val);
    check(extend(local, tm.name, vty, false, evaluate(tm.val, local.vs), tm.plicity), tm.body, ty);
    if (tm.plicity && erasedUsed(0, tm.body))
      return terr(`erased argument used in ${showSurface(tm, local.names)}`);
    return;
  }
  if (tm.tag === 'Roll' && !tm.type && tyf.tag === 'VFix') {
    check(local, tm.term, tyf.body(evaluate(tm, local.vs), ty));
    return;
  }
  if (tyf.tag === 'VFix' && tm.tag === 'Abs') {
    check(local, tm, tyf.body(evaluate(tm, local.vs), ty));
    return;
  }
  const ty2 = synth(local, tm);
  try {
    log(() => `unify ${showTermU(ty2, local.names, local.index)} ~ ${showTermU(ty, local.names, local.index)}`);
    unify(local.index, ty2, ty);
    return;
  } catch(err) {
    if (!(err instanceof TypeError)) throw err;
    return terr(`failed to unify ${showTermU(ty2, local.names, local.index)} ~ ${showTermU(ty, local.names, local.index)}: ${err.message}`);
  }
};

const synth = (local: Local, tm: Term): Val => {
  log(() => `synth ${showSurface(tm, local.names)} in ${showEnvT(local.ts, local.indexErased, false)} and ${showEnvV(local.vs, local.indexErased, false)}`);
  if (tm.tag === 'Type') return VType;
  if (tm.tag === 'Var') {
    const res = index(local.ts, tm.index);
    if (!res) return terr(`var out of scope ${showSurface(tm, local.names)}`);
    return res[1];
  }
  if (tm.tag === 'Global') {
    const entry = globalGet(tm.name);
    if (!entry) return terr(`global ${tm.name} not found`);
    return entry.type;
  }
  if (tm.tag === 'App') {
    const fn = synth(local, tm.left);
    const rt = synthapp(local, tm.left, fn, tm.plicity, tm.right);
    return rt;
  }
  if (tm.tag === 'Abs' && tm.type) {
    check(local, tm.type, VType);
    const vtype = evaluate(tm.type, local.vs);
    const rt = synth(extend(local, tm.name, vtype, true, VVar(local.indexErased), tm.plicity), tm.body);
    if (tm.plicity && erasedUsed(0, tm.body))
      return terr(`erased argument used in ${showSurface(tm, local.names)}`);
    // TODO: avoid quote here
    const pi = evaluate(Pi(tm.plicity, tm.name, tm.type, quote(rt, local.indexErased + 1, false)), local.vs);
    return pi;
  }
  if (tm.tag === 'Let') {
    const vty = synth(local, tm.val);
    const rt = synth(extend(local, tm.name, vty, false, evaluate(tm.val, local.vs), tm.plicity), tm.body);
    if (tm.plicity && erasedUsed(0, tm.body))
      return terr(`erased argument used in ${showSurface(tm, local.names)}`);
    return rt;
  }
  if (tm.tag === 'Pi') {
    check(local, tm.type, VType);
    check(extend(local, tm.name, evaluate(tm.type, local.vs), true, VVar(local.indexErased), false), tm.body, VType);
    return VType;
  }
  if (tm.tag === 'Ann') {
    check(local, tm.type, VType);
    const vt = evaluate(tm.type, local.vs);
    check(local, tm.term, vt);
    return vt;
  }
  if (tm.tag === 'Fix') {
    check(local, tm.type, VType);
    const vty = evaluate(tm.type, local.vs);
    const vfix = evaluate(tm, local.vs);
    // TODO: is this correct?
    check(
      extend(
        extend(local, tm.self, vfix, true, VVar(local.indexErased), false),
          tm.name, vty, false, vfix, false),
      tm.body, vty
    );
    return vty;
  }
  if (tm.tag === 'Roll' && tm.type) {
    check(local, tm.type, VType);
    const vt = evaluate(tm.type, local.vs);
    const vtf = force(vt);
    if (vtf.tag !== 'VFix')
      return terr(`fix type expected in ${showSurface(tm, local.names)}: ${showTermU(vt, local.names, local.index)}`);
    check(local, tm.term, vtf.body(evaluate(tm, local.vs), vt));
    return vt;
  }
  if (tm.tag === 'Unroll') {
    const ty = synth(local, tm.term);
    const vt = force(ty);
    if (vt.tag !== 'VFix') 
      return terr(`fix type expected in ${showSurface(tm, local.names)}: ${showTermU(vt, local.names, local.index)}`);
    return vt.body(evaluate(tm.term, local.vs), ty);
  }
  return terr(`cannot synth ${showSurface(tm, local.names)}`);
};

const synthapp = (local: Local, fntm: Term, ty_: Val, plicity: Plicity, arg: Term): Val => {
  const ty = force(ty_);
  log(() => `synthapp ${showTermU(ty, local.names, local.index)} ${plicity ? '-' : ''}@ ${showSurface(arg, local.names)} in ${showEnvT(local.ts, local.indexErased, false)} and ${showEnvV(local.vs, local.indexErased, false)}`);
  if (ty.tag === 'VFix') return synthapp(local, fntm, ty.body(evaluate(fntm, local.vs), ty), plicity, arg);
  if (ty.tag === 'VPi' && ty.plicity === plicity) {
    check(local, arg, ty.type);
    const vm = evaluate(arg, local.vs);
    return ty.body(vm);
  }
  return terr(`invalid type or plicity mismatch in synthapp in ${showTermU(ty, local.names, local.index)} ${plicity ? '-' : ''}@ ${showSurface(arg, local.names)}`);
};

export const typecheck = (tm: Term): Val => {
  const ty = synth(localEmpty, tm);
  return ty;
};

export const typecheckDefs = (ds: Def[], allowRedefinition: boolean = false): Name[] => {
  log(() => `typecheckDefs ${ds.map(x => x.name).join(' ')}`);
  const xs: Name[] = [];
  if (!allowRedefinition) {
    for (let i = 0; i < ds.length; i++) {
      const d = ds[i];
      if (d.tag === 'DDef'&& globalGet(d.name))
        return terr(`cannot redefine global ${d.name}`);
    }
  }
  for (let i = 0; i < ds.length; i++) {
    const d = ds[i];
    log(() => `typecheckDefs ${showDef(d)}`);
    if (d.tag === 'DDef') {
      const ty = typecheck(d.value);
      log(() => `set ${d.name} = ${showTerm(d.value)}`);
      globalSet(d.name, d.value, evaluate(d.value, Nil), ty);
      xs.push(d.name);
    }
  }
  return xs;
};
