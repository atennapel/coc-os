import { List, toString, map, filter, foldr, Cons, lookup, Nil, foldl } from '../list';
import { Name } from '../names';
import { Val, EnvV, quote, force, VType, evaluate, VPi, showEnvV, zonk, VVar, VNe, HMeta, freshName, extendV, emptyEnvV, openV, normalize } from './vals';
import { showTerm, Term, Var, App, Type, Let, Pi, Abs, isUnsolved, Open, Fix, Unroll, Roll, Rec, Iota, Both, erase, eraseEq, Fst, Snd, UnsafeCast } from './syntax';
import { freshMeta, resetMetas, freshMetaId } from './metas';
import { log } from '../config';
import { Just, Nothing } from '../maybe';
import { terr } from '../util';
import { unify } from './unify';
import { getEnv, setEnv } from './env';
import { Def } from './definitions';

export type EnvT = List<[Name, { bound: boolean, type: Val }]>;
export const BoundT = (type: Val) => ({ bound: true, type });
export const DefT = (type: Val) => ({ bound: false, type });
export const showEnvT = (l: EnvT, vs: EnvV): string =>
  toString(l, ([x, b]) => `${x} :${b.bound ? '' : '='} ${showTerm(quote(b.type, vs))}`);

const newMeta = (ts: EnvT): Term => {
  const spine = map(filter(ts, ([x, { bound }]) => bound && x !== '_'), ([x, _]) => Var(x));
  return foldr((x, y) => App(y, false, x), freshMeta() as Term, spine);
};

const isImplicitUsed = (x: Name, t: Term): boolean => {
  if (t.tag === 'Var') return t.name === x;
  if (t.tag === 'App') {
    if (isImplicitUsed(x, t.left)) return true;
    return t.impl ? false : isImplicitUsed(x, t.right);
  }
  if (t.tag === 'Abs')
    return t.name !== x && isImplicitUsed(x, t.body);
  if (t.tag === 'Let')
    return (!t.impl && isImplicitUsed(x, t.val)) || (t.name !== x && isImplicitUsed(x, t.body));
  if (t.tag === 'Ann') return isImplicitUsed(x, t.term);
  if (t.tag === 'Open') return isImplicitUsed(x, t.body);
  if (t.tag === 'Hole') return false;
  if (t.tag === 'Meta') return false;
  if (t.tag === 'Type') return false;
  if (t.tag === 'Pi') return false;
  if (t.tag === 'Fix') return false;
  if (t.tag === 'Iota') return false;
  if (t.tag === 'Roll') return isImplicitUsed(x, t.body);
  if (t.tag === 'Unroll') return isImplicitUsed(x, t.body);
  if (t.tag === 'Rec')
    return t.name !== x && isImplicitUsed(x, t.body);
  if (t.tag === 'Both')
    return isImplicitUsed(x, t.left) || isImplicitUsed(x, t.right);
  if (t.tag === 'Fst') return isImplicitUsed(x, t.term);
  if (t.tag === 'Snd') return isImplicitUsed(x, t.term);
  if (t.tag === 'Rigid') return isImplicitUsed(x, t.term);
  if (t.tag === 'UnsafeCast') return isImplicitUsed(x, t.type) || isImplicitUsed(x, t.term);
  return t;
};

const checkOpenNames = (ns: Name[]): void => {
  ns.forEach(x => {
    const r = getEnv(x);
    if (!r || !r.opaque) terr(`not a opaque name in open: ${x}`);
  });
};

const inst = (ts: EnvT, vs: EnvV, ty_: Val): [Val, List<Term>] => {
  const ty = force(vs, ty_);
  if (ty.tag === 'VPi' && ty.impl) {
    const m = newMeta(ts);
    const vm = evaluate(m, vs);
    const [res, args] = inst(ts, vs, ty.body(vm));
    return [res, Cons(m, args)];
  }
  return [ty, Nil];
};

