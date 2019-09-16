import { EnvT, EnvV, fresh, DefV, BoundT, lookupT, BoundV, DefT, showEnvT, HashEnv } from './env';
import { Term, showTerm, Abs, Type, Pi, App, Let, resetMetaId } from './terms';
import { Val, VVar } from './values';
import { terr } from '../util';
import { Nil, Cons } from '../list';
import { quote, evaluate, force } from './nbe';
import { unify, newMeta, zonk } from './unify';
import { log } from '../config';

export interface Env {
  readonly vals: EnvV;
  readonly types: EnvT;
};

const check = (henv: HashEnv, env: Env, tm: Term, ty_: Val): Term => {
  log(() => `check ${showTerm(tm)} : ${showTerm(quote(ty_, env.vals))} in ${showEnvT(env.types)}`);
  const ty = force(ty_);
  if (tm.tag === 'Abs' && !tm.type && ty.tag === 'VPi') {
    const x = fresh(env.vals, tm.name);
    const v = VVar(x);
    return Abs(x, check(henv, {
      vals: Cons(DefV(x, v), env.vals),
      types: Cons(BoundT(x, ty.type), env.types),
    }, tm.body, ty.body(v)), quote(ty.type, env.vals));
  }
  if (tm.tag === 'Let') {
    const [val, tty, vty] = synthLetValue(henv, env, tm.value, tm.type);
    const body = check(henv, {
      vals: Cons(DefV(tm.name, evaluate(val, henv, env.vals)), env.vals),
      types: Cons(DefT(tm.name, vty), env.types),
    }, tm.body, ty);
    return Let(tm.name, val, body, tty);
  }
  if (tm.tag === 'Hole') return newMeta(env.types);
  const [etm, ity] = synth(henv, env, tm);
  unify(env.vals, ity, ty);
  return etm;
};

const synth = (henv: HashEnv, env: Env, tm: Term): [Term, Val] => {
  log(() => `synth ${showTerm(tm)} in ${showEnvT(env.types)}`);
  if (tm.tag === 'Type') return [Type, Type];
  if (tm.tag === 'Var') {
    if (tm.name === '_') return terr(`_ is not a valid name`);
    const ty = lookupT(env.types, tm.name);
    if (!ty) return terr(`undefined var ${tm.name}`);
    return [tm, ty.type];
  }
  if (tm.tag === 'Pi') {
    const ty = check(henv, env, tm.type, Type);
    const vty = evaluate(ty, henv, env.vals);
    const term = check(henv, {
      vals: Cons(BoundV(tm.name), env.vals),
      types: Cons(BoundT(tm.name, vty), env.types),
    }, tm.body, Type);
    return [Pi(tm.name, ty, term), Type];
  }
  if (tm.tag === 'Ann') {
    const ty = check(henv, env, tm.type, Type);
    const vty = evaluate(ty, henv, env.vals);
    const term = check(henv, env, tm.term, vty);
    return [term, vty];
  }
  if (tm.tag === 'App') {
    const [l, ty] = synth(henv, env, tm.left);
    const [r, rty] = synthapp(henv, env, ty, tm.right);
    return [App(l, r), rty];
  }
  if (tm.tag === 'Abs' && tm.type) {
    const ty = check(henv, env, tm.type, Type);
    const vty = evaluate(ty, henv, env.vals);
    const venv = Cons(BoundV(tm.name), env.vals)
    const [body, rty] = synth(henv, {
      vals: venv,
      types: Cons(BoundT(tm.name, vty), env.types),
    }, tm.body);
    return [
      Abs(tm.name, body, ty),
      evaluate(Pi(tm.name, ty, quote(rty, venv)), henv, env.vals),
    ];
  }
  if (tm.tag === 'Abs' && !tm.type) {
    const ty = newMeta(env.types);
    const vty = evaluate(ty, henv, env.vals);
    const rty = newMeta(Cons(BoundT(tm.name, vty), env.types));
    const tpi = evaluate(Pi(tm.name, ty, rty), henv, env.vals);
    const term = check(henv, env, tm, tpi);
    return [term, tpi];
  }
  if (tm.tag === 'Let') {
    const [val, ty, vty] = synthLetValue(henv, env, tm.value, tm.type);
    const [body, rty] = synth(henv, {
      vals: Cons(DefV(tm.name, evaluate(val, henv, env.vals)), env.vals),
      types: Cons(DefT(tm.name, vty), env.types),
    }, tm.body);
    return [Let(tm.name, val, body, ty), rty];
  }
  if (tm.tag === 'Hash') {
    const r = henv[tm.hash];
    if (!r) return terr(`undefined hash ${showTerm(tm)}`);
    return [tm, r.type];
  }
  if (tm.tag === 'Hole')
    return [newMeta(env.types), evaluate(newMeta(env.types), henv, env.vals)];
  return terr(`cannot synth ${showTerm(tm)}`);
};

const synthLetValue = (henv: HashEnv, env: Env, val: Term, ty?: Term): [Term, Term, Val] => {
  if (ty) {
    const ety = check(henv, env, ty, Type);
    const vty = evaluate(ety, henv, env.vals);
    const ev = check(henv, env, val, vty);
    return [ev, ety, vty];
  } else {
    const [ev, vty] = synth(henv, env, val);
    return [ev, quote(vty, env.vals), vty];
  }
};

const synthapp = (henv: HashEnv, env: Env, ty_: Val, tm: Term): [Term, Val] => {
  log(() => `synthapp ${showTerm(quote(ty_, env.vals))} @ ${showTerm(tm)} in ${showEnvT(env.types)}`);
  const ty = force(ty_);
  if (ty.tag === 'VPi') {
    const arg = check(henv, env, tm, ty.type);
    const varg = evaluate(arg, henv, env.vals);
    return [arg, ty.body(varg)];
  }
  return terr(`expected a function type but got ${showTerm(quote(ty, env.vals))}`);
};

export const elaborate = (henv: HashEnv, tm: Term, env: Env = { vals: Nil, types: Nil }): [Term, Term] => {
  resetMetaId();
  const [etm, ty] = synth(henv, env, tm);
  return [
    zonk(etm, {}, env.vals),
    zonk(quote(force(ty), env.vals), {}, env.vals),
  ];
};
