import { Domain, Env, DPi, Clos, DVar } from './domain';
import { Term, showTerm, Type } from './terms';
import { dapp, quote, capp, evaluate } from './nbe';
import { Nil, index, Cons, and, zipWith } from './list';
import { terr } from './util';

export const eqtype = (k: number, a: Domain, b: Domain): boolean => {
  if (a.tag === 'Type' && b.tag === 'Type') return true;
  if (a.tag === 'DAbs' && b.tag === 'DAbs') {
    if (!eqtype(k, a.type, b.type)) return false;
    const v = DVar(k);
    return eqtype(k + 1, capp(a.clos, v), capp(b.clos, v));
  }
  if (a.tag === 'DFix' && b.tag === 'DFix') {
    if (!eqtype(k, a.type, b.type)) return false;
    const v = DVar(k);
    return eqtype(k + 1, capp(a.clos, v), capp(b.clos, v));
  }
  if (a.tag === 'DAbs') {
    const v = DVar(k);
    return eqtype(k + 1, capp(a.clos, v), dapp(b, v));
  }
  if (b.tag === 'DAbs') {
    const v = DVar(k);
    return eqtype(k + 1, dapp(a, v), capp(b.clos, v));
  }
  if (a.tag === 'DFix')
    return eqtype(k, capp(a.clos, a), b);
  if (b.tag === 'DFix')
    return eqtype(k, a, capp(b.clos, b));
  if (a.tag === 'DPi' && b.tag === 'DPi') {
    if (!eqtype(k, a.type, b.type)) return false;
    const v = DVar(k);
    return eqtype(k + 1, capp(a.clos, v), capp(b.clos, v));
  }
  if (a.tag === 'DNeutral' && b.tag === 'DNeutral')
    return a.head.index === b.head.index &&
      and(zipWith((x, y) => eqtype(k, x, y), a.args, b.args));
  return false;
};

export const check = (tenv: Env, venv: Env, k: number, t: Term, ty: Domain): void => {
  const ty2 = synth(tenv, venv, k, t);
  if (!eqtype(k, ty2, ty))
    return terr(`typecheck failed: (${showTerm(t)} : ${showTerm(quote(ty, k))}), got ${showTerm(quote(ty2, k))}`);
};

export const synth = (tenv: Env, venv: Env, k: number, t: Term): Domain => {
  if (t.tag === 'Type') return Type;
  if (t.tag === 'Var')
    return index(tenv, t.index) || terr(`var out of scope ${t.index}`);
  if (t.tag === 'Abs') {
    check(tenv, venv, k, t.type, Type);
    const type = evaluate(t.type, venv);
    const rt = synth(Cons(type, tenv), Cons(DVar(k), venv), k + 1, t.body);
    return DPi(type, Clos(quote(rt, k + 1), venv));
  }
  if (t.tag === 'Fix') {
    check(tenv, venv, k, t.type, Type);
    const type = evaluate(t.type, venv);
    check(Cons(type, tenv), Cons(evaluate(t, venv), venv), k + 1, t.body, type);
    return type;
  }
  if (t.tag === 'Pi') {
    check(tenv, venv, k, t.type, Type);
    check(Cons(evaluate(t.type, venv), tenv), Cons(DVar(k), venv), k + 1, t.body, Type);
    return Type;
  }
  if (t.tag === 'App') {
    const ta = synth(tenv, venv, k, t.left);
    return synthapp(tenv, venv, k, t, ta, t.right);
  }
  return terr(`cannot synth ${showTerm(t)}`);
};

export const synthapp = (tenv: Env, venv: Env, k: number, t: Term, ta: Domain, b: Term): Domain => {
  if (ta.tag === 'DPi') {
    check(tenv, venv, k, b, ta.type);
    return capp(ta.clos, evaluate(b, venv));
  }
  if (ta.tag === 'DFix')
    return synthapp(tenv, venv, k, t, capp(ta.clos, ta), b);
  return terr(`invalid type in synthapp ${showTerm(t)}: ${showTerm(quote(ta, k))}`);
};

export const typecheck = (t: Term): Term => {
  const ty = synth(Nil, Nil, 0, t);
  return quote(ty);
};
