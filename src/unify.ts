import { EnvV, fresh, BoundV, EnvT } from './env';
import { Val, VVar, Head } from './values';
import { terr, impossible } from './util';
import { showTerm, Term, freshMeta, app1, Var, Abs, Pi, Let, App, Meta, abs } from './terms';
import { quote, vapp, force, evaluate } from './nbe';
import { Cons, zipWith_, toArray, Nil, List, map, contains } from './list';
import { log } from './config';
import { Name } from './names';

const checkSpine = (sp: List<Val>): List<Name> =>
  map(sp, x_ => {
    const x = force(x_);
    return x.tag === 'VNe' && x.head.tag === 'Var' && x.args.tag === 'Nil' ?
      x.head.name : terr(`non-var in meta spine`);
  });

const checkSolution = (m: Meta, sp: List<Name>, t: Term): void => {
  if (t.tag === 'Type') return;
  if (t.tag === 'Var') {
    if (!contains(sp, t.name)) return terr(`scope error: ${t.name}`);
    return;
  }
  if (t.tag === 'App') {
    checkSolution(m, sp, t.left);
    checkSolution(m, sp, t.right);
    return;
  }
  if (t.tag === 'Abs') {
    checkSolution(m, Cons(t.name, sp), t.body);
    if (t.type) checkSolution(m, sp, t.type);
    return;
  }
  if (t.tag === 'Pi') {
    checkSolution(m, Cons(t.name, sp), t.body);
    checkSolution(m, sp, t.type);
    return;
  }
  if (t.tag === 'Meta') {
    if (t === m) return terr(`occurs failed: ${showTerm(m)}`);
    return;
  }
  return impossible('checkSolution');
};

const solve = (vs: EnvV, m: Meta, sp_: List<Val>, rhs_: Val): void => {
  const sp = checkSpine(sp_);
  const rhs = quote(rhs_, vs);
  const sparr = toArray(sp, x => x).reverse();
  log(() => `try (${showTerm(m)} ${sparr.join(' ')}) := ${showTerm(rhs)}`);
  checkSolution(m, sp, rhs);
  // TODO: add types to the parameters of the solution
  const sol = abs(sparr, rhs);
  log(() => `${showTerm(m)} := ${showTerm(abs(sparr, rhs))}`);
  m.term = evaluate(sol);
};

const eqHead = (a: Head, b: Head): boolean => {
  if (a === b) return true;
  if (a.tag === 'Var') return b.tag === 'Var' && a.name === b.name;
  return false;
};

export const unify = (vs: EnvV, a_: Val, b_: Val): void => {
  log(() => `unify ${showTerm(quote(a_, vs))} ~ ${showTerm(quote(b_, vs))}`);
  const a = force(a_);
  const b = force(b_);
  if (a.tag === 'Type' && b.tag === 'Type') return;
  if (a.tag === 'VAbs' && b.tag === 'VAbs') {
    const x = fresh(vs, a.name);
    const v = VVar(x);
    unify(vs, a.type, b.type);
    unify(Cons(BoundV(x), vs), a.body(v), b.body(v));
    return;
  }
  if (a.tag === 'VPi' && b.tag === 'VPi') {
    const x = fresh(vs, a.name);
    const v = VVar(x);
    unify(vs, a.type, b.type);
    unify(Cons(BoundV(x), vs), a.body(v), b.body(v));
    return;
  }
  if (a.tag === 'VAbs') {
    const x = fresh(vs, a.name);
    const v = VVar(x);
    return unify(Cons(BoundV(x), vs), a.body(v), vapp(b, v));
  }
  if (b.tag === 'VAbs') {
    const x = fresh(vs, b.name);
    const v = VVar(x);
    return unify(Cons(BoundV(x), vs), vapp(a, v), b.body(v));
  }
  if (a.tag === 'VNe' && b.tag === 'VNe' && eqHead(a.head, b.head))
    return zipWith_((x, y) => unify(vs, x, y), a.args, b.args);
  if (a.tag === 'VNe' && a.head.tag === 'Meta')
    return solve(vs, a.head, a.args, b);
  if (b.tag === 'VNe' && b.head.tag === 'Meta')
    return solve(vs, b.head, b.args, a);
  return terr(`cannot unify ${showTerm(quote(a, vs))} ~ ${showTerm(quote(b, vs))}`);
};

export const newMeta = (ts: EnvT): Term =>
  app1(freshMeta(),
    toArray(ts, x => x).reverse().filter(e => e.tag === 'BoundT')
      .map(e => Var(e.name)));

type Either<A, B> = [false, A] | [true, B];
const L = <A, B>(v: A): Either<A, B> => [false, v];
const R = <A, B>(v: B): Either<A, B> => [true, v];
const either = <A, B, R>(e: Either<A, B>, l: (v: A) => R, r: (v: B) => R): R =>
  e[0] ? r(e[1]) : l(e[1]);

const zonkApp = (vs: EnvV, t: Term): Either<Val, Term> => {
  if (t.tag === 'Meta') return t.term ? L(t.term) : R(t);
  if (t.tag === 'App')
    return either(
      zonkApp(vs, t.left),
      x => L(vapp(x, evaluate(t.right, vs))),
      x => R(App(x, zonk(t.right, vs))),
    );
  return R(zonk(t, vs));
};
export const zonk = (tm: Term, vs: EnvV = Nil): Term => {
  if (tm.tag === 'Var') return tm;
  if (tm.tag === 'Meta') return tm.term ? quote(tm.term, vs) : tm;
  if (tm.tag === 'Type') return tm;
  if (tm.tag === 'Abs')
    return Abs(tm.name, zonk(tm.body, Cons(BoundV(tm.name), vs)), tm.type && zonk(tm.type, vs));
  if (tm.tag === 'Pi')
    return Pi(tm.name, zonk(tm.type, vs), zonk(tm.body, Cons(BoundV(tm.name), vs)));
  if (tm.tag === 'Let')
    return Let(tm.name, zonk(tm.value, vs), zonk(tm.body, Cons(BoundV(tm.name), vs)), tm.type && zonk(tm.type, vs));
  if (tm.tag === 'App')
    return either(
      zonkApp(vs, tm.left),
      x => quote(vapp(x, evaluate(tm.right, vs)), vs),
      x => App(x, zonk(tm.right, vs)),
    );
  return impossible(`zonk`);
};
