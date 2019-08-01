import { List, toString, Nil, index, Cons, map } from './list';
import { Type, showType, eqType, TFun, isTFun, tfunR, tfunL, openTForall, TForall, TDef, tforall, THash, tapp1, TVar, shiftType, TApp, TIO, tfun } from './types';
import { Term, showTerm } from './terms';
import { terr, impossible } from './util';
import { Kind, kfun, KType, eqKind, showKind } from './kinds';

export type Env = List<Type>;
export type TEnv = List<Kind>;
export type HashEnv = { [key: string]: { term: Term, type: Type } };
export type THashEnv = { [key: string]: { kind: Kind, def: TDef } };

export const showEnv = (env: Env): string => toString(env, showType);
export const showTEnv = (env: TEnv): string => toString(env, showKind);
export const shiftEnv = (env: Env): Env => map(env, x => shiftType(1, 0, x));

export const wfType = (thenv: THashEnv, tenv: TEnv, t: Type): Kind => {
  if (t.tag === 'TConst') {
    if (t.name === '(->)') return kfun(KType, KType, KType);
    if (t.name === 'IO') return kfun(KType, KType);
    return terr(`invalid tconst ${t.name}`);
  }
  if (t.tag === 'TVar')
    return index(tenv, t.id) || terr(`undefined tvar ${t.id}`);
  if (t.tag === 'THash') {
    if (!thenv[t.hash]) return terr(`undefined type hash: ${t.hash}`);
    return thenv[t.hash].kind;
  }
  if (t.tag === 'TForall') {
    const k = wfType(thenv, Cons(t.kind, tenv), t.body);
    if (!eqKind(k, KType))
      return terr(`tforall should be of kind ${showKind(KType)} in ${showType(t)}`);
    return k;
  }
  if (t.tag === 'TApp') {
    const kf = wfType(thenv, tenv, t.left);
    const ka = wfType(thenv, tenv, t.right);
    if (kf.tag !== 'KFun')
      return terr(`not a kind function in ${showType(t)}`);
    if (!eqKind(ka, kf.left))
      return terr(`kind mismatch in ${showType(t)}`);
    return kf.right
  }
  return impossible('wfType');
};

const synth = (henv: HashEnv, thenv: THashEnv, env: Env, tenv: TEnv, term: Term): Type => {
  console.log(`synth ${showTerm(term)} ${showEnv(env)}`);
  if (term.tag === 'Var')
    return index(env, term.id) || terr(`undefined var ${term.id}`);
  if (term.tag === 'Hash') {
    const def = henv[term.hash];
    return def ? def.type : terr(`undefined hash ${term.hash}`);
  }
  if (term.tag === 'Abs') {
    const k = wfType(thenv, tenv, term.type);
    if (!eqKind(k, KType))
      return terr(`type should be of kind ${showKind(k)} in ${showTerm(term)}`);
    const rty = synth(henv, thenv, Cons(term.type, env), tenv, term.body);
    return TFun(term.type, rty);
  }
  if (term.tag === 'App') {
    const f = synth(henv, thenv, env, tenv, term.left);
    if (!isTFun(f))
      return terr(`not a function in ${showTerm(term)}`);
    check(henv, thenv, env, tenv, term.right, tfunL(f));
    return tfunR(f);
  }
  if (term.tag === 'AbsT') {
    const ty = synth(henv, thenv, shiftEnv(env), Cons(term.kind, tenv), term.body);
    return TForall(term.kind, ty);
  }
  if (term.tag === 'AppT') {
    const f = synth(henv, thenv, env, tenv, term.left);
    if (f.tag !== 'TForall')
      return terr(`not a forall in ${showTerm(term)}`);
    const k = wfType(thenv, tenv, term.right);
    if (!eqKind(k, f.kind))
      return terr(`kind mismatch in ${showTerm(term)}`);
    return openTForall(f, term.right);
  }
  if (term.tag === 'Con') {
    if (!thenv[term.con])
      return terr(`undefined type hash: ${term.con}`);
    const def = thenv[term.con].def;
    const cargs: TVar[] = Array(def.args.length);
    for (let i = 0, l = def.args.length; i < l; i++) cargs[i] = TVar(i);
    return tforall(def.args, TFun(def.type, tapp1(THash(term.con), cargs)));
  }
  if (term.tag === 'Decon') {
    if (!thenv[term.con])
      return terr(`undefined type hash: ${term.con}`);
    const def = thenv[term.con].def;
    const cargs: TVar[] = Array(def.args.length);
    for (let i = 0, l = def.args.length; i < l; i++) cargs[i] = TVar(i);
    return tforall(def.args, TFun(tapp1(THash(term.con), cargs), def.type));
  }
  if (term.tag === 'ReturnIO')
    return tforall([KType], TFun(TVar(0), TApp(TIO, TVar(0))));
  if (term.tag === 'BindIO')
    return tforall([KType, KType],
      tfun(tfun(TVar(1), TApp(TIO, TVar(0))), TApp(TIO, TVar(1)), TApp(TIO, TVar(0))));
  if (term.tag === 'BeepIO')
    return TApp(TIO, tforall([KType], tfun(TVar(0), TVar(0))));
  return impossible('synth');
};

const check = (henv: HashEnv, thenv: THashEnv, env: Env, tenv: TEnv, term: Term, type: Type): void => {
  console.log(`check ${showTerm(term)} : ${showType(type)} ${showEnv(env)}`);
  const type2 = synth(henv, thenv, env, tenv, term);
  console.log(`check ${showType(type2)} ~ ${showType(type)}`);
  if (!eqType(type2, type))
    return terr(`expected ${showType(type)} but got ${showType(type2)}`);
};

export const typecheck = (term: Term, henv: HashEnv = {}, thenv: THashEnv = {}, env: Env = Nil, tenv: TEnv = Nil): Type => {
  const type = synth(henv, thenv, env, tenv, term);
  const k = wfType(thenv, tenv, type);
  if (!eqKind(k, KType))
    return terr(`type should be of kind ${showKind(k)} in ${showType(type)}`);
  return type;
};
