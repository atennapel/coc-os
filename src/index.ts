// @ts-ignore
import { showTerm, Con, appT, absT, abs, app, Var, Hash, Decon, ReturnIO, BindIO, BeepIO } from './terms';
import { KType, kfun } from './kinds';
import { TVar, showType, TDef, tforall, tfun, tapp, THash } from './types';
import { erase } from './erasure';
import { showETerm, normalizeFull } from './eterm';
import { typecheck, THashEnv, HashEnv } from './typecheck';
import { hashTerm } from './hashing';
import { deserializeTerm, serializeTerm } from './serialization';

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
  Cons: {
    term: absT([KType], abs([tv(0), tapp(THash('List'), tv(0))], app(appT(Con('List'), [tv(0)]), absT([KType], abs([tv(0), tfun(tv(1), tv(0), tv(0))], app(v(0), v(3), app(appT(app(appT(Decon('List'), [tv(1)]), v(2)), [tv(0)]), v(1), v(0)))))))),
    type: tforall([KType], tfun(tv(0), tapp(THash('List'), tv(0)), tapp(THash('List'), tv(0)))),
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

const tid = tforall([KType], tfun(tv(0), tv(0)));

const term = app(appT(BindIO, [tid, tid]), abs([tid], app(appT(BindIO, [tid, tid]), abs([tid], app(appT(ReturnIO, [tid]), v(0))), BeepIO)), BeepIO);
console.log(showTerm(term));
const type = typecheck(term, henv, thenv);
console.log(showType(type));
const ser = serializeTerm(term);
console.log(ser.toString('hex'));
console.log(hashTerm(term).toString('hex'));
const des = deserializeTerm(ser);
console.log(showTerm(des));
const eterm = erase(henv, term);
console.log(showETerm(eterm));
console.log(showETerm(normalizeFull(eterm)));

/**
 * TODO:
 * - normalization of typed terms
 */
