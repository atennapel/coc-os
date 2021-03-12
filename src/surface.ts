import { MetaVar } from './metas';
import { chooseName, Ix, Lvl, Name } from './names';
import { Core } from './core';
import { cons, List, nil } from './utils/List';
import { impossible } from './utils/utils';
import { quote, Val } from './values';

export type Surface =
  Var | Type | Let |
  Pi | Abs | App |
  Sigma |
  Enum | EnumLit | ElimEnum |
  Meta | Hole;

export interface Var { readonly tag: 'Var'; readonly name: Name; readonly lift: Ix }
export const Var = (name: Name, lift: Ix): Var => ({ tag: 'Var', name, lift });
export interface Type { readonly tag: 'Type'; readonly index: Ix }
export const Type = (index: Ix): Type => ({ tag: 'Type', index });
export interface Let { readonly tag: 'Let'; readonly erased: boolean; readonly name: Name; readonly type: Surface | null; readonly val: Surface; readonly body: Surface }
export const Let = (erased: boolean, name: Name, type: Surface | null, val: Surface, body: Surface): Let => ({ tag: 'Let', erased, name, type, val, body });
export interface Pi { readonly tag: 'Pi'; readonly erased: boolean; readonly name: Name; readonly type: Surface; readonly body: Surface }
export const Pi = (erased: boolean, name: Name, type: Surface, body: Surface): Pi => ({ tag: 'Pi', erased, name, type, body });
export interface Abs { readonly tag: 'Abs'; readonly erased: boolean; readonly name: Name; readonly type: Surface | null; readonly body: Surface }
export const Abs = (erased: boolean, name: Name, type: Surface | null, body: Surface): Abs => ({ tag: 'Abs', erased, name, type, body });
export interface App { readonly tag: 'App'; readonly fn: Surface; readonly erased: boolean; readonly arg: Surface }
export const App = (fn: Surface, erased: boolean, arg: Surface): App => ({ tag: 'App', fn, erased, arg });
export interface Sigma { readonly tag: 'Sigma'; readonly erased: boolean; readonly name: Name; readonly type: Surface; readonly body: Surface }
export const Sigma = (erased: boolean, name: Name, type: Surface, body: Surface): Sigma => ({ tag: 'Sigma', erased, name, type, body });
export interface Enum { readonly tag: 'Enum'; readonly num: Ix; readonly lift: Ix | null }
export const Enum = (num: Ix, lift: Ix | null): Enum => ({ tag: 'Enum', num, lift });
export interface ElimEnum { readonly tag: 'ElimEnum'; readonly num: Ix; readonly lift: Ix | null; readonly motive: Surface | null; readonly scrut: Surface; readonly cases: Surface[] }
export const ElimEnum = (num: Ix, lift: Ix | null, motive: Surface | null, scrut: Surface, cases: Surface[]): ElimEnum => ({ tag: 'ElimEnum', num, lift, motive, scrut, cases });
export interface EnumLit { readonly tag: 'EnumLit'; readonly val: Ix; readonly num: Ix | null; readonly lift: Ix | null }
export const EnumLit = (val: Ix, num: Ix | null, lift: Ix | null): EnumLit => ({ tag: 'EnumLit', val, num, lift });
export interface Meta { readonly tag: 'Meta'; readonly id: MetaVar }
export const Meta = (id: MetaVar): Meta => ({ tag: 'Meta', id });
export interface Hole { readonly tag: 'Hole'; readonly name: Name | null }
export const Hole = (name: Name | null): Hole => ({ tag: 'Hole', name });

