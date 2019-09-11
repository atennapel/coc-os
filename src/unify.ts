import { zipWith_, map, List, toString, range, foldr, reverse, contains, Cons, max, foldl } from './list';
import { terr, impossible } from './util';
import { force, quote, capp, dapp, evaluate } from './nbe';
import { Domain, DVar, Head } from './domain';
import { Meta, Term, showTerm, freshMeta, App, Var, Abs, Type, Let, Pi, Fix } from './terms';

export const headeq = (a: Head, b: Head): boolean =>
  a === b || (
    a.tag === 'Var' ? (b.tag === 'Var' && a.index === b.index) :
    (a.tag === 'Const' && b.tag === 'Const' && a.name === b.name)
  );

export const unify = (k: number, a_: Domain, b_: Domain): void => {
  const a = force(a_);
  const b = force(b_);
  if (a.tag === 'Type' && b.tag === 'Type') return;
  if (a.tag === 'DAbs' && b.tag === 'DAbs') {
    unify(k, a.type, b.type);
    const v = DVar(k);
    return unify(k + 1, capp(a.clos, v), capp(b.clos, v));
  }
  if (a.tag === 'DFix' && b.tag === 'DFix') {
    unify(k, a.type, b.type);
    const v = DVar(k);
    return unify(k + 1, capp(a.clos, v), capp(b.clos, v));
  }
  if (a.tag === 'DAbs') {
    const v = DVar(k);
    return unify(k + 1, capp(a.clos, v), dapp(b, v));
  }
  if (b.tag === 'DAbs') {
    const v = DVar(k);
    return unify(k + 1, dapp(a, v), capp(b.clos, v));
  }
  if (a.tag === 'DFix')
    return unify(k, capp(a.clos, a), b);
  if (b.tag === 'DFix')
    return unify(k, a, capp(b.clos, b));
  if (a.tag === 'DPi' && b.tag === 'DPi') {
    unify(k, a.type, b.type);
    const v = DVar(k);
    return unify(k + 1, capp(a.clos, v), capp(b.clos, v));
  }
  if (a.tag === 'DNeutral' && b.tag === 'DNeutral' && headeq(a.head, b.head))
    return zipWith_((x, y) => unify(k, x, y), a.args, b.args);
  if (a.tag === 'DNeutral' && a.head.tag === 'Meta')
    return solve(k, a.head, a.args, b);
  if (b.tag === 'DNeutral' && b.head.tag === 'Meta')
    return solve(k, b.head, b.args, a);
  return terr(`typecheck failed: ${showTerm(quote(b, k))} expected, got ${showTerm(quote(a, k))}`);
};

const checkSpine = (sp: List<Domain>): List<number> =>
  map(sp, x => {
    const v = force(x);
    return v.tag === 'DNeutral' && v.head.tag === 'Var' && v.args.tag === 'Nil' ?
      v.head.index :
      terr(`non-variable in meta spine`);
  });

const checkSolution = (m: Meta, sp: List<number>, t: Term): void => {
  if (t === m) return terr(`occurs check failed`);
  if (t.tag === 'Var') {
    if (!contains(sp, t.index)) return terr(`scope error`);
    return;
  }
  if (t.tag === 'Const') return;
  if (t.tag === 'Meta') return
  if (t.tag === 'App') {
    checkSolution(m, sp, t.left);
    checkSolution(m, sp, t.right);
    return;
  }
  if (t.tag === 'Abs') {
    checkSolution(m, sp, t.type);
    checkSolution(m, Cons(0, map(sp, x => x + 1)), t.body);
    return;
  }
  if (t.tag === 'Fix') {
    checkSolution(m, sp, t.type);
    checkSolution(m, Cons(0, map(sp, x => x + 1)), t.body);
    return;
  }
  if (t.tag === 'Pi') {
    checkSolution(m, sp, t.type);
    checkSolution(m, Cons(0, map(sp, x => x + 1)), t.body);
    return;
  }
  if (t.tag === 'Type') return;
  return impossible('checkSolution');
};

const solve = (k: number, m: Meta, sp_: List<Domain>, t: Domain): void => {
  const sp = checkSpine(sp_);
  const rhs = quote(t, k);
  checkSolution(m, sp, rhs);
  console.log(showTerm(m), toString(sp), showTerm(rhs));
  const mx = max(sp);
  console.log(mx);
  const qterm = foldl((x, y) => Abs(Type, x), rhs, sp);
  console.log(showTerm(qterm));
  m.term = evaluate(qterm);
};

export const newMeta = (k: number): Term =>
  foldr((x, y) => App(y, x), freshMeta() as Term, reverse(map(range(k), Var)));

export const zonk = (k: number, t: Term): Term => {
  if (t.tag === 'Meta') {
    if (!t.term) return impossible(`unsolved meta ${showTerm(t)}`);
    return zonk(k, quote(t.term, k));
  }
  if (t.tag === 'Abs') return Abs(zonk(k, t.type), zonk(k + 1, t.body));
  if (t.tag === 'Fix') return Fix(zonk(k, t.type), zonk(k + 1, t.body));
  if (t.tag === 'Pi') return Pi(zonk(k, t.type), zonk(k + 1, t.body));
  if (t.tag === 'Let') return Let(zonk(k, t.type), zonk(k, t.value), zonk(k + 1, t.body));
  if (t.tag === 'App') return App(zonk(k, t.left), zonk(k, t.right));
  return t;
};