const check = (ts: EnvT, vs: EnvV, tm: Term, ty_: Val): Term => {
  const ty = force(vs, ty_);
  log(() => `check ${showTerm(tm)} : ${showTerm(quote(ty, vs))} in ${showEnvT(ts, vs)} and ${showEnvV(vs)}`);
  if (tm.tag === 'Rigid') {
    const [ty2, term] = synth(ts, vs, tm.term);
    unify(vs, ty2, ty);
    return term;
  }
  if (ty.tag === 'VType' && tm.tag === 'Type') return Type;
  if (tm.tag === 'Abs' && !tm.type && ty.tag === 'VPi' && tm.impl === ty.impl) {
    if (tm.impl && isImplicitUsed(tm.name, tm.body))
      return terr(`implicit used in ${showTerm(tm)}`);
    const x = freshName(vs, ty.name);
    const vx = VVar(x);
    const body = check(Cons([tm.name, BoundT(ty.type)], ts), extendV(vs, tm.name, Just(vx)), tm.body, ty.body(vx));
    return Abs(tm.name, tm.impl, quote(ty.type, vs), body);
  }
  if (ty.tag === 'VPi' && ty.impl && !(tm.tag === 'Abs' && tm.type && tm.impl)) {
    const x = freshName(vs, ty.name);
    const vx = VVar(x);
    const term = check(Cons([x, BoundT(ty.type)], ts), extendV(vs, x, Nothing), tm, ty.body(vx));
    return Abs(x, true, quote(ty.type, vs), term);
  }
  /*
  if (ty.tag === 'VFix' && tm.tag !== 'Roll') {
    const term = check(ts, vs, tm, ty.body(ty));
    return Roll(quote(ty, vs), term);
  }
  */
  if (ty.tag === 'VIota' && tm.tag === 'Both') {
    const left = check(ts, vs, tm.left, ty.type);
    const vv = evaluate(left, vs);
    const right = check(ts, vs, tm.right, ty.body(vv));
    const eleft = erase(normalize(left, vs));
    const eright = erase(normalize(right, vs));
    if (!eraseEq(eleft, eright))
      return terr(`erased terms not equal in ${showTerm(tm)}: ${showTerm(eleft)} ~ ${showTerm(eright)}`);
    return Both(left, right);
  }
  if (tm.tag === 'Hole')
    return newMeta(ts);
  if (tm.tag === 'Open') {
    checkOpenNames(tm.names);
    return Open(tm.names, check(ts, openV(vs, tm.names), tm.body, ty));
  }
  if (tm.tag === 'Let') {
    if (tm.impl && isImplicitUsed(tm.name, tm.body))
      return terr(`implicit used in ${showTerm(tm)}`);
    const [vt, val] = synth(ts, vs, tm.val);
    const vv = evaluate(val, vs);
    const body = check(Cons([tm.name, DefT(vt)], ts), extendV(vs, tm.name, Just(vv)), tm.body, ty);
    return Let(tm.name, tm.impl, val, body);
  }
  const [ty2, term] = synth(ts, vs, tm);
  const [ty2inst, targs] = inst(ts, vs, ty2);
  unify(vs, ty2inst, ty);
  return foldl((a, m) => App(a, true, m), term, targs);
};

const freshPi = (ts: EnvT, vs: EnvV, x: Name, impl: boolean): Val => {
  const a = newMeta(ts);
  const va = evaluate(a, vs);
  const b = newMeta(Cons([x, BoundT(va)], ts));
  return VPi(x, impl, va, v => evaluate(b, extendV(vs, x, Just(v))));
};
const freshPiType = (ts: EnvT, vs: EnvV, x: Name, impl: boolean, va: Val): Val => {
  const b = newMeta(Cons([x, BoundT(va)], ts));
  return VPi(x, impl, va, v => evaluate(b, extendV(vs, x, Just(v))));
};

