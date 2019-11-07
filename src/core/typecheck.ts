import { Val, quote, EnvV, VVar, vapp, VType, evaluate } from './vals';
import { Term, showTerm, Pi } from './terms';
import { Nil, zipWith, and, index, Cons, length } from '../list';
import { terr } from '../util';

const conv = (k: number, a: Val, b: Val): boolean => {
  if (a === b) return true;
  if (a.tag === 'Type' && b.tag === 'Type') return true;
  if (a.tag === 'VPi' && b.tag === 'VPi' && a.impl === b.impl) {
    if (!conv(k, a.type, b.type)) return false;
    const v = VVar(k);
    return conv(k + 1, a.body(v), a.body(v));
  }
  if (a.tag === 'VAbs' && b.tag === 'VAbs' && a.impl === b.impl) {
    if (!conv(k, a.type, b.type)) return false;
    const v = VVar(k);
    return conv(k + 1, a.body(v), a.body(v));
  }
  if (a.tag === 'VAbs') {
    const v = VVar(k);
    return conv(k + 1, a.body(v), vapp(b, a.impl, v));
  }
  if (b.tag === 'VAbs') {
    const v = VVar(k);
    return conv(k + 1, vapp(a, b.impl, v), b.body(v));
  }
  if (a.tag === 'VNe' && b.tag === 'VNe' && a.head === b.head)
    return and(zipWith(([i, x], [j, y]) => i === j && conv(k, x, y), a.args, b.args));
  return false;
};

const check = (tenv: EnvV, venv: EnvV, k: number, tm: Term, ty: Val): void => {
  const ty2 = synth(tenv, venv, k, tm);
  if (!conv(k, ty2, ty))
    return terr(`typecheck failed: got ${showTerm(quote(ty2, k))}, expected ${showTerm(quote(ty, k))}`);
};

const isImplicitUsed = (k: number, t: Term): boolean => {
  if (t.tag === 'Type') return false;
  if (t.tag === 'Pi') return false; // ?
  if (t.tag === 'Var') return t.index === k;
  if (t.tag === 'App') {
    if (isImplicitUsed(k, t.left)) return true;
    return t.impl ? false : isImplicitUsed(k, t.right);
  }
  if (t.tag === 'Abs') return isImplicitUsed(k + 1, t.body);
  if (t.tag === 'Let') {
    if (!t.impl && isImplicitUsed(k, t.val)) return true;
    return isImplicitUsed(k + 1, t.body);
  }
  return t;
};

const synth = (tenv: EnvV, venv: EnvV, k: number, tm: Term): Val => {
  if (tm.tag === 'Type') return VType;
  if (tm.tag === 'Var')
    return index(tenv, tm.index) || terr(`var out of scope ${showTerm(tm)}`);
  if (tm.tag === 'Pi') {
    check(tenv, venv, k, tm.type, VType);
    check(Cons(evaluate(tm.type, venv), tenv), Cons(VVar(k), venv), k + 1, tm.body, VType);
    return VType;
  }
  if (tm.tag === 'App') {
    const ty = synth(tenv, venv, k, tm.left);
    return synthapp(tenv, venv, k, ty, tm.impl, tm.right);
  }
  if (tm.tag === 'Abs') {
    if (tm.impl && isImplicitUsed(0, tm.body))
      return terr(`implicit used in ${showTerm(tm)}`);
    check(tenv, venv, k, tm.type, VType);
    const type = evaluate(tm.type, venv);
    const rt = synth(Cons(type, tenv), Cons(VVar(k), venv), k + 1, tm.body);
    return evaluate(Pi(tm.type, tm.impl, quote(rt, k + 1)), venv);
  }
  if (tm.tag === 'Let') {
    if (tm.impl && isImplicitUsed(0, tm.body))
      return terr(`implicit used in ${showTerm(tm)}`);
    const vty = synth(tenv, venv, k, tm.val);
    return synth(Cons(vty, tenv), Cons(evaluate(tm.val, venv), venv), k + 1, tm.body);
  }
  return terr(`cannot synth ${showTerm(tm)}`);
};

const synthapp = (tenv: EnvV, venv: EnvV, k: number, ty: Val, impl: boolean, tm: Term): Val => {
  if (ty.tag === 'VPi' && ty.impl === impl) {
    check(tenv, venv, k, tm, ty.type);
    return ty.body(evaluate(tm, venv));
  }
  return terr(`invalid type in synthapp: ${showTerm(quote(ty, k))} @ ${showTerm(tm)}`);
};

export const typecheck = (tm: Term, tenv: EnvV = Nil, venv: EnvV = Nil): Term =>
  quote(synth(tenv, venv, length(tenv), tm));
