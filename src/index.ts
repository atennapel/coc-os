import { showTerm, Con, appT, absT, abs, app, Var } from './terms';
import { KType, kfun } from './kinds';
import { TVar, showType, TDef, tforall, tfun } from './types';
import { erase } from './erasure';
import { showETerm } from './eterm';
import { typecheck, THashEnv, HashEnv } from './typecheck';

const v = Var;
const tv = TVar;

const henv: HashEnv = {};
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

const term = absT([KType], app(appT(Con('List'), [tv(0)]), absT([KType], abs([tv(0), tfun(tv(1), tv(0), tv(0))], v(1)))));
console.log(showTerm(term));
const type = typecheck(term, henv, thenv);
console.log(showType(type));
const eterm = erase(term);
console.log(showETerm(eterm));