const synth = (ts: EnvT, vs: EnvV, tm: Term): [Val, Term] => {
  log(() => `synth ${showTerm(tm)} in ${showEnvT(ts, vs)} and ${showEnvV(vs)}`);
  if (tm.tag === 'Type') return [VType, tm];
  if (tm.tag === 'Var') {
    if (tm.name === '_') return terr(`invalid name _`);
    const ty = lookup(ts, tm.name);
    if (!ty) {
      const r = getEnv(tm.name);
      if (!r) return terr(`undefined var ${tm.name}`);
      return [r.type, tm];
    }
    return [ty.type, tm];
  }
  if (tm.tag === 'Ann') {
    const type = check(ts, vs, tm.type, VType);
    const vt = evaluate(type, vs);
    const term = check(ts, vs, tm.term, vt);
    return [vt, term];
  }
  if (tm.tag === 'App') {
    const [fn, fntm] = synth(ts, vs, tm.left);
    const [rt, res, ms] = synthapp(ts, vs, fn, tm.impl, tm.right);
    return [rt, App(foldl((f, a) => App(f, true, a), fntm, ms), tm.impl, res)];
  }
  if (tm.tag === 'Abs') {
    if (tm.impl && isImplicitUsed(tm.name, tm.body))
      return terr(`implicit used in ${showTerm(tm)}`);
    if (tm.type) {
      const type = check(ts, vs, tm.type, VType);
      const vt = evaluate(type, vs);
      const pi = freshPiType(ts, vs, tm.name, tm.impl, vt);
      const term = check(ts, vs, Abs(tm.name, tm.impl, null, tm.body), pi);
      return [pi, term];
    } else {
      const pi = freshPi(ts, vs, tm.name, tm.impl);
      const term = check(ts, vs, tm, pi);
      return [pi, term];
    }
  }
  if (tm.tag === 'Hole') {
    const t = newMeta(ts);
    const vt = evaluate(newMeta(ts), vs);
    return [vt, t];
  }
  if (tm.tag === 'Let') {
    if (tm.impl && isImplicitUsed(tm.name, tm.body))
      return terr(`implicit used in ${showTerm(tm)}`);
    const [vt, val] = synth(ts, vs, tm.val);
    const vv = evaluate(val, vs);
    const [tr, body] = synth(Cons([tm.name, DefT(vt)], ts), extendV(vs, tm.name, Just(vv)), tm.body);
    return [tr, Let(tm.name, tm.impl, val, body)];
  }
  if (tm.tag === 'Pi') {
    const type = check(ts, vs, tm.type, VType);
    const vt = evaluate(type, vs);
    const body = check(Cons([tm.name, BoundT(vt)], ts), extendV(vs, tm.name, Nothing), tm.body, VType);
    return [VType, Pi(tm.name, tm.impl, type, body)];
  }
  if (tm.tag === 'Fix') {
    const type = check(ts, vs, tm.type, VType);
    const vt = evaluate(type, vs);
    const body = check(Cons([tm.self, BoundT(VVar(tm.name))], Cons([tm.name, BoundT(vt)], ts)), extendV(extendV(vs, tm.name, Nothing), tm.self, Nothing), tm.body, vt);
    return [vt, Fix(tm.self, tm.name, type, body)];
  }
  if (tm.tag === 'Rec') {
    const type = check(ts, vs, tm.type, VType);
    const vt = evaluate(type, vs);
    const body = check(Cons([tm.name, BoundT(vt)], ts), extendV(vs, tm.name, Nothing), tm.body, vt);
    return [vt, Rec(tm.name, type, body)];
  }
  if (tm.tag === 'Iota') {
    const type = check(ts, vs, tm.type, VType);
    const vt = evaluate(type, vs);
    const body = check(Cons([tm.name, BoundT(vt)], ts), extendV(vs, tm.name, Nothing), tm.body, VType);
    return [VType, Iota(tm.name, type, body)];
  }
  if (tm.tag === 'Open') {
    checkOpenNames(tm.names);
    const [ty, tme] = synth(ts, openV(vs, tm.names), tm.body);
    return [ty, Open(tm.names, tme)];
  }
  if (tm.tag === 'Unroll') {
    const [ty, tme] = synth(ts, vs, tm.body);
    const fty = force(vs, ty);
    if (fty.tag !== 'VFix') return terr(`cannot unroll ${showTerm(quote(fty, vs))} in ${showTerm(tm)}`);
    return [fty.body(fty.self === '_' ? VType : evaluate(tme, vs), fty), Unroll(tme)];
  }
  if (tm.tag === 'Roll') {
    const type = check(ts, vs, tm.type, VType);
    const vt = force(vs, evaluate(type, vs));
    if (vt.tag !== 'VFix') return terr(`cannot roll ${showTerm(quote(vt, vs))} in ${showTerm(tm)}`);
    const tme = check(ts, vs, tm.body, vt.body(vt.self === '_' ? VType : evaluate(tm.body, vs), vt));
    return [vt, Roll(type, tme)];
  }
  if (tm.tag === 'Fst') {
    const [ty, tme] = synth(ts, vs, tm.term);
    const fty = force(vs, ty);
    if (fty.tag !== 'VIota') return terr(`invalid ${showTerm(tm)}: ${showTerm(quote(fty, vs))}`);
    return [fty.type, Fst(tme)];
  }
  if (tm.tag === 'Snd') {
    const [ty, tme] = synth(ts, vs, tm.term);
    const fty = force(vs, ty);
    if (fty.tag !== 'VIota') return terr(`invalid ${showTerm(tm)}: ${showTerm(quote(fty, vs))}`);
    return [fty.body(evaluate(Fst(tme), vs)), Snd(tme)];
  }
  if (tm.tag === 'Rigid') return synth(ts, vs, tm.term);
  if (tm.tag === 'UnsafeCast') {
    const type = check(ts, vs, tm.type, VType);
    const res = synth(ts, vs, tm.term);
    return [evaluate(type, vs), UnsafeCast(type, res[1])];
  }
  return terr(`cannot synth ${showTerm(tm)}`);
};

