import { config } from './config';
import { Abs, App, Global, Pair, Proj, show, Term, Var } from './erased';
import { getGlobal } from './globals';
import { Ix, Name } from './names';
import { forceLazy, Lazy, lazyOf, mapLazy } from './utils/lazy';
import { Cons, foldr, index, List, Nil } from './utils/list';
import { impossible } from './utils/utils';

export type Elim = EApp | EProj;

export type EApp = { tag: 'EApp', right: Val };
export const EApp = (right: Val): EApp => ({ tag: 'EApp', right });
export type EProj = { tag: 'EProj', proj: 'fst' | 'snd' };
export const EProj = (proj: 'fst' | 'snd'): EProj => ({ tag: 'EProj', proj });

export type Spine = List<Elim>;
export type EnvV = List<Val>;
export type Clos = (val: Val) => Val;

export type Val = VNe | VGlobal | VAbs | VPair;

export type VNe = { tag: 'VNe', head: Ix, spine: Spine };
export const VNe = (head: Ix, spine: Spine): VNe => ({ tag: 'VNe', head, spine });
export type VGlobal = { tag: 'VGlobal', head: Name, args: List<Elim>, val: Lazy<Val> };
export const VGlobal = (head: Name, args: List<Elim>, val: Lazy<Val>): VGlobal => ({ tag: 'VGlobal', head, args, val });
export type VAbs = { tag: 'VAbs', clos: Clos };
export const VAbs = (clos: Clos): VAbs => ({ tag: 'VAbs', clos });
export type VPair = { tag: 'VPair', fst: Val, snd: Val };
export const VPair = (fst: Val, snd: Val): VPair => ({ tag: 'VPair', fst, snd });

export const VVar = (index: Ix, spine: Spine = Nil): VNe => VNe(index, spine);

export const vinst = (val: VAbs, arg: Val): Val => val.clos(arg);

export const forceGlobal = (v: Val): Val => {
  if (v.tag === 'VGlobal') return forceGlobal(forceLazy(v.val));
  return v;
};

export const vapp = (left: Val, right: Val): Val => {
  if (left.tag === 'VAbs') return vinst(left, right);
  if (left.tag === 'VNe') return VNe(left.head, Cons(EApp(right), left.spine));
  if (left.tag === 'VGlobal')
    return VGlobal(left.head, Cons(EApp(right), left.args), mapLazy(left.val, v => vapp(v, right)));
  return impossible(`vapp: ${left.tag}`);
};
export const vapps = (a: Val[]): Val => a.reduce(vapp);

export const vproj = (proj: 'fst' | 'snd', v: Val): Val => {
  if (v.tag === 'VPair') return proj === 'fst' ? v.fst : v.snd;
  if (v.tag === 'VNe') return VNe(v.head, Cons(EProj(proj), v.spine));
  if (v.tag === 'VGlobal')
    return VGlobal(v.head, Cons(EProj(proj), v.args), mapLazy(v.val, v => vproj(proj, v)));
  return impossible(`vproj: ${v.tag}`);
};

export const evaluate = (t: Term, vs: EnvV): Val => {
  if (t.tag === 'Abs')
    return VAbs(v => evaluate(t.body, Cons(v, vs)));
  if (t.tag === 'Pair')
    return VPair(evaluate(t.fst, vs), evaluate(t.snd, vs));
  if (t.tag === 'Var') 
    return index(vs, t.index) || impossible(`evaluate: var ${t.index} has no value`);
  if (t.tag === 'Global') {
    const entry = getGlobal(t.name) || impossible(`evaluate: global ${t.name} has no value`);
    return VGlobal(t.name, Nil, lazyOf(entry.valerased));
  }
  if (t.tag === 'App')
    return vapp(evaluate(t.left, vs), evaluate(t.right, vs));
  if (t.tag === 'Let')
    return evaluate(t.body, Cons(evaluate(t.val, vs), vs));
  if (t.tag === 'Proj')
    return vproj(t.proj, evaluate(t.term, vs));
  return t;
};

const quoteHead = (h: Ix, k: Ix): Term => Var(k - (h + 1));
const quoteElim = (t: Term, e: Elim, k: Ix, full: boolean): Term => {
  if (e.tag === 'EApp') return App(t, quote(e.right, k, full));
  if (e.tag === 'EProj') return Proj(e.proj, t);
  return e;
};
export const quote = (v: Val, k: Ix, full: boolean = false): Term => {
  if (v.tag === 'VNe')
    return foldr(
      (x, y) => quoteElim(y, x, k, full),
      quoteHead(v.head, k),
      v.spine,
    );
  if (v.tag === 'VGlobal') {
    if (full || config.unfold.includes(v.head)) return quote(forceLazy(v.val), k, full);
    return foldr(
      (x, y) => quoteElim(y, x, k, full),
      Global(v.head) as Term,
      v.args,
    );
  }
  if (v.tag === 'VPair')
    return Pair(quote(v.fst, k, full), quote(v.snd, k, full));
  if (v.tag === 'VAbs')
    return Abs(quote(vinst(v, VVar(k)), k + 1, full));
  return v;
};

export const normalize = (t: Term, full: boolean = false): Term => quote(evaluate(t, Nil), 0, full);

export const showVal = (v: Val, k: Ix = 0, full: boolean = false) => show(quote(v, k, full));
