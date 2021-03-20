import { log } from './config';
import { Abs, App, Core, Meta, Pi, Type, Var, Global, ElimEnum, Sigma, Pair, Enum, EnumLit, Lift, LiftTerm } from './core';
import { MetaVar, setMeta } from './metas';
import { Lvl } from './names';
import { List, nil } from './utils/List';
import { terr, tryT } from './utils/utils';
import { force, isVVar, Spine, vinst, VVar, Val, evaluate, vapp, show, Elim, EApp } from './values';
import * as C from './core';

// following: https://github.com/AndrasKovacs/elaboration-zoo

type IntMap<T> = { [key: number]: T };
const insert = <T>(map: IntMap<T>, key: number, value: T): IntMap<T> =>
  ({ ...map, [key]: value });

interface PartialRenaming {
  readonly dom: Lvl;
  readonly cod: Lvl;
  readonly ren: IntMap<Lvl>;
}
const PRen = (dom: Lvl, cod: Lvl, ren: IntMap<Lvl>): PartialRenaming =>
  ({ dom, cod, ren });

const lift = (pren: PartialRenaming): PartialRenaming =>
  PRen(pren.dom + 1, pren.cod + 1, insert(pren.ren, pren.cod, pren.dom));

const invertSpine = (sp: Spine): [Lvl, IntMap<Lvl>] =>
  sp.foldr((app, [dom, ren]) => {
    if (app.tag !== 'EApp') return terr(`not a variable in the spine: ${app.tag}`);
    const v = force(app.arg);
    if (!isVVar(v)) return terr(`not a variable in the spine`);
    const x = v.head;
    if (typeof ren[x] === 'number') return terr(`non-linear spine`);
    return [dom + 1, insert(ren, x, dom)];
  }, [0, {} as IntMap<Lvl>]);

const invert = (gamma: Lvl, sp: Spine): PartialRenaming => {
  const [dom, ren] = invertSpine(sp);
  return PRen(dom, gamma, ren);
};

const renameElim = (id: MetaVar, pren: PartialRenaming, t: Core, e: Elim): Core => {
  if (e.tag === 'EApp') return App(t, e.erased, rename(id, pren, e.arg));
  if (e.tag === 'EElimEnum') return ElimEnum(e.num, e.lift, rename(id, pren, e.motive), t, e.cases.map(x => rename(id, pren, x)));
  return e;
};
const renameSpine = (id: MetaVar, pren: PartialRenaming, t: Core, sp: Spine): Core =>
  sp.foldr((app, fn) => renameElim(id, pren, fn, app), t);

const rename = (id: MetaVar, pren: PartialRenaming, v_: Val): Core => {
  const v = force(v_, false);
  if (v.tag === 'VFlex') {
    if (v.head === id) return terr(`occurs check failed: ${id}`);
    return renameSpine(id, pren, Meta(v.head), v.spine);
  }
  if (v.tag === 'VRigid') {
    const x = pren.ren[v.head];
    if (typeof x !== 'number') return terr(`escaping variable ${v.head}`);
    return renameSpine(id, pren, Var(pren.dom - x - 1), v.spine);
  }
  if (v.tag === 'VAbs')
    return Abs(v.erased, v.name, rename(id, pren, v.type), rename(id, lift(pren), vinst(v, VVar(pren.cod))));
  if (v.tag === 'VPi')
    return Pi(v.erased, v.name, rename(id, pren, v.type), rename(id, lift(pren), vinst(v, VVar(pren.cod))));
  if (v.tag === 'VSigma')
    return Sigma(v.erased, v.name, rename(id, pren, v.type), rename(id, lift(pren), vinst(v, VVar(pren.cod))));
  if (v.tag === 'VType') return Type(v.index);
  if (v.tag === 'VGlobal') return renameSpine(id, pren, Global(v.name, v.lift), v.spine); // TODO: should global be forced?
  if (v.tag === 'VEnum') return Enum(v.num, v.lift);
  if (v.tag === 'VEnumLit') return EnumLit(v.val, v.num, v.lift);
  if (v.tag === 'VPair') return Pair(v.erased, rename(id, pren, v.fst), rename(id, pren, v.snd), rename(id, pren, v.type));
  if (v.tag === 'VLift') return Lift(v.lift, rename(id, pren, v.type));
  if (v.tag === 'VLiftTerm') return LiftTerm(v.lift, rename(id, pren, v.term));
  return v;
};

const lams = (is: List<boolean>, t: Core, n: number = 0): Core =>
  is.case(() => t, (i, rest) => Abs(i, `x${n}`, Type(0), lams(rest, t, n + 1))); // TODO: lambda type

