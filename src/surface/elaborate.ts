import { List, toString, map, filter, foldr, Cons, lookup, Nil } from '../list';
import { Name, freshName } from '../names';
import { Val, EnvV, quote, force, VType, evaluate, VPi, showEnvV, zonk, VVar, VNe, HMeta } from './vals';
import { showTerm, Term, Var, App, Type, Let, Pi, Abs } from './syntax';
import { freshMeta, resetMetas, freshMetaId } from './metas';
import { log } from '../config';
import { Just, Nothing } from '../maybe';
import { terr } from '../util';
import { unify } from './unify';
import { getEnv } from './env';

export type EnvT = List<[Name, { bound: boolean, type: Val }]>;
export const Bound = (type: Val) => ({ bound: true, type });
export const Def = (type: Val) => ({ bound: false, type });
export const showEnvT = (l: EnvT, vs: EnvV): string =>
  toString(l, ([x, b]) => `${x} :${b.bound ? '' : '='} ${showTerm(quote(b.type, vs))}`);

const newMeta = (ts: EnvT): Term => {
  const spine = map(filter(ts, ([x, { bound }]) => bound && x !== '_'), ([x, _]) => Var(x));
  return foldr((x, y) => App(y, x), freshMeta() as Term, spine);
};

const check = (ts: EnvT, vs: EnvV, tm: Term, ty_: Val): Term => {
  const ty = force(ty_);
  log(() => `check ${showTerm(tm)} : ${showTerm(quote(ty, vs))} in ${showEnvT(ts, vs)} and ${showEnvV(vs)}`);
  if (ty.tag === 'VType' && tm.tag === 'Type') return Type;
  if (tm.tag === 'Abs' && !tm.type && ty.tag === 'VPi') {
    const x = freshName(vs, ty.name);
    const vx = VVar(x);
    const body = check(Cons([tm.name, Bound(ty.type)], ts), Cons([tm.name, Just(vx)], vs), tm.body, ty.body(vx));
    return Abs(tm.name, quote(ty.type, vs), body);
  }
  if (tm.tag === 'Hole')
    return newMeta(ts);
  if (tm.tag === 'Let') {
    const [vt, val] = synth(ts, vs, tm.val);
    const vv = evaluate(val, vs);
    const body = check(Cons([tm.name, Def(vt)], ts), Cons([tm.name, Just(vv)], vs), tm.body, ty);
    return Let(tm.name, val, body);
  }
  const [ty2, term] = synth(ts, vs, tm);
  unify(vs, ty2, ty);
  return term;
};

const freshPi = (ts: EnvT, vs: EnvV, x: Name): Val => {
  const a = newMeta(ts);
  const va = evaluate(a, vs);
  const b = newMeta(Cons([x, Bound(va)], ts));
  return VPi(x, va, v => evaluate(b, Cons([x, Just(v)], vs)));
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
      return [r[1], tm];
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
   const [rt, res] = synthapp(ts, vs, fn, tm.right);
   return [rt, App(fntm, res)];
  }
  if (tm.tag === 'Abs') {
    if (tm.type) {
      const type = check(ts, vs, tm.type, VType);
      const vt = evaluate(type, vs);
      const [rt, body] = synth(Cons([tm.name, Bound(vt)], ts), Cons([tm.name, Nothing], vs), tm.body);
      return [
        evaluate(Pi(tm.name, tm.type, quote(rt, Cons([tm.name, Nothing], vs))), vs),
        Abs(tm.name, type, body),
      ];
    } else {
      const pi = freshPi(ts, vs, tm.name);
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
    const [vt, val] = synth(ts, vs, tm.val);
    const vv = evaluate(val, vs);
    const [tr, body] = synth(Cons([tm.name, Def(vt)], ts), Cons([tm.name, Just(vv)], vs), tm.body);
    return [tr, Let(tm.name, val, body)];
  }
  if (tm.tag === 'Pi') {
    const type = check(ts, vs, tm.type, VType);
    const vt = evaluate(type, vs);
    const body = check(Cons([tm.name, Bound(vt)], ts), Cons([tm.name, Nothing], vs), tm.body, VType);
    return [VType, Pi(tm.name, type, body)];
  }
  return terr(`cannot synth ${showTerm(tm)}`);
};

const synthapp = (ts: EnvT, vs: EnvV, ty_: Val, arg: Term): [Val, Term] => {
  const ty = force(ty_);
  log(() => `synthapp ${showTerm(quote(ty, vs))} @ ${showTerm(arg)} in ${showEnvT(ts, vs)} and ${showEnvV(vs)}`);
  if (ty.tag === 'VPi') {
    const tm = check(ts, vs, arg, ty.type);
    const vm = evaluate(tm, vs);
    return [ty.body(vm), tm];
  }
  if (ty.tag === 'VNe' && ty.head.tag === 'HMeta') {
    const a = freshMetaId();
    const b = freshMetaId();
    const pi = VPi('_', VNe(HMeta(a), ty.args), () => VNe(HMeta(b), ty.args));
    unify(vs, ty, pi);
    return synthapp(ts, vs, pi, arg);
  }
  return terr(`unable to syntapp: ${showTerm(quote(ty, vs))} @ ${showTerm(arg)}`);
};

export const elaborate = (tm: Term, ts: EnvT = Nil, vs: EnvV = Nil): [Term, Term] => {
  resetMetas();
  const [ty, term] = synth(ts, vs, tm);
  const zty = zonk(vs, quote(ty, vs));
  log(() => showTerm(term));
  const zterm = zonk(vs, term);
  log(() => showTerm(zterm));
  return [zty, zterm];
};
