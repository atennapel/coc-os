import { Domain, Env, DPi, Clos, DVar, Head } from './domain';
import { Term, showTerm, Type } from './terms';
import { dapp, quote, capp, evaluate } from './nbe';
import { Nil, index, Cons, and, zipWith } from './list';
import { terr } from './util';

export type ConstEnv = { [key: string]: Domain };

export const headeq = (a: Head, b: Head): boolean =>
  a.tag === 'Var' ? (b.tag === 'Var' && a.index === b.index) :
  (b.tag === 'Const' && a.name === b.name);

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
    return headeq(a.head, b.head) &&
      and(zipWith((x, y) => eqtype(k, x, y), a.args, b.args));
  return false;
};

export const check = (cenv: ConstEnv, tenv: Env, venv: Env, k: number, t: Term, ty: Domain): void => {  
  if (t.tag === 'Let') {
    check(cenv, tenv, venv, k, t.type, Type);
    const vty = evaluate(t.type, venv);
    check(cenv, tenv, venv, k, t.value, vty);
    check(cenv, Cons(vty, tenv), Cons(evaluate(t.value, venv), venv), k + 1, t.body, ty);
    return;
  }
  const ty2 = synth(cenv, tenv, venv, k, t);
  if (!eqtype(k, ty2, ty))
    return terr(`typecheck failed: (${showTerm(t)} : ${showTerm(quote(ty, k))}), got ${showTerm(quote(ty2, k))}`);
};

export const synth = (cenv: ConstEnv, tenv: Env, venv: Env, k: number, t: Term): Domain => {
  if (t.tag === 'Type') return Type;
  if (t.tag === 'Var')
    return index(tenv, t.index) || terr(`var out of scope ${t.index}`);
  if (t.tag === 'Abs') {
    check(cenv, tenv, venv, k, t.type, Type);
    const type = evaluate(t.type, venv);
    const rt = synth(cenv, Cons(type, tenv), Cons(DVar(k), venv), k + 1, t.body);
    return DPi(type, Clos(quote(rt, k + 1), venv));
  }
  if (t.tag === 'Fix') {
    check(cenv, tenv, venv, k, t.type, Type);
    const type = evaluate(t.type, venv);
    check(cenv, Cons(type, tenv), Cons(evaluate(t, venv), venv), k + 1, t.body, type);
    return type;
  }
  if (t.tag === 'Pi') {
    check(cenv, tenv, venv, k, t.type, Type);
    check(cenv, Cons(evaluate(t.type, venv), tenv), Cons(DVar(k), venv), k + 1, t.body, Type);
    return Type;
  }
  if (t.tag === 'App') {
    const ta = synth(cenv, tenv, venv, k, t.left);
    return synthapp(cenv, tenv, venv, k, t, ta, t.right);
  }
  if (t.tag === 'Const') {
    const ty = cenv[t.name];
    if (!ty) return terr(`undefined const ${t.name}`);
    return ty;
  }
  if (t.tag === 'Let') {
    check(cenv, tenv, venv, k, t.type, Type);
    const vty = evaluate(t.type, venv);
    check(cenv, tenv, venv, k, t.value, vty);
    return synth(cenv, Cons(vty, tenv), Cons(evaluate(t.value, venv), venv), k + 1, t.body);
  }
  return terr(`cannot synth ${showTerm(t)}`);
};

export const synthapp = (cenv: ConstEnv, tenv: Env, venv: Env, k: number, t: Term, ta: Domain, b: Term): Domain => {
  if (ta.tag === 'DPi') {
    check(cenv, tenv, venv, k, b, ta.type);
    return capp(ta.clos, evaluate(b, venv));
  }
  if (ta.tag === 'DFix')
    return synthapp(cenv, tenv, venv, k, t, capp(ta.clos, ta), b);
  return terr(`invalid type in synthapp ${showTerm(t)}: ${showTerm(quote(ta, k))}`);
};

export const typecheck = (t: Term, cenv: ConstEnv = {}): Term => {
  const ty = synth(cenv, Nil, Nil, 0, t);
  return quote(ty);
};
