import { STerm, showSTerm } from './surface';
import { Term, Type, Pi, App, showTerm, Abs, Fix, Const, Let, resetMetaId } from './terms';
import { quote, evaluate, capp } from './nbe';
import { Nil, index, Cons } from './list';
import { Env, Domain, DVar, DPi, Clos } from './domain';
import { terr } from './util';
import { unify, newMeta, zonk } from './unify';
import { constenv } from './typecheck';

export const checkSurface = (tenv: Env, venv: Env, k: number, t: STerm, ty: Domain): Term => {
  // console.log(`checkSurface ${k} ${showSTerm(t)} : ${showTerm(quote(ty, k))} | ${showEnv(tenv, k)} | ${showEnv(venv, k)}`);
  if (t.tag === 'SAbs' && !t.type && ty.tag === 'DPi') {
    const v = DVar(k);
    const body = checkSurface(Cons(ty.type, tenv), Cons(v, venv), k + 1, t.body, capp(ty.clos, v));
    return Abs(quote(ty.type, k), body);
  }
  if (t.tag === 'SAbs' && !t.type && ty.tag === 'DFix')
    return checkSurface(tenv, venv, k, t, capp(ty.clos, ty));
  if (t.tag === 'SLet') {
    const tya = checkSurface(tenv, venv, k, t.type, Type);
    const vty = evaluate(tya, venv);
    const val = checkSurface(tenv, venv, k, t.value, vty);
    const body = checkSurface(Cons(vty, tenv), Cons(evaluate(val, venv), venv), k + 1, t.body, ty);
    return Let(tya, val, body);
  }
  if (t.tag === 'SHole')
    return newMeta(k);
  const [term, ty2] = synthSurface(tenv, venv, k, t);
  unify(k, ty2, ty);
  return term;
};

export const synthSurface = (tenv: Env, venv: Env, k: number, t: STerm): [Term, Domain] => {
  // console.log(`synthSurface ${k} ${showSTerm(t)} | ${showEnv(tenv, k)} | ${showEnv(venv, k)}`);
  if (t.tag === 'Type') return [t, t];
  if (t.tag === 'Var') {
    const ty = index(tenv, t.index) || terr(`var out of scope ${t.index}`);
    return [t, ty]
  }
  if (t.tag === 'SPi') {
    const ty = checkSurface(tenv, venv, k, t.type, Type);
    const body = checkSurface(Cons(evaluate(ty, venv), tenv), Cons(DVar(k), venv), k + 1, t.body, Type);
    return [Pi(ty, body), Type];
  }
  if (t.tag === 'SApp') {
    const [l, ta] = synthSurface(tenv, venv, k, t.left);
    const [b, tb] = synthappSurface(tenv, venv, k, t, ta, t.right);
    return [App(l, b), tb];
  }
  if (t.tag === 'SAnn') {
    const ety = checkSurface(tenv, venv, k, t.type, Type);
    const evty = evaluate(ety, venv);
    const term = checkSurface(tenv, venv, k, t.term, evty);
    return [term, evty];
  }
  if (t.tag === 'SFix') {
    const ty = checkSurface(tenv, venv, k, t.type, Type);
    const vty = evaluate(ty, venv);
    const body = checkSurface(Cons(vty, tenv), Cons(DVar(k), venv), k + 1, t.body, vty);
    return [Fix(ty, body), vty];
  }
  if (t.tag === 'SVar') {
    const ty = constenv[t.name];
    if (!ty) return terr(`undefined const ${t.name}`);
    return [Const(t.name), ty[0]];
  }
  if (t.tag === 'SAbs' && t.type) {
    const ty = checkSurface(tenv, venv, k, t.type, Type);
    const vty = evaluate(ty, venv);
    const v = DVar(k);
    const [body, rty] = synthSurface(Cons(vty, tenv), Cons(v, venv), k + 1, t.body);
    return [Abs(ty, body), DPi(vty, Clos(quote(rty, k + 1), venv))];
  }
  if (t.tag === 'SAbs' && !t.type) {
    const a = newMeta(k);
    const b = newMeta(k + 1);
    const ty = evaluate(Pi(a, b), venv);
    const term = checkSurface(tenv, venv, k, t, ty);
    return [term, ty];
  }
  if (t.tag === 'SLet') {
    const ty = checkSurface(tenv, venv, k, t.type, Type);
    const vty = evaluate(ty, venv);
    const val = checkSurface(tenv, venv, k, t.value, vty);
    const [body, rty] = synthSurface(Cons(vty, tenv), Cons(evaluate(val, venv), venv), k + 1, t.body);
    return [Let(ty, val, body), rty];
  }
  if (t.tag === 'SHole') {
    const t = newMeta(k);
    const va = evaluate(newMeta(k), venv);
    return [t, va];
  }
  return terr(`cannot synthSurface ${showSTerm(t)}`);
};

export const synthappSurface = (tenv: Env, venv: Env, k: number, t: STerm, ta: Domain, b: STerm): [Term, Domain] => {
  // console.log(`synthappSurface ${k} ${showSTerm(t)} => ${showTerm(quote(ta, k))} @ ${showSTerm(b)} | ${showEnv(tenv, k)} | ${showEnv(venv, k)}`);
  if (ta.tag === 'DPi') {
    const eb = checkSurface(tenv, venv, k, b, ta.type);
    return [eb, capp(ta.clos, evaluate(eb, venv))];
  }
  if (ta.tag === 'DFix')
    return synthappSurface(tenv, venv, k, t, capp(ta.clos, ta), b);
  return terr(`invalid type in synthappSurface ${showSTerm(t)}: ${showTerm(quote(ta, k))}`);
};

export const elaborate = (t: STerm): [Term, Term] => {
  resetMetaId();
  const [term, ty] = synthSurface(Nil, Nil, 0, t);
  const zterm = zonk(Nil, 0, term);
  const zty = zonk(Nil, 0, quote(ty));
  return [zterm, zty];
};
