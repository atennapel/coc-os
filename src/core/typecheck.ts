import { EnvV, Val, quote, evaluate, VType, extendV, VVar, showTermU, force, showEnvV, VPi, VNe, HMeta } from './domain';
import { Term, showFromSurface, Pi, App, Var, showTerm, shift } from './syntax';
import { terr } from '../util';
import { Ix, Name } from '../names';
import { index, Nil, List, Cons, toString, filter, mapIndex, foldr } from '../list';
import { globalGet, globalSet } from './globalenv';
import { eqPlicity, PlicityR, Plicity } from '../syntax';
import { unify } from './unify';
import { Def, showDef } from './definitions';
import { log } from '../config';
import { freshMeta, freshMetaId, metaPop, metaPush, metaDiscard } from './metas';

type EnvT = List<[boolean, Val]>;
const extendT = (ts: EnvT, val: Val, bound: boolean): EnvT => Cons([bound, val], ts);
const showEnvT = (ts: EnvT, k: Ix = 0, full: boolean = false): string =>
  toString(ts, ([b, v]) => `${b ? '' : 'def '}${showTerm(quote(v, k, full))}`);

const erasedUsed = (k: Ix, t: Term): boolean => {
  if (t.tag === 'Var') return t.index === k;
  if (t.tag === 'Global') return false;
  if (t.tag === 'App') return erasedUsed(k, t.left) || (!t.plicity.erased && erasedUsed(k, t.right));
  if (t.tag === 'Abs') return erasedUsed(k + 1, t.body);
  if (t.tag === 'Let') return erasedUsed(k + 1, t.body) || (!t.plicity.erased && erasedUsed(k, t.val));
  if (t.tag === 'Ann') return erasedUsed(k, t.term);
  if (t.tag === 'Pi') return false;
  if (t.tag === 'Inter') return false;
  if (t.tag === 'Type') return false;
  if (t.tag === 'Hole') return false;
  if (t.tag === 'Meta') return false;
  return t;
};

const newMeta = (ts: EnvT): Term => {
  const spine = filter(mapIndex(ts, (i, [bound, _]) => bound ? Var(i) : null), x => x !== null) as List<Var>;
  return foldr((x, y) => App(y, PlicityR, x), freshMeta() as Term, spine);
};

const inst = (ts: EnvT, vs: EnvV, ty_: Val): [Val, List<Term>] => {
  const ty = force(ty_);
  if (ty.tag === 'VPi' && ty.plicity.erased) {
    const m = newMeta(ts);
    const vm = evaluate(m, vs);
    const [res, args] = inst(ts, vs, ty.body(vm));
    return [res, Cons(m, args)];
  }
  return [ty, Nil];
};

const check = (ns: List<Name>, ts: EnvT, vs: EnvV, k: Ix, tm: Term, ty: Val): void => {
  log(() => `check ${showFromSurface(tm, ns)} : ${showTermU(ty, ns, k)} in ${showEnvT(ts, k, false)} and ${showEnvV(vs, k, false)}`);
  if (ty.tag === 'VType' && tm.tag === 'Type') return;
  if (tm.tag === 'Var' || tm.tag === 'Global' || tm.tag === 'App') {
    try {
      metaPush();
      holesPush();
      const ty2 = synth(ns, ts, vs, k, tm);
      unify(ns, k, ty2, ty);
      metaDiscard();
      holesDiscard();
      return;
    } catch (err) {
      if (!(err instanceof TypeError)) throw err;
      metaPop();
      holesPop();
    }
  }
  const tyf = force(ty);
  log(() => `check after ${showTermU(tyf, ns, k)}`);
  if (tm.tag === 'Abs' && !tm.type && tyf.tag === 'VPi' && eqPlicity(tm.plicity, tyf.plicity)) {
    const v = VVar(k);
    check(Cons(tm.name, ns), extendT(ts, tyf.type, true), extendV(vs, v), k + 1, tm.body, tyf.body(v));
    if (tm.plicity.erased && erasedUsed(0, tm.body))
      return terr(`erased argument used in ${showFromSurface(tm, ns)}`);
    return;
  }
  if (tyf.tag === 'VPi' && tyf.plicity.erased && !(tm.tag === 'Abs' && tm.type && tm.plicity.erased)) {
    const v = VVar(k);
    check(Cons(tyf.name, ns), extendT(ts, tyf.type, true), extendV(vs, v), k + 1, shift(1, 0, tm), tyf.body(v));
    return;
  }
  if (tm.tag === 'Let') {
    const vty = synth(ns, ts, vs, k, tm.val);
    check(Cons(tm.name, ns), extendT(ts, vty, false), extendV(vs, evaluate(tm.val, vs)), k + 1, tm.body, ty);
    if (tm.plicity.erased && erasedUsed(0, tm.body))
      return terr(`erased argument used in ${showFromSurface(tm, ns)}`);
    return;
  }
  if (tm.tag === 'Hole') {
    const x = newMeta(ts);
    if (tm.name) {
      if (holes[tm.name]) return terr(`named hole used more than once: _${tm.name}`);
      holes[tm.name] = [evaluate(x, vs), ty, ns, k, vs, ts];
    }
    return;
  }
  const ty2 = synth(ns, ts, vs, k, tm);
  const [ty2inst] = inst(ts, vs, ty2);
  try {
    unify(ns, k, ty2inst, ty);
  } catch(err) {
    if (!(err instanceof TypeError)) throw err;
    return terr(`failed to unify ${showTermU(ty2, ns, k)} ~ ${showTermU(ty, ns, k)}: ${err.message}`);
  }
  return;
};

