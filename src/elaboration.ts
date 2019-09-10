import { STerm, showSTerm } from './surface';
import { Term, Type, Pi, App, showTerm, Abs } from './terms';
import { quote, evaluate, capp } from './nbe';
import { Nil, index, Cons } from './list';
import { Env, Domain, DVar } from './domain';
import { terr } from './util';
import { eqtype } from './typecheck';

export const checkSurface = (tenv: Env, venv: Env, k: number, t: STerm, ty: Domain): Term => {
  if (t.tag === 'SAbs' && ty.tag === 'DPi') {
    const v = DVar(k);
    const body = checkSurface(Cons(ty.type, tenv), Cons(v, venv), k + 1, t.body, capp(ty.clos, v));
    return Abs(quote(ty.type, k), body);
  }
  const [term, ty2] = synthSurface(tenv, venv, k, t);
  if (!eqtype(k, ty2, ty))
    return terr(`typecheck failed: (${showSTerm(t)} : ${showTerm(quote(ty, k))}), got ${showTerm(quote(ty2, k))}`);
  return term;
};

export const synthSurface = (tenv: Env, venv: Env, k: number, t: STerm): [Term, Domain] => {
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
    if (ta.tag !== 'DPi')
      return terr(`expected pi in ${showSTerm(t)}, but got ${quote(ta, k)}`);
    const r = checkSurface(tenv, venv, k, t.right, ta.type);
    return [App(l, r), capp(ta.clos, evaluate(r, venv))];
  }
  if (t.tag === 'SAnn') {
    const ety = checkSurface(tenv, venv, k, t.type, Type);
    const evty = evaluate(ety, venv);
    const term = checkSurface(tenv, venv, k, t.term, evty);
    return [term, evty];
  }
  return terr(`cannot synth ${showSTerm(t)}`);
};

export const elaborate = (t: STerm): [Term, Term] => {
  const [term, ty] = synthSurface(Nil, Nil, 0, t);
  return [term, quote(ty)];
};
