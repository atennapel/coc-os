// @ts-ignore
import { showTerm, Con, appT, absT, abs, app, Var, Hash, Decon } from './terms';
import { KType, kfun } from './kinds';
import { TVar, showType, TDef, tforall, tfun, tapp, THash } from './types';
import { erase } from './erasure';
import { showETerm, normalizeFull } from './eterm';
import { typecheck, THashEnv, HashEnv } from './typecheck';

const v = Var;
const tv = TVar;

const thenv: THashEnv = {
  Id: { kind: kfun(KType, KType), def: TDef([KType], tv(0)) },
  Nat: {
    kind: KType,
    def: TDef([], tforall([KType], tfun(tv(0), tfun(tv(0), tv(0)), tv(0)))),
  },
  List: {
    kind: kfun(KType, KType),
    def: TDef([KType], tforall([KType], tfun(tv(0), tfun(tv(1), tv(0), tv(0)), tv(0)))),
  },
};
const henv: HashEnv = {
  Nil: {
    term: absT([KType], app(appT(Con('List'), [tv(0)]), absT([KType], abs([tv(0), tfun(tv(1), tv(0), tv(0))], v(1))))),
    type: tforall([KType], tapp(THash('List'), tv(0))),
  },
  Z: {
    term: app(Con('Nat'), absT([KType], abs([tv(0), tfun(tv(0), tv(0))], v(1)))),
    type: THash('Nat'),
  },
  S: {
    term: abs([THash('Nat')], app(Con('Nat'), absT([KType], abs([tv(0), tfun(tv(0), tv(0))], app(v(0), app(appT(app(Decon('Nat'), v(2)), [tv(0)]), v(1), v(0))))))),
    type: tfun(THash('Nat'), THash('Nat')),
  },
};

const term = app(Hash('S'), app(Hash('S'), Hash('Z')));
console.log(showTerm(term));
const type = typecheck(term, henv, thenv);
console.log(showType(type));
const eterm = erase(henv, term);
console.log(showETerm(eterm));
console.log(showETerm(normalizeFull(eterm)));