const synthapp = (ts: EnvT, vs: EnvV, ty_: Val, impl: boolean, arg: Term): [Val, Term, List<Term>] => {
  const ty = force(vs, ty_);
  log(() => `synthapp ${showTerm(quote(ty, vs))} @ ${impl ? '{' : ''}${showTerm(arg)}${impl ? '}' : ''} in ${showEnvT(ts, vs)} and ${showEnvV(vs)}`);
  if (ty.tag === 'VPi' && ty.impl && !impl) {
    // {a} -> b @ c (instantiate with meta then b @ c)
    const m = newMeta(ts);
    const vm = evaluate(m, vs);
    const [rt, ft, l] = synthapp(ts, vs, ty.body(vm), impl, arg);
    return [rt, ft, Cons(m, l)];
  }
  if (ty.tag === 'VPi' && ty.impl === impl) {
    const tm = check(ts, vs, arg, ty.type);
    const vm = evaluate(tm, vs);
    return [ty.body(vm), tm, Nil];
  }
  // TODO fix
  if (ty.tag === 'VNe' && ty.head.tag === 'HMeta') {
    const a = freshMetaId();
    const b = freshMetaId();
    const pi = VPi('_', impl, VNe(HMeta(a), ty.args), () => VNe(HMeta(b), ty.args));
    unify(vs, ty, pi);
    return synthapp(ts, vs, pi, impl, arg);
  }
  return terr(`unable to syntapp: ${showTerm(quote(ty, vs))} @ ${impl ? '{' : ''}${showTerm(arg)}${impl ? '}' : ''}`);
};

export const elaborate = (tm: Term, ts: EnvT = Nil, vs: EnvV = emptyEnvV): [Term, Term] => {
  resetMetas();
  const [ty, term] = synth(ts, vs, tm);
  const zty = zonk(vs, quote(ty, vs));
  log(() => showTerm(term));
  const zterm = zonk(vs, term);
  log(() => showTerm(zterm));
  if (isUnsolved(zty) || isUnsolved(zterm))
    return terr(`unsolved type or term: ${showTerm(zterm)} : ${showTerm(zty)}`);
  return [zty, zterm];
};

export const elaborateDefs = (ds: Def[], ts: EnvT = Nil, vs: EnvV = emptyEnvV): Name[] => {
  const xs: Name[] = [];
  for (let i = 0; i < ds.length; i++) {
    const d = ds[i];
    if (d.tag === 'DDef') {
      const [ty, tm] = elaborate(d.value, ts, vs);
      setEnv(d.name, evaluate(tm, vs), evaluate(ty, vs), d.opaque);
      xs.push(d.name);
    }
  }
  return xs;
};
