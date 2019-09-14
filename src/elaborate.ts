import { EnvT, EnvV, fresh, DefV, BoundT, lookupT, BoundV, DefT, showEnvT } from './env';
import { Term, showTerm, Abs, Type, Pi, App, Let } from './terms';
import { Val, VVar } from './values';
import { terr } from './util';
import { Nil, Cons } from './list';
import { quote, evaluate } from './nbe';
import { unify } from './unify';
import { log } from './config';

export interface Env {
  readonly vals: EnvV;
  readonly types: EnvT;
};

const check = (env: Env, tm: Term, ty: Val): Term => {
  log(() => `check ${showTerm(tm)} : ${showTerm(quote(ty, env.vals))} in ${showEnvT(env.types)}`);
  if (tm.tag === 'Abs' && !tm.type && ty.tag === 'VPi') {
    const x = fresh(env.vals, tm.name);
    const v = VVar(x);
    return Abs(x, check({
      vals: Cons(DefV(x, v), env.vals),
      types: Cons(BoundT(x, ty.type), env.types),
    }, tm.body, ty.body(v)), quote(ty.type, env.vals));
  }
  if (tm.tag === 'Let') {
    const [val, tty, vty] = synthLetValue(env, tm.value, tm.type);
    const body = check({
      vals: Cons(DefV(tm.name, evaluate(val, env.vals)), env.vals),
      types: Cons(DefT(tm.name, vty), env.types),
    }, tm.body, ty);
    return Let(tm.name, val, body, tty);
  }
  const [etm, ity] = synth(env, tm);
  unify(env.vals, ity, ty);
  return etm;
};

const synth = (env: Env, tm: Term): [Term, Val] => {
  log(() => `synth ${showTerm(tm)} in ${showEnvT(env.types)}`);
  if (tm.tag === 'Type') return [Type, Type];
  if (tm.tag === 'Var') {
    if (tm.name === '_') return terr(`_ is not a valid name`);
    const ty = lookupT(env.types, tm.name);
    if (!ty) return terr(`undefined var ${tm.name}`);
    return [tm, ty.type];
  }
  if (tm.tag === 'Pi') {
    const ty = check(env, tm.type, Type);
    const vty = evaluate(ty, env.vals);
    const term = check({
      vals: Cons(BoundV(tm.name), env.vals),
      types: Cons(BoundT(tm.name, vty), env.types),
    }, tm.body, Type);
    return [Pi(tm.name, ty, term), Type];
  }
  if (tm.tag === 'Ann') {
    const ty = check(env, tm.type, Type);
    const vty = evaluate(ty, env.vals);
    const term = check(env, tm.term, vty);
    return [term, vty];
  }
  if (tm.tag === 'App') {
    const [l, ty] = synth(env, tm.left);
    const [r, rty] = synthapp(env, ty, tm.right);
    return [App(l, r), rty];
  }
  if (tm.tag === 'Abs' && tm.type) {
    const ty = check(env, tm.type, Type);
    const vty = evaluate(ty, env.vals);
    const venv = Cons(BoundV(tm.name), env.vals)
    const [body, rty] = synth({
      vals: venv,
      types: Cons(BoundT(tm.name, vty), env.types),
    }, tm.body);
    return [
      Abs(tm.name, body, ty),
      evaluate(Pi(tm.name, ty, quote(rty, venv)), env.vals),
    ];
  }
  if (tm.tag === 'Let') {
    const [val, ty, vty] = synthLetValue(env, tm.value, tm.type);
    const [body, rty] = synth({
      vals: Cons(DefV(tm.name, evaluate(val, env.vals)), env.vals),
      types: Cons(DefT(tm.name, vty), env.types),
    }, tm.body);
    return [Let(tm.name, val, body, ty), rty];
  }
  return terr(`cannot synth ${showTerm(tm)}`);
};

const synthLetValue = (env: Env, val: Term, ty?: Term): [Term, Term, Val] => {
  if (ty) {
    const ety = check(env, ty, Type);
    const vty = evaluate(ety, env.vals);
    const ev = check(env, val, vty);
    return [ev, ety, vty];
  } else {
    const [ev, vty] = synth(env, val);
    return [ev, quote(vty, env.vals), vty];
  }
};

const synthapp = (env: Env, ty: Val, tm: Term): [Term, Val] => {
  log(() => `synthapp ${showTerm(quote(ty, env.vals))} @ ${showTerm(tm)} in ${showEnvT(env.types)}`);
  if (ty.tag === 'VPi') {
    const arg = check(env, tm, ty.type);
    const varg = evaluate(arg, env.vals);
    return [arg, ty.body(varg)];
  }
  return terr(`expected a function type but got ${quote(ty, env.vals)}`);
};

export const elaborate = (tm: Term, env: Env = { vals: Nil, types: Nil }): [Term, Term] => {
  const [etm, ty] = synth(env, tm);
  return [etm, quote(ty, env.vals)];
};