const solve = (gamma: Lvl, m: MetaVar, sp: Spine, rhs_: Val): void => {
  log(() => `solve ?${m}${sp.reverse().toString(v => v.tag === 'EApp' ? `${v.erased ? '{' : ''}${show(v.arg, gamma)}${v.erased ? '}' : ''}` : v.tag)} := ${show(rhs_, gamma)}`);
  const pren = invert(gamma, sp);
  const rhs = rename(m, pren, rhs_);
  const solutionq = lams(sp.reverse().map(app => (app as EApp).erased), rhs);
  log(() => `solution: ${C.show(solutionq)}`);
  const solution = evaluate(solutionq, nil);
  setMeta(m, solution);
};

const unifyElim = (l: Lvl, a: Elim, b: Elim): void => {
  if (a.tag === 'EApp' && b.tag === 'EApp') return unify(l, a.arg, b.arg);
  if (a.tag === 'EElimEnum' && b.tag === 'EElimEnum' && a.num === b.num && a.cases.length === b.cases.length) {
    unify(l, a.motive, b.motive);
    a.cases.forEach((ca, i) => unify(l, ca, b.cases[i]));
    return;
  }
  return terr(`cannot unify elims`);
};
const unifySpines = (l: Lvl, a: Spine, b: Spine): void => a.zipWithR_(b, (x, y) => unifyElim(l, x, y));

export const unify = (l: Lvl, a_: Val, b_: Val): void => {
  const a = force(a_, false);
  const b = force(b_, false);
  log(() => `unify ${show(a, l)} ~ ${show(b, l)}`);
  if (a === b) return;
  if (a.tag === 'VType' && b.tag === 'VType' && a.index === b.index) return;
  if (a.tag === 'VEnum' && b.tag === 'VEnum' && a.num === b.num && a.lift === b.lift) return;
  if (a.tag === 'VEnumLit' && b.tag === 'VEnumLit' && a.val === b.val && a.num === b.num && a.lift === b.lift) return;
  if (a.tag === 'VEnumLit' && a.num === 1) return;
  if (b.tag === 'VEnumLit' && b.num === 1) return;
  if (a.tag === 'VLift' && b.tag === 'VLift' && a.lift === b.lift) return unify(l, a.type, b.type);
  if (a.tag === 'VLiftTerm' && b.tag === 'VLiftTerm' && a.lift === b.lift) return unify(l, a.term, b.term);
  if (a.tag === 'VAbs' && b.tag === 'VAbs') {
    const v = VVar(l);
    return unify(l + 1, vinst(a, v), vinst(b, v));
  }
  if (a.tag === 'VAbs') {
    const v = VVar(l);
    return unify(l + 1, vinst(a, v), vapp(b, a.erased, v));
  }
  if (b.tag === 'VAbs') {
    const v = VVar(l);
    return unify(l + 1, vapp(a, b.erased, v), vinst(b, v));
  }
  if (a.tag === 'VPi' && b.tag === 'VPi' && a.erased === b.erased) {
    unify(l, a.type, b.type);
    const v = VVar(l);
    return unify(l + 1, vinst(a, v), vinst(b, v));
  }
  if (a.tag === 'VSigma' && b.tag === 'VSigma' && a.erased === b.erased) {
    unify(l, a.type, b.type);
    const v = VVar(l);
    return unify(l + 1, vinst(a, v), vinst(b, v));
  }
  if (a.tag === 'VPair' && b.tag === 'VPair' && a.erased === b.erased) {
    unify(l, a.fst, b.fst);
    unify(l, a.snd, b.snd);
    return;
  }
  // TODO: pair eta rule

  if (a.tag === 'VRigid' && b.tag === 'VRigid' && a.head === b.head)
    return tryT(() => unifySpines(l, a.spine, b.spine), e => terr(`failed to unify: ${show(a, l)} ~ ${show(b, l)}: ${e}`));
  if (a.tag === 'VFlex' && b.tag === 'VFlex' && a.head === b.head)
    return tryT(() => unifySpines(l, a.spine, b.spine), e => terr(`failed to unify: ${show(a, l)} ~ ${show(b, l)}: ${e}`));
  if (a.tag === 'VFlex') return solve(l, a.head, a.spine, b);
  if (b.tag === 'VFlex') return solve(l, b.head, b.spine, a);

  if (a.tag === 'VGlobal' && b.tag === 'VGlobal' && a.name === b.name && a.lift === b.lift)
    return tryT(() => unifySpines(l, a.spine, b.spine), () => unify(l, a.val.get(), b.val.get()));
  if (a.tag === 'VGlobal') return unify(l, a.val.get(), b);
  if (b.tag === 'VGlobal') return unify(l, a, b.val.get());

  return terr(`failed to unify: ${show(a, l)} ~ ${show(b, l)}`);
};