const freshPi = (ts: EnvT, vs: EnvV, x: Name, impl: Plicity): Val => {
  const a = newMeta(ts);
  const va = evaluate(a, vs);
  const b = newMeta(Cons([true, va], ts));
  return VPi(impl, x, va, v => evaluate(b, extendV(vs, v)));
};

const synth = (ns: List<Name>, ts: EnvT, vs: EnvV, k: Ix, tm: Term): Val => {
  log(() => `synth ${showFromSurface(tm, ns)} in ${showEnvT(ts, k, false)} and ${showEnvV(vs, k, false)}`);
  if (tm.tag === 'Type') return VType;
  if (tm.tag === 'Var') {
    const res = index(ts, tm.index);
    if (!res) return terr(`var out of scope ${showFromSurface(tm, ns)}`);
    return res[1];
  }
  if (tm.tag === 'Global') {
    const entry = globalGet(tm.name);
    if (!entry) return terr(`global ${tm.name} not found`);
    return entry.type;
  }
  if (tm.tag === 'Hole') {
    const t = newMeta(ts);
    const vt = evaluate(newMeta(ts), vs);
    if (tm.name) {
      if (holes[tm.name]) return terr(`named hole used more than once: _${tm.name}`);
      holes[tm.name] = [evaluate(t, vs), vt, ns, k, vs, ts];
    }
    return vt;
  }
  if (tm.tag === 'App') {
    const fn = synth(ns, ts, vs, k, tm.left);
    const [rt] = synthapp(ns, ts, vs, k, fn, tm.plicity, tm.right);
    return rt;
  }
  if (tm.tag === 'Abs') {
    if (tm.type) {
      check(ns, ts, vs, k, tm.type, VType);
      const vtype = evaluate(tm.type, vs);
      const rt = synth(Cons(tm.name, ns), extendT(ts, vtype, true), extendV(vs, VVar(k)), k + 1, tm.body);
      if (tm.plicity.erased && erasedUsed(0, tm.body))
        return terr(`erased argument used in ${showFromSurface(tm, ns)}`);
      // TODO: avoid quote here
      const pi = evaluate(Pi(tm.plicity, tm.name, tm.type, quote(rt, k + 1, false)), vs);
      return pi;
    } else {
      const pi = freshPi(ts, vs, tm.name, tm.plicity);
      check(ns, ts, vs, k, tm, pi);
      return pi;
    }
  }
  if (tm.tag === 'Let') {
    const vty = synth(ns, ts, vs, k, tm.val);
    const rt = synth(Cons(tm.name, ns), extendT(ts, vty, false), extendV(vs, evaluate(tm.val, vs)), k + 1, tm.body);
    if (tm.plicity.erased && erasedUsed(0, tm.body))
      return terr(`erased argument used in ${showFromSurface(tm, ns)}`);
    return rt;
  }
  if (tm.tag === 'Pi') {
    check(ns, ts, vs, k, tm.type, VType);
    check(Cons(tm.name, ns), extendT(ts, evaluate(tm.type, vs), true), extendV(vs, VVar(k)), k + 1, tm.body, VType);
    return VType;
  }
  if (tm.tag === 'Inter') {
    check(ns, ts, vs, k, tm.type, VType);
    check(Cons(tm.name, ns), extendT(ts, evaluate(tm.type, vs), true), extendV(vs, VVar(k)), k + 1, tm.body, VType);
    return VType;
  }
  if (tm.tag === 'Ann') {
    check(ns, ts, vs, k, tm.type, VType);
    const vt = evaluate(tm.type, vs);
    check(ns, ts, vs, k, tm.term, vt);
    return vt;
  }
  return terr(`cannot synth ${showFromSurface(tm, ns)}`);
};

