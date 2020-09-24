import { getMeta } from './context';
import { Abs, App, Let, Meta, Pi, show, Term, Type, Var } from './core';
import { Ix, Name } from './names';
import { Cons, foldr, index, List, Nil } from './utils/list';
import { impossible } from './utils/utils';

export type Head = HVar | HMeta;

export type HVar = { tag: 'HVar', index: Ix };
export const HVar = (index: Ix): HVar => ({ tag: 'HVar', index });
export type HMeta = { tag: 'HMeta', index: Ix };
export const HMeta = (index: Ix): HMeta => ({ tag: 'HMeta', index });

export type Elim = EApp;

export type EApp = { tag: 'EApp', right: Val };
export const EApp = (right: Val): EApp => ({ tag: 'EApp', right });

export type Spine = List<Elim>;
export type EnvV = List<Val>;
export type Clos = { env: EnvV, body: Term };
export const Clos = (env: EnvV, body: Term): Clos => ({ env, body });

export type Val = VNe | VAbs | VType | VPi;

export type VNe = { tag: 'VNe', head: Head, spine: Spine };
export const VNe = (head: Head, spine: Spine): VNe => ({ tag: 'VNe', head, spine });
export type VAbs = { tag: 'VAbs', name: Name, type: Val, clos: Clos };
export const VAbs = (name: Name, type: Val, clos: Clos): VAbs => ({ tag: 'VAbs', name, type, clos });
export type VType = { tag: 'VType' };
export const VType: VType = { tag: 'VType' };
export type VPi = { tag: 'VPi', name: Name, type: Val, clos: Clos };
export const VPi = (name: Name, type: Val, clos: Clos): VPi => ({ tag: 'VPi', name, type, clos });

export const VVar = (index: Ix): VNe => VNe(HVar(index), Nil);
export const VMeta = (index: Ix, spine: Spine = Nil): VNe => VNe(HMeta(index), spine);

const cinst = (clos: Clos, arg: Val): Val => evaluate(clos.body, Cons(arg, clos.env));
export const vinst = (val: VAbs | VPi, arg: Val): Val => cinst(val.clos, arg);

export const force = (v: Val): Val => {
  if (v.tag === 'VNe' && v.head.tag === 'HMeta') {
    const val = getMeta(v.head.index);
    if (val.tag === 'Unsolved') return v;
    return force(foldr((elim, y) => vapp(y, elim.right), val.val, v.spine));
  }
  return v;
};

export const vapp = (left: Val, right: Val): Val => {
  if (left.tag === 'VAbs') return vinst(left, right);
  if (left.tag === 'VNe') return VNe(left.head, Cons(EApp(right), left.spine));
  return impossible(`vapp: ${left.tag}`);
};

export const evaluate = (t: Term, vs: EnvV): Val => {
  if (t.tag === 'Type') return VType;
  if (t.tag === 'Abs')
    return VAbs(t.name, evaluate(t.type, vs), Clos(vs, t.body));
  if (t.tag === 'Pi')
    return VPi(t.name, evaluate(t.type, vs), Clos(vs, t.body));
  if (t.tag === 'Meta') {
    const s = getMeta(t.index);
    return s.tag === 'Solved' ? s.val : VMeta(t.index);
  }
  if (t.tag === 'Var') 
    return index(vs, t.index) || impossible(`evaluate: var ${t.index} has no value`);
  if (t.tag === 'App')
    return vapp(evaluate(t.left, vs), evaluate(t.right, vs));
  if (t.tag === 'Let')
    return evaluate(t.body, Cons(evaluate(t.val, vs), vs));
  return t;
};

const quoteHead = (h: Head, k: Ix): Term => {
  if (h.tag === 'HVar') return Var(k - (h.index + 1));
  if (h.tag === 'HMeta') return Meta(h.index);
  return h;
};
const quoteElim = (t: Term, e: Elim, k: Ix): Term => {
  if (e.tag === 'EApp') return App(t, quote(e.right, k));
  return e.tag;
};
export const quote = (v_: Val, k: Ix): Term => {
  const v = force(v_);
  if (v.tag === 'VType') return Type;
  if (v.tag === 'VNe')
    return foldr(
      (x, y) => quoteElim(y, x, k),
      quoteHead(v.head, k),
      v.spine,
    );
  if (v.tag === 'VAbs')
    return Abs(v.name, quote(v.type, k), quote(vinst(v, VVar(k)), k + 1));
  if (v.tag === 'VPi')
    return Pi(v.name, quote(v.type, k), quote(vinst(v, VVar(k)), k + 1));
  return v;
};

export const normalize = (t: Term): Term => quote(evaluate(t, Nil), 0);

type S = [false, Val] | [true, Term];
const zonkSpine = (tm: Term, vs: EnvV, k: Ix): S => {
  if (tm.tag === 'Meta') {
    const s = getMeta(tm.index);
    if (s.tag === 'Unsolved') return [true, zonk(tm, vs, k)];
    return [false, s.val];
  }
  if (tm.tag === 'App') {
    const spine = zonkSpine(tm.left, vs, k);
    return spine[0] ?
      [true, App(spine[1], zonk(tm.right, vs, k))] :
      [false, vapp(spine[1], evaluate(tm.right, vs))];
  }
  return [true, zonk(tm, vs, k)];
};
export const zonk = (tm: Term, vs: EnvV = Nil, k: Ix = 0): Term => {
  if (tm.tag === 'Meta') {
    const s = getMeta(tm.index);
    return s.tag === 'Solved' ? quote(s.val, k) : tm;
  }
  if (tm.tag === 'Pi')
    return Pi(tm.name, zonk(tm.type, vs, k), zonk(tm.body, Cons(VVar(k), vs), k + 1));
  if (tm.tag === 'Let')
    return Let(tm.name, zonk(tm.type, vs, k), zonk(tm.val, vs, k), zonk(tm.body, Cons(VVar(k), vs), k + 1));
  if (tm.tag === 'Abs')
    return Abs(tm.name, zonk(tm.type, vs, k), zonk(tm.body, Cons(VVar(k), vs), k + 1));
  if (tm.tag === 'App') {
    const spine = zonkSpine(tm.left, vs, k);
    return spine[0] ?
      App(spine[1], zonk(tm.right, vs, k)) :
      quote(vapp(spine[1], evaluate(tm.right, vs)), k);
  }
  return tm;
};

export const showVal = (v: Val, k: Ix) => show(quote(v, k));
export const showValZ = (v: Val, vs: EnvV = Nil, k: Ix) => show(zonk(quote(v, k), vs, k));
