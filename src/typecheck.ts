import { Term, showSurface, showTerm, Pi, Var, App, Let, Abs } from './syntax';
import { Ix, Name } from './names';
import { List, Cons, listToString, Nil, index, filter, mapIndex, foldr, zipWith, toArray, foldl } from './utils/list';
import { Val, showTermQ, EnvV, extendV, showTermU, VVar, evaluate, quote, showEnvV, VType, force, VPi, VNe } from './domain';
import { log, config } from './config';
import { terr } from './utils/util';
import { globalGet, globalSet } from './globalenv';
import { unify } from './unify';
import { Plicity } from './surface';
import * as S from './surface';

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
  return false;
};

const check = (local: Local, tm: Term, ty: Val): Term => {
  log(() => `check ${showSurface(tm, local.names)} : ${showTermU(ty, local.names, local.index)}${!config.showEnvs ? '' : ` in ${showEnvT(local.ts, local.indexErased, false)} and ${showEnvV(local.vs, local.indexErased, false)}`}`);
  if (ty.tag === 'VType' && tm.tag === 'Type') return tm;
  const tyf = force(ty);
  if (tm.tag === 'Hole') {
    const x = newMeta(local.ts);
    if (tm.name) {
      if (holes[tm.name]) return terr(`named hole used more than once: _${tm.name}`);
      holes[tm.name] = [evaluate(x, local.vs), ty, local];
    }
    return x;
  }
  if (tm.tag === 'Abs' && !tm.type && tyf.tag === 'VPi' && tm.plicity === tyf.plicity) {
    const v = VVar(local.index);
    const body = check(extend(local, tm.name, tyf.type, true, v, tyf.plicity), tm.body, tyf.body(v));
    if (tm.plicity && erasedUsed(0, tm.body))
      return terr(`erased argument used in ${showSurface(tm, local.names)}`);
    return Abs(tm.plicity, tm.name, quote(tyf.type, local.index, false), body);
  }
  if (tm.tag === 'Abs' && !tm.type && tyf.tag === 'VPi' && !tm.plicity && tyf.plicity) {
    const v = VVar(local.index);
    const term = check(extend(local, tyf.name, tyf.type, true, v, true), shift(1, 0, tm), tyf.body(v));
    return Abs(tyf.plicity, tyf.name, quote(tyf.type, local.index, false), term);
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
    return Roll(quote(ty, local.index, false), term);
  }
  if (tyf.tag === 'VFix' && tm.tag === 'Abs') {
    const term = check(local, tm, tyf.body(evaluate(tm, local.vs), ty));
    return Roll(quote(ty, local.index, false), term);
  }
  if (tm.tag === 'Rigid') {
    const [term, ty2] = synth(local, tm);
    unify(local.index, ty2, ty);
    return term;
  }
  const [term, ty2] = synth(local, tm);
  try {
    log(() => `unify ${showTermU(ty2, local.names, local.index)} ~ ${showTermU(ty, local.names, local.index)}`);
    metaPush();
    holesPush();
    unify(local.index, ty2, ty);
    metaDiscard();
    holesDiscard();
    return term;
  } catch(err) {
    if (!(err instanceof TypeError)) throw err;
    try {
      metaPop();
      holesPop();
      metaPush();
      holesPush();
      const [ty2inst, ms] = inst(local.ts, local.vs, ty2);
      unify(local.index, ty2inst, ty);
      metaDiscard();
      holesDiscard();
      return foldl((a, m) => App(a, true, m), term, ms);
    } catch {
      if (!(err instanceof TypeError)) throw err;
      metaPop();
      holesPop();
      return terr(`failed to unify ${showTermU(ty2, local.names, local.index)} ~ ${showTermU(ty, local.names, local.index)}: ${err.message}`);
    }
  }
};

const freshPi = (ts: EnvT, vs: EnvV, x: Name, impl: Plicity): Val => {
  const a = newMeta(ts);
  const va = evaluate(a, vs);
  const b = newMeta(Cons([true, va], ts));
  return VPi(impl, x, va, v => evaluate(b, extendV(vs, v)));
};

