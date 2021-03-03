import { MetaVar } from './metas';
import { chooseName, Lvl, Name } from './names';
import { AxiomName } from './axioms';
import { Core, SortType } from './core';
import { cons, List, nil } from './utils/List';
import { impossible } from './utils/utils';
import { quote, Val } from './values';

export type Surface =
  Var | Sort | Axiom | Let |
  Pi | Abs | App |
  Meta | Hole;

export interface Var { readonly tag: 'Var'; readonly name: Name }
export const Var = (name: Name): Var => ({ tag: 'Var', name });
export interface Sort { readonly tag: 'Sort'; readonly sort: SortType }
export const Sort = (sort: SortType): Sort => ({ tag: 'Sort', sort });
export interface Global { readonly tag: 'Global'; readonly name: Name }
export const Global = (name: Name): Global => ({ tag: 'Global', name });
export interface Axiom { readonly tag: 'Axiom'; readonly name: AxiomName }
export const Axiom = (name: AxiomName): Axiom => ({ tag: 'Axiom', name });
export interface Let { readonly tag: 'Let'; readonly erased: boolean; readonly name: Name; readonly type: Surface | null; readonly val: Surface; readonly body: Surface }
export const Let = (erased: boolean, name: Name, type: Surface | null, val: Surface, body: Surface): Let => ({ tag: 'Let', erased, name, type, val, body });
export interface Pi { readonly tag: 'Pi'; readonly erased: boolean; readonly name: Name; readonly type: Surface; readonly body: Surface }
export const Pi = (erased: boolean, name: Name, type: Surface, body: Surface): Pi => ({ tag: 'Pi', erased, name, type, body });
export interface Abs { readonly tag: 'Abs'; readonly erased: boolean; readonly name: Name; readonly type: Surface | null; readonly body: Surface }
export const Abs = (erased: boolean, name: Name, type: Surface | null, body: Surface): Abs => ({ tag: 'Abs', erased, name, type, body });
export interface App { readonly tag: 'App'; readonly fn: Surface; readonly erased: boolean; readonly arg: Surface }
export const App = (fn: Surface, erased: boolean, arg: Surface): App => ({ tag: 'App', fn, erased, arg });
export interface Meta { readonly tag: 'Meta'; readonly id: MetaVar }
export const Meta = (id: MetaVar): Meta => ({ tag: 'Meta', id });
export interface Hole { readonly tag: 'Hole'; readonly name: Name | null }
export const Hole = (name: Name | null): Hole => ({ tag: 'Hole', name });

export const Type = Sort('*');
export const Box = Sort('**');

export const flattenPi = (t: Surface): [[boolean, Name, Surface][], Surface] => {
  const params: [boolean, Name, Surface][] = [];
  let c = t;  
  while (c.tag === 'Pi') {
    params.push([c.erased, c.name, c.type]);
    c = c.body;
  }
  return [params, c];
};
export const flattenAbs = (t: Surface): [[boolean, Name, Surface | null][], Surface] => {
  const params: [boolean, Name, Surface | null][] = [];
  let c = t;  
  while (c.tag === 'Abs') {
    params.push([c.erased, c.name, c.type]);
    c = c.body;
  }
  return [params, c];
};
export const flattenApp = (t: Surface): [Surface, [boolean, Surface][]] => {
  const args: [boolean, Surface][] = [];
  let c = t;  
  while (c.tag === 'App') {
    args.push([c.erased, c.arg]);
    c = c.fn;
  }
  return [c, args.reverse()];
};

const showP = (b: boolean, t: Surface) => b ? `(${show(t)})` : show(t);
const isSimple = (t: Surface) => t.tag === 'Var' || t.tag === 'Axiom' || t.tag === 'Sort' || t.tag === 'Meta';
const showS = (t: Surface) => showP(!isSimple(t), t);
export const show = (t: Surface): string => {
  if (t.tag === 'Var') return `${t.name}`;
  if (t.tag === 'Axiom') return `%${t.name}`;
  if (t.tag === 'Sort') return `${t.sort}`;
  if (t.tag === 'Meta') return `?${t.id}`;
  if (t.tag === 'Hole') return `_${t.name || ''}`;
  if (t.tag === 'Pi') {
    const [params, ret] = flattenPi(t);
    return `${params.map(([e, x, t]) => !e && x === '_' ? showP(t.tag === 'Pi' || t.tag === 'Let', t) : `${e ? '{' : '('}${x} : ${show(t)}${e ? '}' : ')'}`).join(' -> ')} -> ${show(ret)}`;
  }
  if (t.tag === 'Abs') {
    const [params, body] = flattenAbs(t);
    return `\\${params.map(([e, x, t]) => !t ? `${e ? '{' : ''}${x}${e ? '}' : ''}` : `${e ? '{' : '('}${x} : ${show(t)}${e ? '}' : ')'}`).join(' ')}. ${show(body)}`;
  }
  if (t.tag === 'App') {
    const [fn, args] = flattenApp(t);
    return `${showS(fn)} ${args.map(([e, a]) => e ? `{${show(a)}}` : showS(a)).join(' ')}`;
  }
  if (t.tag === 'Let')
    return `let ${t.erased ? '{' : ''}${t.name}${t.erased ? '}' : ''}${!t.type ? '' : ` : ${showP(t.type.tag === 'Let', t.type)}`} = ${showP(t.val.tag === 'Let', t.val)}; ${show(t.body)}`;
  return t;
};

export const toSurface = (t: Core, ns: List<Name> = nil): Surface => {
  if (t.tag === 'Global') return Var(t.name);
  if (t.tag === 'Sort') return Sort(t.sort);
  if (t.tag === 'Axiom') return Axiom(t.name);
  if (t.tag === 'Meta' || t.tag === 'InsertedMeta') return Meta(t.id);
  if (t.tag === 'Var') return Var(ns.index(t.index) || impossible(`var out of range in toSurface: ${t.index}`));
  if (t.tag === 'App') return App(toSurface(t.fn, ns), t.erased, toSurface(t.arg, ns));
  if (t.tag === 'Abs') {
    const x = chooseName(t.name, ns);
    return Abs(t.erased, x, toSurface(t.type, ns), toSurface(t.body, cons(x, ns)));
  }
  if (t.tag === 'Pi') {
    const x = chooseName(t.name, ns);
    return Pi(t.erased, x, toSurface(t.type, ns), toSurface(t.body, cons(x, ns)));
  }
  if (t.tag === 'Let') {
    const x = chooseName(t.name, ns);
    return Let(t.erased, x, toSurface(t.type, ns), toSurface(t.val, ns), toSurface(t.body, cons(x, ns)));
  }
  return t;
};

export const showCore = (t: Core, ns: List<Name> = nil): string => show(toSurface(t, ns));
export const showVal = (v: Val, k: Lvl = 0, full: boolean = false, ns: List<Name> = nil): string => show(toSurface(quote(v, k, full), ns));