const synthapp = (ns: List<Name>, ts: EnvT, vs: EnvV, k: Ix, ty_: Val, plicity: Plicity, arg: Term): [Val, List<Term>] => {
  log(() => `synthapp before ${showTermU(ty_, ns, k)}`);
  const ty = force(ty_);
  log(() => `synthapp ${showTermU(ty, ns, k)} ${plicity.erased ? '-' : ''}@ ${showFromSurface(arg, ns)} in ${showEnvT(ts, k, false)} and ${showEnvV(vs)}`);
  if (ty.tag === 'VPi' && ty.plicity.erased && !plicity.erased) {
    // {a} -> b @ c (instantiate with meta then b @ c)
    const m = newMeta(ts);
    const vm = evaluate(m, vs);
    const [rt, l] = synthapp(ns, ts, vs, k, ty.body(vm), plicity, arg);
    return [rt, Cons(m, l)];
  }
  if (ty.tag === 'VPi' && eqPlicity(ty.plicity, plicity)) {
    check(ns, ts, vs, k, arg, ty.type);
    const vm = evaluate(arg, vs);
    return [ty.body(vm), Nil];
  }
  // TODO fix the following
  if (ty.tag === 'VNe' && ty.head.tag === 'HMeta') {
    const a = freshMetaId();
    const b = freshMetaId();
    const pi = VPi(plicity, '_', VNe(HMeta(a), ty.args), () => VNe(HMeta(b), ty.args));
    unify(ns, k, ty, pi);
    return synthapp(ns, ts, vs, k, pi, plicity, arg);
  }
  return terr(`invalid type or plicity mismatch in synthapp in ${showTermU(ty, ns, k)} ${plicity.erased ? '-' : ''}@ ${showFromSurface(arg, ns)}`);
};

type HoleInfo = [Val, Val, List<Name>, number, EnvV, EnvT];
let holesStack: { [key:string]: HoleInfo }[] = [];
let holes: { [key:string]: HoleInfo } = {};
const holesPush = (): void => {
  const old = holes;
  holesStack.push(holes);
  holes = {};
  for (let k in old) holes[k] = old[k];
};
const holesPop = (): void => {
  const x = holesStack.pop();
  if (!x) return;
  holes = x;
};
const holesDiscard = (): void => { holesStack.pop() };

export const typecheck = (tm: Term): Val => {
  // metaReset(); // TODO: fix this
  holes = {};
  const ty = synth(Nil, Nil, Nil, 0, tm);
  /*
  const ztm = zonk(etm);
  const holeprops = Object.entries(holes);
  if (holeprops.length > 0) {
    const strtype = showTermUZ(ty);
    const strterm = showFromSurfaceZ(ztm);
    const str = holeprops.map(([x, [t, v, ns, k, vs, ts]]) => {
      const all = zipWith(([x, v], [def, ty]) => [x, v, def, ty] as [Name, Val, boolean, Val], zipWith((x, v) => [x, v] as [Name, Val], ns, vs), ts);
      const allstr = toArray(all, ([x, v, b, t]) => `${x} : ${showTermUZ(t, ns, vs, k)}${b ? '' : ` = ${showTermUZ(v, ns, vs, k)}`}`).join('\n');
      return `\n_${x} : ${showTermUZ(v, ns, vs, k)} = ${showTermUZ(t, ns, vs, k)}\nlocal:\n${allstr}\n`;
    }).join('\n');
    return terr(`unsolved holes\ntype: ${strtype}\nterm: ${strterm}\n${str}`);
  }
  // TODO: should type be checked?
  if (isUnsolved(ztm))
    return terr(`elaborated term was unsolved: ${showFromSurfaceZ(ztm)}`);
  */
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
      globalSet(d.name, d.value, evaluate(d.value), ty);
      xs.push(d.name);
    }
  }
  return xs;
};