const synth = (local: Local, tm: S.Term): [Term, Val] => {
  log(() => `synth ${S.showTerm(tm)}${!config.showEnvs ? '' : ` in ${showEnvT(local.ts, local.indexErased, false)} and ${showEnvV(local.vs, local.indexErased, false)}`}`);
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
    if (tm.name) {
      if (holes[tm.name]) return terr(`named hole used more than once: _${tm.name}`);
      holes[tm.name] = [evaluate(t, local.vs), vt, local];
    }
    return [t, vt];
  }
  if (tm.tag === 'App') {
    const [fntm, fn] = synth(local, tm.left);
    const [argtm, rt, ms] = synthapp(local, fntm, fn, tm.plicity, tm.right);
    return [App(foldl((f, a) => App(f, true, a), fntm, ms), tm.plicity, argtm), rt];
  }
  if (tm.tag === 'Abs') {
    if (tm.type) {
      const type = check(local, tm.type, VType);
      const vtype = evaluate(type, local.vs);
      const [body, rt] = synth(extend(local, tm.name, vtype, true, VVar(local.index), tm.plicity), tm.body);
      if (tm.plicity && erasedUsed(0, tm.body))
        return terr(`erased argument used in ${showSurface(tm, local.names)}`);
      // TODO: avoid quote here
      const pi = evaluate(Pi(tm.plicity, tm.name, type, quote(rt, local.index + 1, false)), local.vs);
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
    const body = check(extend(local, tm.name, evaluate(type, local.vs), true, VVar(local.index), false), tm.body, VType);
    return [Pi(tm.plicity, tm.name, type, body), VType];
  }
  if (tm.tag === 'Ann') {
    const type = check(local, tm.type, VType);
    const vt = evaluate(type, local.vs);
    const term = check(local, tm.term, vt);
    return [term, vt];
  }
  if (tm.tag === 'Fix') {
    const type = check(local, tm.type, VType);
    const vty = evaluate(type, local.vs);
    const vfix = evaluate(tm, local.vs);
    // TODO: is this correct?
    const body = check(
      extend(
        extend(local, tm.self, vfix, true, VVar(local.index), false),
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
  if (tm.tag === 'Rigid') return synth(local, tm.term);
  return terr(`cannot synth ${showSurface(tm, local.names)}`);
};

const synthapp = (local: Local, fntm: Term, ty_: Val, plicity: Plicity, arg: Term): [Term, Val, List<Term>] => {
  const ty = force(ty_);
  log(() => `synthapp ${showTermU(ty, local.names, local.index)} ${plicity ? '-' : ''}@ ${showSurface(arg, local.names)}${!config.showEnvs ? '' : ` in ${showEnvT(local.ts, local.indexErased, false)} and ${showEnvV(local.vs, local.indexErased, false)}`}`);
  if (ty.tag === 'VFix') return synthapp(local, fntm, ty.body(evaluate(fntm, local.vs), ty), plicity, arg);
  if (ty.tag === 'VPi' && ty.plicity === plicity) {
    const argtm = check(local, arg, ty.type);
    const vm = evaluate(argtm, local.vs);
    return [argtm, ty.body(vm), Nil];
  }
  if (ty.tag === 'VPi' && ty.plicity && !plicity) {
    // {a} -> b @ c (instantiate with meta then b @ c)
    const m = newMeta(local.ts);
    const vm = evaluate(m, local.vs);
    // TODO: fntm should probably be updated?
    const [argtm, rt, l] = synthapp(local, fntm, ty.body(vm), plicity, arg);
    return [argtm, rt, Cons(m, l)];
  }
  return terr(`invalid type or plicity mismatch in synthapp in ${showTermU(ty, local.names, local.index)} ${plicity ? '-' : ''}@ ${showSurface(arg, local.names)}`);
};

export const typecheck = (tm_: S.Term): [Term, Val] => {
  const [tm, ty] = synth(localEmpty, tm_);
  return [tm, ty];
};

export const typecheckDefs = (ds: S.Def[], allowRedefinition: boolean = false): Name[] => {
  log(() => `typecheckDefs ${ds.map(x => x.name).join(' ')}`);
  const xs: Name[] = [];
  if (!allowRedefinition) {
    for (let i = 0; i < ds.length; i++) {
      const d = ds[i];
      if (d.tag === 'DDef' && globalGet(d.name))
        return terr(`cannot redefine global ${d.name}`);
    }
  }
  for (let i = 0; i < ds.length; i++) {
    const d = ds[i];
    log(() => `typecheckDefs ${showDef(d)}`);
    if (d.tag === 'DDef') {
      const [tm, ty] = typecheck(d.value);
      log(() => `set ${d.name} = ${showTerm(tm)}`);
      const zty = zonk(quote(ty, 0, false));
      const ctm = toCore(tm);
      if (config.checkCore) {
        log(() => `typecheck in core: ${showTermC(ctm)}`);
        const cty = typecheckC(ctm);
        log(() => `core type: ${showTermC(quoteC(cty, 0, false))}`);
        globalSet(d.name, tm, evaluate(tm, Nil), ty, ctm, evaluateC(ctm, Nil), cty);
      } else {
        globalSet(d.name, tm, evaluate(tm, Nil), ty, ctm, evaluateC(ctm, Nil), evaluateC(toCore(zty), Nil));
      }
      xs.push(d.name);
    }
  }
  return xs;
};
