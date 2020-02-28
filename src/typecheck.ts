import { Term, showSurface, showTerm, Pi, Var, App, Let, Unroll, Roll, Ann, Abs, Fix } from './syntax';
import { Ix, Name } from './names';
import { List, Cons, listToString, Nil, index, filter, mapIndex, foldr } from './utils/list';
import { Val, showTermQ, EnvV, extendV, showTermU, VVar, evaluate, quote, showEnvV, VType, force, VPi, VNe, HMeta } from './domain';
import { log } from './config';
import { terr } from './utils/util';
import { Def, showDef } from './definitions';
import { globalGet, globalSet } from './globalenv';
import { unify } from './unify';
import { Plicity } from './surface';
import { freshMeta, freshMetaId, metaUnsolved } from './metas';

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

const newMeta = (ts: EnvT): Term => {
  const spine = filter(mapIndex(ts, (i, [bound, _]) => bound ? Var(i) : null), x => x !== null) as List<Var>;
  return foldr((x, y) => App(y, false, x), freshMeta() as Term, spine);
};

const check = (local: Local, tm: Term, ty: Val): Term => {
  log(() => `check ${showSurface(tm, local.names)} : ${showTermU(ty, local.names, local.index)} in ${showEnvT(local.ts, local.indexErased, false)} and ${showEnvV(local.vs, local.indexErased, false)}`);
  if (ty.tag === 'VType' && tm.tag === 'Type') return tm;
  const tyf = force(ty);
  if (tm.tag === 'Hole' && tm.name) {
    if (tm.name)
      return terr(`found hole ${showTerm(tm)}, expected type ${showTermU(ty, local.names, local.index)}, forced: ${showTermU(tyf, local.names, local.index)}`);
    const x = newMeta(local.ts);
    return x;
  }
  if (tm.tag === 'Abs' && !tm.type && tyf.tag === 'VPi' && tm.plicity === tyf.plicity) {
    const v = VVar(local.index);
    const body = check(extend(local, tm.name, tyf.type, true, v, tyf.plicity), tm.body, tyf.body(v));
    if (tm.plicity && erasedUsed(0, tm.body))
      return terr(`erased argument used in ${showSurface(tm, local.names)}`);
    return Abs(tm.plicity, tm.name, null, body);
  }
  if (tm.tag === 'Abs' && !tm.type && tyf.tag === 'VPi' && !tm.plicity && tyf.plicity) {
    const v = VVar(local.index);
    const term = check(extend(local, tm.name, tyf.type, true, v, tyf.plicity), tm, tyf.body(v));
    return term;
  }
  if (tm.tag === 'Let') {
    const [val, vty] = synth(local, tm.val);
    const body = check(extend(local, tm.name, vty, false, evaluate(val, local.vs), tm.plicity), tm.body, ty);
    if (tm.plicity && erasedUsed(0, tm.body))
      return terr(`erased argument used in ${showSurface(tm, local.names)}`);
    return Let(tm.plicity, tm.name, val, body);
  }
  if (tm.tag === 'Roll' && !tm.type && tyf.tag === 'VFix') {
    const term = check(local, tm.term, tyf.body(evaluate(tm, local.vs), ty));
    return Roll(null, term);
  }
  if (tyf.tag === 'VFix' && tm.tag === 'Abs') {
    const term = check(local, tm, tyf.body(evaluate(tm, local.vs), ty));
    return term;
  }
  const [term, ty2] = synth(local, tm);
  try {
    log(() => `unify ${showTermU(ty2, local.names, local.index)} ~ ${showTermU(ty, local.names, local.index)}`);
    unify(local.index, ty2, ty);
    return term;
  } catch(err) {
    if (!(err instanceof TypeError)) throw err;
    return terr(`failed to unify ${showTermU(ty2, local.names, local.index)} ~ ${showTermU(ty, local.names, local.index)}: ${err.message}`);
  }
};

const freshPi = (ts: EnvT, vs: EnvV, x: Name, impl: Plicity): Val => {
  const a = newMeta(ts);
  const va = evaluate(a, vs);
  const b = newMeta(Cons([true, va], ts));
  return VPi(impl, x, va, v => evaluate(b, extendV(vs, v)));
};

