import { Domain, DApp, Env, DPi, Clos } from './domain';
import { Var, Term, showTerm, Type } from './terms';
import { closappd, quote, closapp, evaluate } from './nbe';
import { Nil, index, Cons } from './list';
import { terr, impossible } from './util';

export const eqtype = (k: number, a: Domain, b: Domain): boolean => {
  if (a.tag === 'Type' && b.tag === 'Type') return a.index === b.index;
  if (a.tag === 'Var' && b.tag === 'Var') return a.index === b.index;
  if (a.tag === 'DAbs' && b.tag === 'DAbs') {
    if (!eqtype(k, a.type, b.type)) return false;
    const v = Var(k);
    return eqtype(k + 1, closappd(a.clos, v), closappd(b.clos, v));
  }
  if (a.tag === 'DAbs') {
    const v = Var(k);
    return eqtype(k + 1, closappd(a.clos, v), DApp(b, v));
  }
  if (b.tag === 'DAbs') {
    const v = Var(k);
    return eqtype(k + 1, DApp(a, v), closappd(b.clos, v));
  }
  if (a.tag === 'DPi' && b.tag === 'DPi') {
    if (!eqtype(k, a.type, b.type)) return false;
    const v = Var(k);
    return eqtype(k + 1, closappd(a.clos, v), closappd(b.clos, v));
  }
  if (a.tag === 'DApp' && b.tag === 'DApp')
    return eqtype(k, a.left, b.left) && eqtype(k, a.right, b.right);
  return false;
};

export const check = (tenv: Env, venv: Env, k: number, t: Term, ty: Domain): void => {
  const ty2 = synth(tenv, venv, k, t);
  if (!eqtype(k, ty2, ty))
    return terr(`typecheck failed: (${showTerm(t)} : ${showTerm(quote(ty, k))}), got ${showTerm(quote(ty2, k))}`);
};

export const checkUniverse = (tenv: Env, venv: Env, k: number, t: Term): number => {
  const ty = synth(tenv, venv, k, t);
  if (ty.tag !== 'Type')
    return terr(`* expected for ${showTerm(t)} but got ${showTerm(quote(ty, k))}`);
  return ty.index;
};

export const synth = (tenv: Env, venv: Env, k: number, t: Term): Domain => {
  if (t.tag === 'Type') return Type(t.index + 1);
  if (t.tag === 'Var')
    return index(tenv, t.index) || terr(`var out of scope ${t.index}`);
  if (t.tag === 'Abs') {
    checkUniverse(tenv, venv, k, t.type);
    const type = evaluate(t.type, venv);
    const rt = synth(Cons(type, tenv), Cons(Var(k), venv), k + 1, t.body);
    const pi = DPi(type, Clos(quote(rt, k + 1), venv));
    //synth(tenv, venv, k, quote(pi, k));
    return pi;
  }
  if (t.tag === 'Pi') {
    checkUniverse(tenv, venv, k, t.type);
    const level2 = checkUniverse(Cons(evaluate(t.type, venv), tenv), Cons(Var(k), venv), k + 1, t.body);
    return Type(level2);
  }
  if (t.tag === 'App') {
    const ta = synth(tenv, venv, k, t.left);
    if (ta.tag !== 'DPi')
      return terr(`expected pi in ${showTerm(t)}, but got ${quote(ta, k)}`);
    check(tenv, venv, k, t.right, ta.type);
    return closapp(venv, ta.clos, t.right);
  }
  return impossible('synth');
};

export const typecheck = (t: Term): Term => {
  const ty = synth(Nil, Nil, 0, t);
  return quote(ty);
};
