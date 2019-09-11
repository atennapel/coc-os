import { STerm, showSTerm } from './surface';
import { Term, Type, Pi, App, showTerm, Abs, Fix } from './terms';
import { quote, evaluate, capp } from './nbe';
import { Nil, index, Cons } from './list';
import { Env, Domain, DVar, showEnv } from './domain';
import { terr } from './util';
import { eqtype } from './typecheck';

export const checkSurface = (tenv: Env, venv: Env, k: number, t: STerm, ty: Domain): Term => {
  console.log(`checkSurface ${k} ${showSTerm(t)} : ${showTerm(quote(ty, k))} | ${showEnv(tenv, k)} | ${showEnv(venv, k)}`);
  if (t.tag === 'SAbs' && ty.tag === 'DPi') {
    const v = DVar(k);
    const body = checkSurface(Cons(ty.type, tenv), Cons(v, venv), k + 1, t.body, capp(ty.clos, v));
    return Abs(quote(ty.type, k), body);
  }
  if (t.tag === 'SAbs' && ty.tag === 'DFix')
    return checkSurface(tenv, venv, k, t, capp(ty.clos, ty));
  const [term, ty2] = synthSurface(tenv, venv, k, t);
  if (!eqtype(k, ty2, ty))
    return terr(`typecheck failed: (${showSTerm(t)} : ${showTerm(quote(ty, k))}), got ${showTerm(quote(ty2, k))}`);
  return term;
};

export const synthSurface = (tenv: Env, venv: Env, k: number, t: STerm): [Term, Domain] => {
  console.log(`synthSurface ${k} ${showSTerm(t)} | ${showEnv(tenv, k)} | ${showEnv(venv, k)}`);
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
  return terr(`cannot synth ${showSTerm(t)}`);
};

export const synthappSurface = (tenv: Env, venv: Env, k: number, t: STerm, ta: Domain, b: STerm): [Term, Domain] => {
  console.log(`synthappSurface ${k} ${showSTerm(t)} => ${showTerm(quote(ta, k))} @ ${showSTerm(b)} | ${showEnv(tenv, k)} | ${showEnv(venv, k)}`);
  if (ta.tag === 'DPi') {
    const eb = checkSurface(tenv, venv, k, b, ta.type);
    return [eb, capp(ta.clos, evaluate(eb, venv))];
  }
  if (ta.tag === 'DFix')
    return synthappSurface(tenv, venv, k, t, capp(ta.clos, ta), b);
  return terr(`invalid type in synthapp ${showSTerm(t)}: ${showTerm(quote(ta, k))}`);
};

export const elaborate = (t: STerm): [Term, Term] => {
  const [term, ty] = synthSurface(Nil, Nil, 0, t);
  return [term, quote(ty)];
};