const synth = (local: Local, tm: Term): [Term, Val] => {
  log(() => `synth ${showSurface(tm, local.names)} in ${showEnvT(local.ts, local.indexErased, false)} and ${showEnvV(local.vs, local.indexErased, false)}`);
  if (tm.tag === 'Type') return [tm, VType];
  if (tm.tag === 'Var') {
    const res = index(local.ts, tm.index);
    if (!res) return terr(`var out of scope ${showSurface(tm, local.names)}`);
    return [tm, res[1]];
  }
  if (tm.tag === 'Global') {
    const entry = globalGet(tm.name);
    if (!entry) return terr(`global ${tm.name} not found`);
    return [tm, entry.type];
  }
  if (tm.tag === 'Hole' && !tm.name) {
    const t = newMeta(local.ts);
    const vt = evaluate(newMeta(local.ts), local.vs);
    return [t, vt];
  }
  if (tm.tag === 'App') {
    const [fntm, fn] = synth(local, tm.left);
    const [argtm, rt] = synthapp(local, fntm, fn, tm.plicity, tm.right);
    return [App(fntm, tm.plicity, argtm), rt];
  }
  if (tm.tag === 'Abs') {
    if (tm.type) {
      const type = check(local, tm.type, VType);
      const vtype = evaluate(type, local.vs);
      const [body, rt] = synth(extend(local, tm.name, vtype, true, VVar(local.indexErased), tm.plicity), tm.body);
      if (tm.plicity && erasedUsed(0, tm.body))
        return terr(`erased argument used in ${showSurface(tm, local.names)}`);
      // TODO: avoid quote here
      const pi = evaluate(Pi(tm.plicity, tm.name, tm.type, quote(rt, local.indexErased + 1, false)), local.vs);
      return [Abs(tm.plicity, tm.name, type, body), pi];
    } else {
      const pi = freshPi(local.ts, local.vs, tm.name, tm.plicity);
      const term = check(local, tm, pi);
      return [term, pi];
    }
  }
  if (tm.tag === 'Let') {
    const [valtm, vty] = synth(local, tm.val);
    const [bodytm, rt] = synth(extend(local, tm.name, vty, false, evaluate(valtm, local.vs), tm.plicity), tm.body);
    if (tm.plicity && erasedUsed(0, tm.body))
      return terr(`erased argument used in ${showSurface(tm, local.names)}`);
    return [Let(tm.plicity, tm.name, valtm, bodytm), rt];
  }
  if (tm.tag === 'Pi') {
    const type = check(local, tm.type, VType);
    const body = check(extend(local, tm.name, evaluate(type, local.vs), true, VVar(local.indexErased), false), tm.body, VType);
    return [Pi(tm.plicity, tm.name, type, body), VType];
  }
  if (tm.tag === 'Ann') {
    const type = check(local, tm.type, VType);
    const vt = evaluate(type, local.vs);
    const term = check(local, tm.term, vt);
    return [Ann(term, type), vt];
  }
  if (tm.tag === 'Fix') {
    const type = check(local, tm.type, VType);
    const vty = evaluate(type, local.vs);
    const vfix = evaluate(tm, local.vs);
    // TODO: is this correct?
    const body = check(
      extend(
        extend(local, tm.self, vfix, true, VVar(local.indexErased), false),
          tm.name, vty, false, vfix, false),
      tm.body, vty
    );
    return [Fix(tm.self, tm.name, type, body), vty];
  }
  if (tm.tag === 'Roll' && tm.type) {
    const type = check(local, tm.type, VType);
    const vt = evaluate(tm.type, local.vs);
    const vtf = force(vt);
    if (vtf.tag !== 'VFix')
      return terr(`fix type expected in ${showSurface(tm, local.names)}: ${showTermU(vt, local.names, local.index)}`);
    const term = check(local, tm.term, vtf.body(evaluate(tm, local.vs), vt));
    return [Roll(type, term), vt];
  }
  if (tm.tag === 'Unroll') {
    const [term, ty] = synth(local, tm.term);
    const vt = force(ty);
    if (vt.tag !== 'VFix') 
      return terr(`fix type expected in ${showSurface(tm, local.names)}: ${showTermU(vt, local.names, local.index)}`);
    return [Unroll(term), vt.body(evaluate(term, local.vs), ty)];
  }
  return terr(`cannot synth ${showSurface(tm, local.names)}`);
};

const synthapp = (local: Local, fntm: Term, ty_: Val, plicity: Plicity, arg: Term): [Term, Val] => {
  const ty = force(ty_);
  log(() => `synthapp ${showTermU(ty, local.names, local.index)} ${plicity ? '-' : ''}@ ${showSurface(arg, local.names)} in ${showEnvT(local.ts, local.indexErased, false)} and ${showEnvV(local.vs, local.indexErased, false)}`);
  if (ty.tag === 'VFix') return synthapp(local, fntm, ty.body(evaluate(fntm, local.vs), ty), plicity, arg);
  if (ty.tag === 'VPi' && ty.plicity === plicity) {
    const argtm = check(local, arg, ty.type);
    const vm = evaluate(argtm, local.vs);
    return [argtm, ty.body(vm)];
  }
  // TODO: fix the following
  if (ty.tag === 'VNe' && ty.head.tag === 'HMeta') {
    const a = freshMetaId();
    const b = freshMetaId();
    const pi = VPi(plicity, '_', VNe(HMeta(a), ty.args), () => VNe(HMeta(b), ty.args));
    unify(local.indexErased, ty, pi);
    return synthapp(local, fntm, pi, plicity, arg);
  }
  return terr(`invalid type or plicity mismatch in synthapp in ${showTermU(ty, local.names, local.index)} ${plicity ? '-' : ''}@ ${showSurface(arg, local.names)}`);
};

export const typecheck = (tm: Term): Val => {
  const res = synth(localEmpty, tm);
  if (metaUnsolved()) return terr(`there are unsolved metas`);
  return res[1];
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
