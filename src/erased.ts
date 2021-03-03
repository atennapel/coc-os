import { eraseAxiom } from './axioms';
import { Core } from './core';
import { getGlobal } from './globals';
import { Ix, Lvl, Name } from './names';
import { Lazy } from './utils/Lazy';
import { cons, List, nil } from './utils/List';
import { impossible } from './utils/utils';

export type Erased = Var | Global | Abs | App;

export interface Var { readonly tag: 'Var'; readonly index: Ix }
export const Var = (index: Ix): Var => ({ tag: 'Var', index });
export interface Global { readonly tag: 'Global'; readonly name: Name }
export const Global = (name: Name): Global => ({ tag: 'Global', name });
export interface Abs { readonly tag: 'Abs'; readonly body: Erased }
export const Abs = (body: Erased): Abs => ({ tag: 'Abs', body });
export interface App { readonly tag: 'App'; readonly fn: Erased; readonly arg: Erased }
export const App = (fn: Erased, arg: Erased): App => ({ tag: 'App', fn, arg });

export const idTerm: Erased = Abs(Var(0));

export const flattenApp = (t: Erased): [Erased, Erased[]] => {
  const args: Erased[] = [];
  let c = t;  
  while (c.tag === 'App') {
    args.push(c.arg);
    c = c.fn;
  }
  return [c, args.reverse()];
};

const showP = (b: boolean, t: Erased) => b ? `(${show(t)})` : show(t);
const isSimple = (t: Erased) => t.tag === 'Var' || t.tag === 'Global';
const showS = (t: Erased) => showP(!isSimple(t), t);
export const show = (t: Erased): string => {
  if (t.tag === 'Var') return `'${t.index}`;
  if (t.tag === 'Global') return `${t.name}`;
  if (t.tag === 'Abs') return `\\${show(t.body)}`;
  if (t.tag === 'App') {
    const [fn, args] = flattenApp(t);
    return `${showS(fn)} ${args.map(showS).join(' ')}`;
  }
  return t;
};

export const shift = (d: Ix, c: Ix, t: Erased): Erased => {
  if (t.tag === 'Var') return t.index < c ? t : Var(t.index + d);
  if (t.tag === 'App') return App(shift(d, c, t.fn), shift(d, c, t.arg));
  if (t.tag === 'Abs') return Abs(shift(d, c + 1, t.body));
  return t;
};

export const substVar = (j: Ix, s: Erased, t: Erased): Erased => {
  if (t.tag === 'Var') return t.index === j ? s : t;
  if (t.tag === 'App') return App(substVar(j, s, t.fn), substVar(j, s, t.arg));
  if (t.tag === 'Abs') return Abs(substVar(j + 1, shift(1, 0, s), t.body));
  return t;
};

export const subst = (t: Erased, u: Erased): Erased => shift(-1, 0, substVar(0, shift(1, 0, u), t));

export const erase = (t: Core): Erased => {
  if (t.tag === 'Abs') return t.erased ? shift(-1, 0, erase(t.body)) : Abs(erase(t.body));
  if (t.tag === 'App') return t.erased ? erase(t.fn) : App(erase(t.fn), erase(t.arg));
  if (t.tag === 'Axiom') return eraseAxiom(t.name);
  if (t.tag === 'Global') return Global(t.name);
  if (t.tag === 'Let') return t.erased ? shift(-1, 0, erase(t.body)) : App(Abs(erase(t.body)), erase(t.val));
  if (t.tag === 'Var') return Var(t.index);
  return impossible(`cannot erase ${t.tag}`);
};

// normalization
export type Spine = List<Val>;
export type EnvV = List<Val>;
export type Clos = (val: Val) => Val;

export type Val = VRigid | VGlobal | VAbs;

export interface VRigid { readonly tag: 'VRigid'; readonly head: Lvl; readonly spine: Spine }
export const VRigid = (head: Lvl, spine: Spine): VRigid => ({ tag: 'VRigid', head, spine });
export interface VGlobal { readonly tag: 'VGlobal'; readonly name: Name; readonly spine: Spine; readonly val: Lazy<Val> };
export const VGlobal = (name: Name, spine: Spine, val: Lazy<Val>): VGlobal => ({ tag: 'VGlobal', name, spine, val });
export interface VAbs { readonly tag: 'VAbs'; readonly clos: Clos }
export const VAbs = (clos: Clos): VAbs => ({ tag: 'VAbs', clos });

export type ValWithClosure = Val & { tag: 'VAbs' };
export const vinst = (val: ValWithClosure, arg: Val): Val => val.clos(arg);

export const VVar = (level: Lvl, spine: Spine = nil): Val => VRigid(level, spine);

export const force = (v: Val): Val => {
  if (v.tag === 'VGlobal') return force(v.val.get());
  return v;
};

export const vappSpine = (t: Val, sp: Spine): Val => sp.foldr((x, y) => vapp(y, x), t);

export const vapp = (left: Val, right: Val): Val => {
  if (left.tag === 'VAbs') return vinst(left, right);
  if (left.tag === 'VRigid') return VRigid(left.head, cons(right, left.spine));
  if (left.tag === 'VGlobal') return VGlobal(left.name, cons(right, left.spine), left.val.map(v => vapp(v, right)));
  return left;
};

export const evaluate = (t: Erased, vs: EnvV): Val => {
  if (t.tag === 'Abs') return VAbs(v => evaluate(t.body, cons(v, vs)));
  if (t.tag === 'Var') return vs.index(t.index) || impossible(`evaluate: var ${t.index} has no value`);
  if (t.tag === 'App') return vapp(evaluate(t.fn, vs), evaluate(t.arg, vs));
  if (t.tag === 'Global') {
    const entry = getGlobal(t.name);
    if (!entry || !entry.erasedTerm) return impossible(`tried to load undefined global ${t.name}`);
    const val = entry.erasedTerm[1];
    return VGlobal(t.name, nil, Lazy.of(val));
  }
  return t;
};

const quoteElim = (t: Erased, e: Val, k: Lvl, full: boolean): Erased => App(t, quote(e, k, full));
export const quote = (v: Val, k: Lvl, full: boolean = false): Erased => {
  if (v.tag === 'VRigid')
    return v.spine.foldr(
      (x, y) => quoteElim(y, x, k, full),
      Var(k - (v.head + 1)) as Erased,
    );
  if (v.tag === 'VGlobal') {
    if (full) return quote(v.val.get(), k, full);
    return v.spine.foldr(
      (x, y) => quoteElim(y, x, k, full),
      Global(v.name) as Erased,
    );
  }
  if (v.tag === 'VAbs') return Abs(quote(vinst(v, VVar(k)), k + 1, full));
  return v;
};

export const normalize = (t: Erased, k: Lvl = 0, vs: EnvV = nil, full: boolean = false): Erased => quote(evaluate(t, vs), k, full);