export const flattenPi = (t: Surface): [[boolean, Name, Surface][], Surface] => {
  const params: [boolean, Name, Surface][] = [];
  let c = t;  
  while (c.tag === 'Pi') {
    params.push([c.erased, c.name, c.type]);
    c = c.body;
  }
  return [params, c];
};
export const flattenSigma = (t: Surface): [[boolean, Name, Surface][], Surface] => {
  const params: [boolean, Name, Surface][] = [];
  let c = t;  
  while (c.tag === 'Sigma') {
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
const isSimple = (t: Surface) => t.tag === 'Var' || t.tag === 'Meta' || t.tag === 'Type' || t.tag === 'Enum' || t.tag === 'EnumLit' || t.tag === 'Hole';
const showS = (t: Surface) => showP(!isSimple(t), t);
export const show = (t: Surface): string => {
  if (t.tag === 'Var') return `${t.name}${t.lift === 0 ? '' : t.lift === 1 ? '^' : `^${t.lift}`}`;
  if (t.tag === 'Type') return `*${t.index > 0 ? t.index : ''}`;
  if (t.tag === 'Meta') return `?${t.id}`;
  if (t.tag === 'Hole') return `_${t.name || ''}`;
  if (t.tag === 'Enum') return `#${t.num}${t.lift === null ? '' : t.lift === 0 ? '' : t.lift === 1 ? '^' : `^${t.lift}`}`;
  if (t.tag === 'ElimEnum') return `?${t.num}${t.lift === null ? '' : t.lift === 0 ? '' : t.lift === 1 ? '^' : `^${t.lift}`}${t.motive ? ` {${show(t.motive)}}`: ''} ${showS(t.scrut)}${t.cases.length > 0 ? ' ' : ''}${t.cases.map(showS).join(' ')}`;
  if (t.tag === 'EnumLit') return `@${t.val}${t.num === null ? '' : `/${t.num}`}${t.lift === null ? '' : t.lift === 0 ? '' : t.lift === 1 ? '^' : `^${t.lift}`}`;
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
  if (t.tag === 'Sigma') {
    const [params, ret] = flattenSigma(t);
    return `${params.map(([e, x, t]) => !e && x === '_' ? showP(t.tag === 'Sigma' || t.tag === 'Let', t) : `${e ? '{' : '('}${x} : ${show(t)}${e ? '}' : ')'}`).join(' ** ')} ** ${show(ret)}`;
  }
  if (t.tag === 'Let')
    return `let ${t.erased ? '{' : ''}${t.name}${t.erased ? '}' : ''}${!t.type ? '' : ` : ${showP(t.type.tag === 'Let', t.type)}`} = ${showP(t.val.tag === 'Let', t.val)}; ${show(t.body)}`;
  return t;
};

export const toSurface = (t: Core, ns: List<Name> = nil): Surface => {
  if (t.tag === 'Global') return Var(t.name, t.lift);
  if (t.tag === 'Type') return Type(t.index);
  if (t.tag === 'Enum') return Enum(t.num, t.lift);
  if (t.tag === 'ElimEnum') return ElimEnum(t.num, t.lift, toSurface(t.motive, ns), toSurface(t.scrut, ns), t.cases.map(x => toSurface(x, ns)));
  if (t.tag === 'EnumLit') return EnumLit(t.val, t.num, t.lift);
  if (t.tag === 'Meta' || t.tag === 'InsertedMeta') return Meta(t.id);
  if (t.tag === 'Var') return Var(ns.index(t.index) || impossible(`var out of range in toSurface: ${t.index}`), 0);
  if (t.tag === 'App') return App(toSurface(t.fn, ns), t.erased, toSurface(t.arg, ns));
  if (t.tag === 'Abs') {
    const x = chooseName(t.name, ns);
    return Abs(t.erased, x, toSurface(t.type, ns), toSurface(t.body, cons(x, ns)));
  }
  if (t.tag === 'Pi') {
    const x = chooseName(t.name, ns);
    return Pi(t.erased, x, toSurface(t.type, ns), toSurface(t.body, cons(x, ns)));
  }
  if (t.tag === 'Sigma') {
    const x = chooseName(t.name, ns);
    return Sigma(t.erased, x, toSurface(t.type, ns), toSurface(t.body, cons(x, ns)));
  }
  if (t.tag === 'Let') {
    const x = chooseName(t.name, ns);
    return Let(t.erased, x, toSurface(t.type, ns), toSurface(t.val, ns), toSurface(t.body, cons(x, ns)));
  }
  return t;
};

export const showCore = (t: Core, ns: List<Name> = nil): string => show(toSurface(t, ns));
export const showVal = (v: Val, k: Lvl = 0, full: boolean = false, ns: List<Name> = nil): string => show(toSurface(quote(v, k, full), ns));

export type Def = DDef;

export interface DDef { readonly tag: 'DDef'; readonly erased: boolean; readonly name: Name; readonly value: Surface }
export const DDef = (erased: boolean, name: Name, value: Surface): DDef => ({ tag: 'DDef', erased, name, value });

export const showDef = (d: Def): string => {
  if (d.tag === 'DDef') return `def ${d.erased ? '{' : ''}${d.name}${d.erased ? '}' : ''} = ${show(d.value)}`;
  return d.tag;
};
export const showDefs = (ds: Def[]): string => ds.map(showDef).join('\n');
