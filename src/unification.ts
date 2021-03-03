import { Abs, App, Axiom, Core, Meta, Pi, Sort, Type, Var } from './core';
import { MetaVar, setMeta } from './metas';
import { Lvl } from './names';
import { List, nil } from './utils/List';
import { impossible, terr, tryT } from './utils/utils';
import { force, isVVar, Spine, vinst, VVar, Val, evaluate, vapp, show, Head } from './values';

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
    const v = force(app.arg);
    if (!isVVar(v)) return terr(`not a variable in the spine`);
    const x =  v.head.level;
    if (typeof ren[x] === 'number') return terr(`non-linear spine`);
    return [dom + 1, insert(ren, x, dom)];
  }, [0, {} as IntMap<Lvl>]);

const invert = (gamma: Lvl, sp: Spine): PartialRenaming => {
  const [dom, ren] = invertSpine(sp);
  return PRen(dom, gamma, ren);
};

const renameSpine = (id: MetaVar, pren: PartialRenaming, t: Core, sp: Spine): Core =>
  sp.foldr((app, fn) => App(fn, app.erased, rename(id, pren, app.arg)), t);

const rename = (id: MetaVar, pren: PartialRenaming, v_: Val): Core => {
  const v = force(v_);
  if (v.tag === 'VFlex') {
    if (v.head === id) return terr(`occurs check failed: ${id}`);
    return renameSpine(id, pren, Meta(v.head), v.spine);
  }
  if (v.tag === 'VRigid') {
    if (v.head.tag === 'HAxiom')
      return renameSpine(id, pren, Axiom(v.head.name), v.spine);
    const x = pren.ren[v.head.level];
    if (typeof x !== 'number') return terr(`escaping variable ${v.head.level}`);
    return renameSpine(id, pren, Var(pren.dom - x - 1), v.spine);
  }
  if (v.tag === 'VAbs')
    return Abs(v.erased, v.name, rename(id, pren, v.type), rename(id, lift(pren), vinst(v, VVar(pren.cod))));
  if (v.tag === 'VPi')
    return Pi(v.erased, v.name, rename(id, pren, v.type), rename(id, lift(pren), vinst(v, VVar(pren.cod))));
  if (v.tag === 'VSort') return Sort(v.sort);
  if (v.tag === 'VGlobal') return impossible(`global in rename`);
  return v;
};

const lams = (is: List<boolean>, t: Core, n: number = 0): Core =>
  is.case(() => t, (i, rest) => Abs(i, `x${n}`, Type, lams(rest, t, n + 1))); // TODO: lambda type

const solve = (gamma: Lvl, m: MetaVar, sp: Spine, rhs_: Val): void => {
  const pren = invert(gamma, sp);
  const rhs = rename(m, pren, rhs_);
  const solution = evaluate(lams(sp.reverse().map(app => app.erased), rhs), nil);
  setMeta(m, solution);
};

const unifySpines = (l: Lvl, a: Spine, b: Spine): void =>
  a.zipWithR_(b, (x, y) => unify(l, x.arg, y.arg));

export const eqHead = (a: Head, b: Head): boolean => {
  if (a === b) return true;
  if (a.tag === 'HVar') return b.tag === 'HVar' && a.level === b.level;
  if (a.tag === 'HAxiom') return b.tag === 'HAxiom' && a.name === b.name;
  return false;
};

export const unify = (l: Lvl, a_: Val, b_: Val): void => {
  const a = force(a_, false);
  const b = force(b_, false);
  if (a === b) return;
  if (a.tag === 'VSort' && b.tag === 'VSort' && a.sort === b.sort) return;
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
  if (a.tag === 'VRigid' && b.tag === 'VRigid' && eqHead(a.head, b.head))
    return unifySpines(l, a.spine, b.spine);
  if (a.tag === 'VFlex' && b.tag === 'VFlex' && a.head === b.head)
    return unifySpines(l, a.spine, b.spine);
  if (a.tag === 'VFlex') return solve(l, a.head, a.spine, b);
  if (b.tag === 'VFlex') return solve(l, b.head, b.spine, a);
  if (a.tag === 'VGlobal' && b.tag === 'VGlobal' && a.name === b.name)
    return tryT(() => unifySpines(l, a.spine, b.spine), () => unify(l, a.val.get(), b.val.get()));
  if (a.tag === 'VGlobal') return unify(l, a.val.get(), b);
  if (b.tag === 'VGlobal') return unify(l, a, b.val.get());
  return terr(`failed to unify: ${show(a, l)} ~ ${show(b, l)}`);
};
