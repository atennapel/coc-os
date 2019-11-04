import { List, filter, map, foldr, Nil, Cons, lookup } from '../list';
import { Name, Term, Meta, App, Var, showTerm, Pi, flattenApp } from './terms';
import { Val, EnvV, quote, force, fresh, VVar, evaluate, VType, VPi } from './vals';
import { unify } from './unification';
import { terr } from '../util';

export type EnvT = List<[Name, { bound: boolean, type: Val }]>;
export const Bound = (type: Val) => ({ bound: true, type });
export const Def = (type: Val) => ({ bound: false, type });

const freshMeta = (ts: EnvT): Term => {
  const spine = map(filter(ts, ([x, { bound }]) => bound), ([x, _]) => Var(x));
  return foldr((x, y) => App(y, false, x), Meta() as Term, spine);
};

const inst = (ts: EnvT, vs: EnvV, ty_: Val): Val => {
  const ty = force(ty_);
  if (ty.tag === 'VPi' && ty.impl) {
    const m = freshMeta(ts);
    const vm = evaluate(m, vs);
    return inst(ts, vs, ty.body(vm));
  }
  return ty;
};

const check = (ts: EnvT, vs: EnvV, tm: Term, ty_: Val): void => {
  const ty = force(ty_);
  console.log(`check ${showTerm(tm)} : ${showTerm(quote(ty, vs))}`);
  if (tm.tag === 'Abs' && !tm.type && ty.tag === 'VPi' && tm.impl === ty.impl) {
    const x = fresh(vs, ty.name);
    const vx = VVar(x);
    check(Cons([x, Bound(ty.type)], ts), Cons([x, vx], vs), tm.body, ty.body(vx));
    return;
  }
  if (ty.tag === 'VPi' && ty.impl && !(tm.tag === 'Abs' && tm.type && tm.impl)) {
    const x = fresh(vs, ty.name);
    const vx = VVar(x);
    check(Cons([x, Bound(ty.type)], ts), Cons([x, vx], vs), tm, ty.body(vx));
  }
  if (tm.tag === 'App') {
    const [fn, args] = flattenApp(tm);
    const ty = synth(ts, vs, fn);
    const [rt, targs] = collect(ts, vs, ty, args);
    const rtinst = inst(ts, vs, rt);
    unify(vs, rtinst, ty);
    handleArgs(ts, vs, targs);
    return;
  }
  if (tm.tag === 'Hole') {
    return;
  }
  if (tm.tag === 'Let') {
    if (tm.type) {
      check(ts, vs, tm.type, VType);
      const vt = evaluate(tm.type, vs);
      check(ts, vs, tm.val, vt);
      const vv = evaluate(tm.val, vs);
      check(Cons([tm.name, Def(vt)], ts), Cons([tm.name, vv], vs), tm.body, ty);
      return;
    } else {
      const vt = synth(ts, vs, tm.val);
      const vv = evaluate(tm.val, vs);
      check(Cons([tm.name, Def(vt)], ts), Cons([tm.name, vv], vs), tm.body, ty);
      return;
    }
  }
  const ty2 = synth(ts, vs, tm);
  const ty2inst = inst(ts, vs, ty2);
  unify(vs, ty2inst, ty);
};

const freshPi = (ts: EnvT, vs: EnvV, x: Name, impl: boolean): Val => {
  const a = freshMeta(ts);
  const va = evaluate(a, vs);
  const b = freshMeta(Cons([x, Bound(va)], ts));
  return VPi(x, va, impl, v => evaluate(b, Cons([x, v], vs)));
};

const synth = (ts: EnvT, vs: EnvV, tm: Term): Val => {
  console.log(`synth ${showTerm(tm)}`);
  if (tm.tag === 'Type') return VType;
  if (tm.tag === 'Var') {
    const ty = lookup(ts, tm.name);
    if (!ty) return terr(`undefined var ${tm.name}`);
    return ty.type;
  }
  if (tm.tag === 'Ann') {
    check(ts, vs, tm.type, VType);
    const vt = evaluate(tm.type, vs);
    check(ts, vs, tm.term, vt);
    return vt;
  }
  if (tm.tag === 'App') {
    const [fn, args] = flattenApp(tm);
    const ty = synth(ts, vs, fn);
    const [rt, targs] = collect(ts, vs, ty, args);
    handleArgs(ts, vs, targs);
    return rt;
  }
  if (tm.tag === 'Abs') {
    if (tm.type) {
      check(ts, vs, tm.type, VType);
      const vt = evaluate(tm.type, vs);
      const rt = synth(Cons([tm.name, Bound(vt)], ts), Cons([tm.name, true], vs), tm.body);
      return evaluate(Pi(tm.name, tm.type, tm.impl, quote(rt, Cons([tm.name, true], vs))), vs);
    } else {
      const pi = freshPi(ts, vs, tm.name, tm.impl);
      check(ts, vs, tm, pi);
      return pi;
    }
  }
  if (tm.tag === 'Hole') {
    const vt = evaluate(freshMeta(ts), vs);
    return vt;
  }
  if (tm.tag === 'Let') {
    if (tm.type) {
      check(ts, vs, tm.type, VType);
      const vt = evaluate(tm.type, vs);
      check(ts, vs, tm.val, vt);
      const vv = evaluate(tm.val, vs);
      return synth(Cons([tm.name, Def(vt)], ts), Cons([tm.name, vv], vs), tm.body);
    } else {
      const vt = synth(ts, vs, tm.val);
      const vv = evaluate(tm.val, vs);
      return synth(Cons([tm.name, Def(vt)], ts), Cons([tm.name, vv], vs), tm.body);
    }
  }
  if (tm.tag === 'Pi') {
    check(ts, vs, tm.type, VType);
    const vt = evaluate(tm.type, vs);
    check(Cons([tm.name, Bound(vt)], ts), Cons([tm.name, true], vs), tm.body, VType);
    return VType;
  }
  return terr(`cannot synth ${showTerm(tm)}`);
};

const collect = (ts: EnvT, vs: EnvV, ty_: Val, args: [boolean, Term][]): [Val, List<[[boolean, Term], Val]>] => {
  // TODO
  const ty = force(ty_);
  if (args.length === 0) return [ty, Nil];
  if (ty.tag === 'VPi' && ty.impl) {

  }
  if (ty.tag === 'VPi' && !ty.impl) {

  }
  if (ty.tag === 'VNe' && ty.head.tag === 'Meta') {

  }
  return terr(`cannot collect ${showTerm(quote(ty, vs))} @ ${args.map(([i, t]) => i ? `{${showTerm(t)}}` : showTerm(t)).join(' ')}`);
};

const handleArgs = (ts: EnvT, vs: EnvV, args: List<[[boolean, Term], Val]>): void => {
  // TODO
};

export const typecheck = (tm: Term, ts: EnvT = Nil, vs: EnvV = Nil): Term => {
  const ty = synth(ts, vs, tm);
  return quote(ty, vs);
};
