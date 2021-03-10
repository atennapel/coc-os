import { MetaVar } from './metas';
import { Ix, Name } from './names';
import { List } from './utils/List';

export type Core =
  Var | Global | Type | Let |
  Pi | Abs | App |
  Meta | InsertedMeta;

export interface Var { readonly tag: 'Var'; readonly index: Ix }
export const Var = (index: Ix): Var => ({ tag: 'Var', index });
export interface Type { readonly tag: 'Type' }
export const Type: Type = { tag: 'Type' };
export interface Global { readonly tag: 'Global'; readonly name: Name }
export const Global = (name: Name): Global => ({ tag: 'Global', name });
export interface Let { readonly tag: 'Let'; readonly erased: boolean; readonly name: Name; readonly type: Core; readonly val: Core; readonly body: Core }
export const Let = (erased: boolean, name: Name, type: Core, val: Core, body: Core): Let => ({ tag: 'Let', erased, name, type, val, body });
export interface Pi { readonly tag: 'Pi'; readonly erased: boolean; readonly name: Name; readonly type: Core; readonly body: Core }
export const Pi = (erased: boolean, name: Name, type: Core, body: Core): Pi => ({ tag: 'Pi', erased, name, type, body });
export interface Abs { readonly tag: 'Abs'; readonly erased: boolean; readonly name: Name; readonly type: Core; readonly body: Core }
export const Abs = (erased: boolean, name: Name, type: Core, body: Core): Abs => ({ tag: 'Abs', erased, name, type, body });
export interface App { readonly tag: 'App'; readonly fn: Core; readonly erased: boolean; readonly arg: Core }
export const App = (fn: Core, erased: boolean, arg: Core): App => ({ tag: 'App', fn, erased, arg });
export interface Meta { readonly tag: 'Meta'; readonly id: MetaVar }
export const Meta = (id: MetaVar): Meta => ({ tag: 'Meta', id });
export interface InsertedMeta { readonly tag: 'InsertedMeta'; readonly id: MetaVar; readonly spine: List<boolean> }
export const InsertedMeta = (id: MetaVar, spine: List<boolean>): InsertedMeta => ({ tag: 'InsertedMeta', id, spine });

export const flattenPi = (t: Core): [[boolean, Name, Core][], Core] => {
  const params: [boolean, Name, Core][] = [];
  let c = t;  
  while (c.tag === 'Pi') {
    params.push([c.erased, c.name, c.type]);
    c = c.body;
  }
  return [params, c];
};
export const flattenAbs = (t: Core): [[boolean, Name, Core][], Core] => {
  const params: [boolean, Name, Core][] = [];
  let c = t;  
  while (c.tag === 'Abs') {
    params.push([c.erased, c.name, c.type]);
    c = c.body;
  }
  return [params, c];
};
export const flattenApp = (t: Core): [Core, [boolean, Core][]] => {
  const args: [boolean, Core][] = [];
  let c = t;  
  while (c.tag === 'App') {
    args.push([c.erased, c.arg]);
    c = c.fn;
  }
  return [c, args.reverse()];
};

const showP = (b: boolean, t: Core) => b ? `(${show(t)})` : show(t);
const isSimple = (t: Core) => t.tag === 'Var' || t.tag === 'Global' || t.tag === 'Type' || t.tag === 'Meta' || t.tag === 'InsertedMeta';
const showS = (t: Core) => showP(!isSimple(t), t);
export const show = (t: Core): string => {
  if (t.tag === 'Var') return `'${t.index}`;
  if (t.tag === 'Global') return `${t.name}`;
  if (t.tag === 'Type') return `*`;
  if (t.tag === 'Meta') return `?${t.id}`;
  if (t.tag === 'InsertedMeta') return `?*${t.id}`;
  if (t.tag === 'Pi') {
    const [params, ret] = flattenPi(t);
    return `${params.map(([e, x, t]) => !e && x === '_' ? showP(t.tag === 'Pi' || t.tag === 'Let', t) : `${e ? '{' : '('}${x} : ${show(t)}${e ? '}' : ')'}`).join(' -> ')} -> ${show(ret)}`;
  }
  if (t.tag === 'Abs') {
    const [params, body] = flattenAbs(t);
    return `\\${params.map(([e, x, t]) => `${e ? '{' : '('}${x} : ${show(t)}${e ? '}' : ')'}`).join(' ')}. ${show(body)}`;
  }
  if (t.tag === 'App') {
    const [fn, args] = flattenApp(t);
    return `${showS(fn)} ${args.map(([e, a]) => e ? `{${show(a)}}` : showS(a)).join(' ')}`;
  }
  if (t.tag === 'Let')
    return `let ${t.erased ? '{' : ''}${t.name}${t.erased ? '}' : ''} : ${showP(t.type.tag === 'Let', t.type)} = ${showP(t.val.tag === 'Let', t.val)}; ${show(t.body)}`;
  return t;
};

export const shift = (d: Ix, c: Ix, t: Core): Core => {
  if (t.tag === 'Var') return t.index < c ? t : Var(t.index + d);
  if (t.tag === 'App') return App(shift(d, c, t.fn), t.erased, shift(d, c, t.arg));
  if (t.tag === 'Abs') return Abs(t.erased, t.name, shift(d, c, t.type), shift(d, c + 1, t.body));
  if (t.tag === 'Let') return Let(t.erased, t.name, shift(d, c, t.type), shift(d, c, t.val), shift(d, c + 1, t.body));
  if (t.tag === 'Pi') return Pi(t.erased, t.name, shift(d, c, t.type), shift(d, c + 1, t.body));
  return t;
};

export const substVar = (j: Ix, s: Core, t: Core): Core => {
  if (t.tag === 'Var') return t.index === j ? s : t;
  if (t.tag === 'App') return App(substVar(j, s, t.fn), t.erased, substVar(j, s, t.arg));
  if (t.tag === 'Abs') return Abs(t.erased, t.name, substVar(j, s, t.type), substVar(j + 1, shift(1, 0, s), t.body));
  if (t.tag === 'Let') return Let(t.erased, t.name, substVar(j, s, t.type), substVar(j, s, t.val), substVar(j + 1, shift(1, 0, s), t.body));
  if (t.tag === 'Pi') return Pi(t.erased, t.name, substVar(j, s, t.type), substVar(j + 1, shift(1, 0, s), t.body));
  return t;
};

export const subst = (t: Core, u: Core): Core => shift(-1, 0, substVar(0, shift(1, 0, u), t));
