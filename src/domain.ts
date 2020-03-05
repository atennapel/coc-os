import { Ix, Name } from './names';
import { List, Cons, Nil, listToString, index, foldr } from './utils/list';
import { Term, showTerm, Type, Var, App, Abs, Pi, Global, showSurface } from './syntax';
import { impossible } from './utils/util';
import { globalGet } from './globalenv';
import { Lazy, mapLazy, forceLazy } from './utils/lazy';
import { Plicity } from './surface';

export type Head = HVar | HGlobal;

export type HVar = { tag: 'HVar', index: Ix };
export const HVar = (index: Ix): HVar => ({ tag: 'HVar', index });
export type HGlobal = { tag: 'HGlobal', name: Name };
export const HGlobal = (name: Name): HGlobal => ({ tag: 'HGlobal', name });

export type Elim = EApp;

export type EApp = { tag: 'EApp', plicity: Plicity, arg: Val };
export const EApp = (plicity: Plicity, arg: Val): EApp => ({ tag: 'EApp', plicity, arg });

export type Clos = (val: Val) => Val;
export type Val = VNe | VGlued | VAbs | VPi | VType;

export type VNe = { tag: 'VNe', head: Head, args: List<Elim>, eargs: List<Val> };
export const VNe = (head: Head, args: List<Elim>, eargs: List<Val>): VNe => ({ tag: 'VNe', head, args, eargs });
export type VGlued = { tag: 'VGlued', head: Head, args: List<Elim>, eargs: List<Val>, val: Lazy<Val> };
export const VGlued = (head: Head, args: List<Elim>, eargs: List<Val>, val: Lazy<Val>): VGlued => ({ tag: 'VGlued', head, args, eargs, val });
export type VAbs = { tag: 'VAbs', plicity: Plicity, name: Name, type: Val, body: Clos };
export const VAbs = (plicity: Plicity, name: Name, type: Val, body: Clos): VAbs => ({ tag: 'VAbs', name, plicity, type, body});
export type VPi = { tag: 'VPi', plicity: Plicity, name: Name, type: Val, body: Clos };
export const VPi = (plicity: Plicity, name: Name, type: Val, body: Clos): VPi => ({ tag: 'VPi', name, plicity, type, body});
export type VType = { tag: 'VType' };
export const VType: VType = { tag: 'VType' };

export const VVar = (index: Ix): VNe => VNe(HVar(index), Nil, Nil);
export const VGlobal = (name: Name): VNe => VNe(HGlobal(name), Nil, Nil);

export type EnvV = List<Val>;
export const extendV = (vs: EnvV, val: Val): EnvV => Cons(val, vs);
export const showEnvV = (l: EnvV, k: Ix = 0, full: boolean = false): string => listToString(l, v => showTerm(quote(v, k, full)));

export const force = (v: Val): Val => {
  if (v.tag === 'VGlued') return force(forceLazy(v.val));
  return v;
};

export const vapp = (a: Val, plicity: Plicity, b: Val): Val => {
  if (a.tag === 'VAbs') {
    if (a.plicity !== plicity)
      return impossible(`vapp VAbs plicity mismatch: ${showTermQ(a, 0, false)} ${plicity ? '-' : ''}@ ${showTermQ(b, 0, false)}`);
    return a.body(b);
  }
  if (a.tag === 'VNe') return VNe(a.head, Cons(EApp(plicity, b), a.args), plicity ? a.eargs : Cons(b, a.eargs));
  if (a.tag === 'VGlued')
    return VGlued(a.head, Cons(EApp(plicity, b), a.args), plicity ? a.eargs : Cons(b, a.eargs), mapLazy(a.val, v => vapp(v, plicity, b)));
  return impossible(`vapp: ${a.tag}`);
};

export const evaluate = (t: Term, vs: EnvV = Nil): Val => {
  if (t.tag === 'Type') return VType;
  if (t.tag === 'Var') {
    const v = index(vs, t.index) || impossible(`evaluate: var ${t.index} has no value`);
    return VGlued(HVar(t.index), Nil, Nil, Lazy(() => v));
  }
  if (t.tag === 'Global') {
    const entry = globalGet(t.name) || impossible(`evaluate: global ${t.name} has no value`);
    return VGlued(HGlobal(t.name), Nil, Nil, Lazy(() => entry.val));
  }
  if (t.tag === 'App')
    return vapp(evaluate(t.left, vs), t.plicity, evaluate(t.right, vs));
  if (t.tag === 'Abs' && t.type)
    return VAbs(t.plicity, t.name, evaluate(t.type, vs), v => evaluate(t.body, extendV(vs, v)));
  if (t.tag === 'Let')
    return evaluate(t.body, extendV(vs, evaluate(t.val, vs)));
  if (t.tag === 'Pi')
    return VPi(t.plicity, t.name, evaluate(t.type, vs), v => evaluate(t.body, extendV(vs, v)));
  return impossible(`cannot evaluate: ${showTerm(t)}`);
};

const quoteHead = (h: Head, k: Ix): Term => {
  if (h.tag === 'HVar') return Var(k - (h.index + 1));
  if (h.tag === 'HGlobal') return Global(h.name);
  return h;
};
const quoteElim = (t: Term, e: Elim, k: Ix, full: boolean): Term => {
  if (e.tag === 'EApp') return App(t, e.plicity, quote(e.arg, k, full));
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
  if (v.tag === 'VAbs')
    return Abs(v.plicity, v.name, quote(v.type, k, full), quote(v.body(VVar(k)), k + 1, full));
  if (v.tag === 'VPi')
    return Pi(v.plicity, v.name, quote(v.type, k, full), quote(v.body(VVar(k)), k + 1, full));
  return v;
};

export const normalize = (t: Term, vs: EnvV, k: Ix, full: boolean): Term =>
  quote(evaluate(t, vs), k, full);

export const showTermQ = (v: Val, k: number = 0, full: boolean = false): string => showTerm(quote(v, k, full));
export const showTermU = (v: Val, ns: List<Name> = Nil, k: number = 0, full: boolean = false): string =>
  showSurface(quote(v, k, full), ns);
export const showElimU = (e: Elim, ns: List<Name> = Nil, k: number = 0, full: boolean = false): string => {
  if (e.tag === 'EApp') return `${e.plicity ? '{' : ''}${showTermU(e.arg, ns, k, full)}${e.plicity ? '}' : ''}`;
  return e.tag;
};
