import { Head, Elim, Val, vapp, showTermQ, VVar, forceGlue, showElimQ, quote, evaluate } from './domain';
import { Ix, Name } from './names';
import { terr, impossible } from './utils/util';
import { forceLazy } from './utils/lazy';
import { zipWithR_, length, List, listToString, map, foldl, toArray, Nil, contains, indexOf, Cons } from './utils/list';
import { log } from './config';
import { metaPop, metaDiscard, metaPush, metaSet } from './metas';
import { Term, showSurface, showTerm, Abs, Var, App, Pi, Fix } from './syntax';

const eqHead = (a: Head, b: Head): boolean => {
  if (a === b) return true;
  if (a.tag === 'HVar') return b.tag === 'HVar' && a.index === b.index;
  if (a.tag === 'HGlobal') return b.tag === 'HGlobal' && a.name === b.name;
  if (a.tag === 'HMeta') return b.tag === 'HMeta' && a.index === b.index;
  return a;
};
const unifyElim = (k: Ix, a: Elim, b: Elim, x: Val, y: Val): void => {
  if (a === b) return;
  if (a.tag === 'EApp' && b.tag === 'EApp') return unify(k, a.arg, b.arg);
  return terr(`unify failed (${k}): ${showTermQ(x, k)} ~ ${showTermQ(y, k)}`);
};
export const unify = (k: Ix, a_: Val, b_: Val): void => {
  const a = forceGlue(a_);
  const b = forceGlue(b_);
  log(() => `unify ${showTermQ(a, k)} ~ ${showTermQ(b, k)}`);
  if (a === b) return;
  if (a.tag === 'VType' && b.tag === 'VType') return;
  if (a.tag === 'VPi' && b.tag === 'VPi' && a.plicity === b.plicity) {
    unify(k, a.type, b.type);
    const v = VVar(k);
    return unify(k + 1, a.body(v), b.body(v));
  }
  if (a.tag === 'VFix' && b.tag === 'VFix') {
    unify(k, a.type, b.type);
    const v = VVar(k);
    const w = VVar(k + 1);
    return unify(k + 2, a.body(v, w), b.body(v, w));
  }
  if (a.tag === 'VAbs' && b.tag === 'VAbs') {
    const v = VVar(k);
    return unify(k + 1, a.body(v), b.body(v));
  }
  if (a.tag === 'VAbs') {
    const v = VVar(k);
    return unify(k + 1, a.body(v), vapp(b, v));
  }
  if (b.tag === 'VAbs') {
    const v = VVar(k);
    return unify(k + 1, vapp(a, v), b.body(v));
  }
  if (a.tag === 'VNe' && b.tag === 'VNe' && eqHead(a.head, b.head) && length(a.args) === length(b.args))
    return zipWithR_((x, y) => unifyElim(k, x, y, a, b), a.args, b.args);
  if (a.tag === 'VNe' && b.tag === 'VNe' && a.head.tag === 'HMeta' && b.head.tag === 'HMeta')
    return length(a.args) > length(b.args) ?
      solve(k, a.head.index, a.args, b) :
      solve(k, b.head.index, b.args, a);
  if (a.tag === 'VNe' && a.head.tag === 'HMeta')
    return solve(k, a.head.index, a.args, b);
  if (b.tag === 'VNe' && b.head.tag === 'HMeta')
    return solve(k, b.head.index, b.args, a);
  if (a.tag === 'VGlued' && b.tag === 'VGlued' && eqHead(a.head, b.head) && length(a.args) === length(b.args)) {
    try {
      metaPush();
      zipWithR_((x, y) => unifyElim(k, x, y, a, b), a.args, b.args);
      metaDiscard();
      return;
    } catch(err) {
      if (!(err instanceof TypeError)) throw err;
      metaPop();
      return unify(k, forceLazy(a.val), forceLazy(b.val));
    }
  }
  if (a.tag === 'VGlued') return unify(k, forceLazy(a.val), b);
  if (b.tag === 'VGlued') return unify(k, a, forceLazy(b.val));
  return terr(`unify failed (${k}): ${showTermQ(a, k)} ~ ${showTermQ(b, k)}`);
};

const solve = (k: Ix, m: Ix, spine: List<Elim>, val: Val): void => {
  log(() => `solve ?${m} ${listToString(spine, e => showElimQ(e, k, false))} := ${showTermQ(val, k)}`);
  try {
    const spinex = checkSpine(k, spine);
    const rhs = quote(val, k, false);
    const body = checkSolution(k, m, spinex, rhs);
    const solution = foldl((body, y) => {
      if (typeof y === 'string') return Abs(false, '_', null, body);
      const x = `v\$${y}`;
      return Abs(false, x, null, body);
    }, body, spinex);
    log(() => `solution ?${m} := ${showSurface(solution, Nil)} | ${showTerm(solution)}`);
    const vsolution = evaluate(solution, Nil);
    metaSet(m, vsolution);
  } catch (err) {
    if (!(err instanceof TypeError)) throw err;
    const a = toArray(spine, e => showElimQ(e, k));
    terr(`failed to solve meta (?${m}${a.length > 0 ? ' ': ''}${a.join(' ')}) := ${showTermQ(val, k)}: ${err.message}`);
  }
};

const checkSpine = (k: Ix, spine: List<Elim>): List<Ix | Name> =>
  map(spine, elim => {
    if (elim.tag === 'EApp') {
      const v = forceGlue(elim.arg);
      if ((v.tag === 'VNe' || v.tag === 'VGlued') && v.head.tag === 'HVar' && length(v.args) === 0)
        return v.head.index;
      if ((v.tag === 'VNe' || v.tag === 'VGlued') && v.head.tag === 'HGlobal' && length(v.args) === 0)
        return v.head.name;
      return terr(`not a var in spine: ${showTermQ(v, k)}`);
    }
    return elim.tag;
  });

const checkSolution = (k: Ix, m: Ix, is: List<Ix | Name>, t: Term): Term => {
  if (t.tag === 'Type') return t;
  if (t.tag === 'Global') return t;
  if (t.tag === 'Var') {
    const i = k - t.index - 1;
    if (contains(is, i))
      return Var(indexOf(is, i));
    return terr(`scope error ${t.index} (${i})`);
  }
  if (t.tag === 'Meta') {
    if (m === t.index)
      return terr(`occurs check failed: ${showTerm(t)}`);
    return t;
  }
  if (t.tag === 'App') {
    const l = checkSolution(k, m, is, t.left);
    const r = checkSolution(k, m, is, t.right);
    return App(l, t.plicity, r);
  }
  if (t.tag === 'Abs') {
    const body = checkSolution(k + 1, m, Cons(k, is), t.body);
    return Abs(t.plicity, t.name, null, body);
  }
  if (t.tag === 'Pi') {
    const ty = checkSolution(k, m, is, t.type);
    const body = checkSolution(k + 1, m, Cons(k, is), t.body);
    return Pi(t.plicity, t.name, ty, body);
  }
  if (t.tag === 'Fix') {
    const ty = checkSolution(k, m, is, t.type);
    const body = checkSolution(k + 2, m, Cons(k + 1, Cons(k, is)), t.body);
    return Fix(t.self, t.name, ty, body);
  }
  return impossible(`checkSolution ?${m}: non-normal term: ${showTerm(t)}`);
};
