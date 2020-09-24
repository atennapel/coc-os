import { Abs, App, Pi, show, Term, Type, Var } from './core';
import { Ix, Name } from './names';
import { Cons, foldr, index, List, Nil } from './utils/list';
import { impossible } from './utils/utils';

export type Head = Ix;

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

export const VVar = (index: Ix): VNe => VNe(index, Nil);

const cinst = (clos: Clos, arg: Val): Val => evaluate(clos.body, Cons(arg, clos.env));
export const vinst = (val: VAbs | VPi, arg: Val): Val => cinst(val.clos, arg);

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
  if (t.tag === 'Var') 
    return index(vs, t.index) || impossible(`evaluate: var ${t.index} has no value`);
  if (t.tag === 'App')
    return vapp(evaluate(t.left, vs), evaluate(t.right, vs));
  if (t.tag === 'Let')
    return evaluate(t.body, Cons(evaluate(t.val, vs), vs));
  return t;
};

const quoteHead = (h: Head, k: Ix): Term => Var(k - (h + 1));
const quoteElim = (t: Term, e: Elim, k: Ix): Term => {
  if (e.tag === 'EApp') return App(t, quote(e.right, k));
  return e.tag;
};
export const quote = (v: Val, k: Ix): Term => {
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

export const showV = (v: Val, k: Ix) => show(quote(v, k));
