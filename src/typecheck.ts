import { Domain, Env, DPi, Clos, DVar } from './domain';
import { Term, showTerm, Type } from './terms';
import { quote, capp, evaluate } from './nbe';
import { Nil, index, Cons } from './list';
import { terr } from './util';
import { unify } from './unify';

export type ConstEnv = { [key: string]: [Domain, Domain | null] };
export const constenv: ConstEnv = {};

export const check = (tenv: Env, venv: Env, k: number, t: Term, ty: Domain): void => {  
  if (t.tag === 'Let') {
    check(tenv, venv, k, t.type, Type);
    const vty = evaluate(t.type, venv);
    check(tenv, venv, k, t.value, vty);
    check(Cons(vty, tenv), Cons(evaluate(t.value, venv), venv), k + 1, t.body, ty);
    return;
  }
  const ty2 = synth(tenv, venv, k, t);
  unify(k, ty2, ty);
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
  if (t.tag === 'Const') {
    const ty = constenv[t.name];
    if (!ty) return terr(`undefined const ${t.name}`);
    return ty[0];
  }
  if (t.tag === 'Let') {
    check(tenv, venv, k, t.type, Type);
    const vty = evaluate(t.type, venv);
    check(tenv, venv, k, t.value, vty);
    return synth(Cons(vty, tenv), Cons(evaluate(t.value, venv), venv), k + 1, t.body);
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
