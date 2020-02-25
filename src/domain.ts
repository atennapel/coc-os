import { Name, Ix } from './names';
import { List, Nil, Cons, listToString, index, foldr } from './utils/list';
import { Lazy, mapLazy, forceLazy } from './utils/lazy';
import { Plicity, showTerm as surfaceShowterm } from './surface';
import { showTerm, Term, Var, Global, App, Type, Abs, Pi, toSurface } from './syntax';
import { impossible } from './utils/util';
import { globalGet } from './globalenv';

export type Head = HVar | HGlobal;

export type HVar = { tag: 'HVar', index: Ix };
export const HVar = (index: Ix): HVar => ({ tag: 'HVar', index });
export type HGlobal = { tag: 'HGlobal', name: Name };
export const HGlobal = (name: Name): HGlobal => ({ tag: 'HGlobal', name });

export type Elim = EApp;

export type EApp = { tag: 'EApp', arg: Val };
export const EApp = (arg: Val): EApp => ({ tag: 'EApp', arg });

export type Clos = (val: Val) => Val;
export type Val = VNe | VGlued | VAbs | VPi | VType;

export type VNe = { tag: 'VNe', head: Head, args: List<Elim> };
export const VNe = (head: Head, args: List<Elim>): VNe => ({ tag: 'VNe', head, args });
export type VGlued = { tag: 'VGlued', head: Head, args: List<Elim>, val: Lazy<Val> };
export const VGlued = (head: Head, args: List<Elim>, val: Lazy<Val>): VGlued => ({ tag: 'VGlued', head, args, val });
export type VAbs = { tag: 'VAbs', name: Name, body: Clos };
export const VAbs = (name: Name, body: Clos): VAbs => ({ tag: 'VAbs', name, body});
export type VPi = { tag: 'VPi', plicity: Plicity, name: Name, type: Val, body: Clos };
export const VPi = (plicity: Plicity, name: Name, type: Val, body: Clos): VPi => ({ tag: 'VPi', name, plicity, type, body});
export type VType = { tag: 'VType' };
export const VType: VType = { tag: 'VType' };

export const VVar = (index: Ix): VNe => VNe(HVar(index), Nil);
export const VGlobal = (name: Name): VNe => VNe(HGlobal(name), Nil);

export type EnvV = List<Val>;
export const extendV = (vs: EnvV, val: Val): EnvV => Cons(val, vs);
export const showEnvV = (l: EnvV, k: Ix = 0, full: boolean = false): string =>
  listToString(l, v => showTerm(quote(v, k, full)));

export const force = (v: Val): Val => {
  if (v.tag === 'VGlued') return force(forceLazy(v.val));
  return v;
};

export const vapp = (a: Val, b: Val): Val => {
  if (a.tag === 'VAbs') return a.body(b);
  if (a.tag === 'VNe') return VNe(a.head, Cons(EApp(b), a.args));
  if (a.tag === 'VGlued') return VGlued(a.head, Cons(EApp(b), a.args), mapLazy(a.val, v => vapp(v, b)));
  return impossible(`vapp: ${a.tag}`);
};

export const evaluate = (t: Term, vs: EnvV): Val => {
  if (t.tag === 'Type') return VType;
  if (t.tag === 'Var') return index(vs, t.index) || impossible(`evaluate: var ${t.index} has no value`);
  if (t.tag === 'Global') {
    const entry = globalGet(t.name) || impossible(`evaluate: global ${t.name} has no value`);
    return VGlued(HGlobal(t.name), Nil, Lazy(() => entry.val));
  }
  if (t.tag === 'App')
    return t.plicity ? evaluate(t.left, vs) : vapp(evaluate(t.left, vs), evaluate(t.right, vs));
  if (t.tag === 'Abs')
    return t.plicity ? evaluate(t.body, extendV(vs, VVar(-1))) :
      VAbs(t.name, v => evaluate(t.body, extendV(vs, v)));
  if (t.tag === 'Let')
    return t.plicity ? evaluate(t.body, extendV(vs, VVar(-1))) : evaluate(t.body, extendV(vs, evaluate(t.val, vs)));
  if (t.tag === 'Pi')
    return VPi(t.plicity, t.name, evaluate(t.type, vs), v => evaluate(t.body, extendV(vs, v)));
  if (t.tag === 'Ann') return evaluate(t.term, vs);
  return t;
};

const quoteHead = (h: Head, k: Ix): Term => {
  if (h.tag === 'HVar') return Var(k - (h.index + 1));
  if (h.tag === 'HGlobal') return Global(h.name);
  return h;
};
const quoteElim = (t: Term, e: Elim, k: Ix, full: boolean): Term => {
  if (e.tag === 'EApp') return App(t, false, quote(e.arg, k, full));
  return e.tag;
};
export const quote = (v: Val, k: Ix, full: boolean): Term => {
  if (v.tag === 'VType') return Type;
  if (v.tag === 'VNe')
    return foldr(
      (x, y) => quoteElim(y, x, k, full),
      quoteHead(v.head, k),
      v.args,
    );
  if (v.tag === 'VGlued')
    return full ? quote(forceLazy(v.val), k, full) : foldr(
      (x, y) => quoteElim(y, x, k, full),
      quoteHead(v.head, k),
      v.args,
    );
  if (v.tag === 'VAbs') return Abs(false, v.name, null, quote(v.body(VVar(k)), k + 1, full));
  if (v.tag === 'VPi') return Pi(v.plicity, v.name, quote(v.type, k, full), quote(v.body(VVar(k)), k + 1, full));
  return v;
};

export const normalize = (t: Term, vs: EnvV, k: Ix, full: boolean): Term =>
  quote(evaluate(t, vs), k, full);

export const showTermQ = (v: Val, k: number = 0, full: boolean = false): string => showTerm(quote(v, k, full));
export const showTermU = (v: Val, ns: List<Name> = Nil, k: number = 0, full: boolean = false): string =>
  surfaceShowterm(toSurface(quote(v, k, full), ns));
export const showElimU = (e: Elim, ns: List<Name> = Nil, k: number = 0, full: boolean = false): string => {
  if (e.tag === 'EApp') return showTermU(e.arg, ns, k, full);
  return e.tag;
};
