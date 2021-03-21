import { MetaVar } from './metas';
import { Ix, Name } from './names';
import { List } from './utils/List';
import { impossible } from './utils/utils';

export type Core =
  Var | Global | Type | Let |
  Pi | Abs | App |
  Sigma | Pair | Proj |
  Enum | EnumLit | ElimEnum |
  Lift | LiftTerm | Lower |
  Meta | InsertedMeta;

export interface Var { readonly tag: 'Var'; readonly index: Ix }
export const Var = (index: Ix): Var => ({ tag: 'Var', index });
export interface Type { readonly tag: 'Type'; readonly index: Ix }
export const Type = (index: Ix): Type => ({ tag: 'Type', index });
export interface Global { readonly tag: 'Global'; readonly name: Name; readonly lift: Ix }
export const Global = (name: Name, lift: Ix): Global => ({ tag: 'Global', name, lift });
export interface Let { readonly tag: 'Let'; readonly erased: boolean; readonly name: Name; readonly type: Core; readonly val: Core; readonly body: Core }
export const Let = (erased: boolean, name: Name, type: Core, val: Core, body: Core): Let => ({ tag: 'Let', erased, name, type, val, body });
export interface Pi { readonly tag: 'Pi'; readonly erased: boolean; readonly name: Name; readonly type: Core; readonly u1: Ix; readonly body: Core; readonly u2: Ix }
export const Pi = (erased: boolean, name: Name, type: Core, u1: Ix, body: Core, u2: Ix): Pi => ({ tag: 'Pi', erased, name, type, u1, body, u2 });
export interface Abs { readonly tag: 'Abs'; readonly erased: boolean; readonly name: Name; readonly type: Core; readonly body: Core }
export const Abs = (erased: boolean, name: Name, type: Core, body: Core): Abs => ({ tag: 'Abs', erased, name, type, body });
export interface App { readonly tag: 'App'; readonly fn: Core; readonly erased: boolean; readonly arg: Core }
export const App = (fn: Core, erased: boolean, arg: Core): App => ({ tag: 'App', fn, erased, arg });
export interface Sigma { readonly tag: 'Sigma'; readonly erased: boolean; readonly name: Name; readonly type: Core; readonly u1: Ix; readonly body: Core; readonly u2: Ix }
export const Sigma = (erased: boolean, name: Name, type: Core, u1: Ix, body: Core, u2: Ix): Sigma => ({ tag: 'Sigma', erased, name, type, u1, body, u2 });
export interface Pair { readonly tag: 'Pair'; readonly erased: boolean; readonly fst: Core; readonly snd: Core; readonly type: Core }
export const Pair = (erased: boolean, fst: Core, snd: Core, type: Core): Pair => ({ tag: 'Pair', erased, fst, snd, type });
export interface Proj { readonly tag: 'Proj'; readonly proj: 'fst' | 'snd'; readonly term: Core }
export const Proj = (proj: 'fst' | 'snd', term: Core): Proj => ({ tag: 'Proj', proj, term });
export interface Enum { readonly tag: 'Enum'; readonly num: Ix }
export const Enum = (num: Ix): Enum => ({ tag: 'Enum', num });
export interface EnumLit { readonly tag: 'EnumLit'; readonly val: Ix; readonly num: Ix }
export const EnumLit = (val: Ix, num: Ix): EnumLit => ({ tag: 'EnumLit', val, num });
export interface ElimEnum { readonly tag: 'ElimEnum'; readonly num: Ix; readonly lift: Ix; readonly motive: Core; readonly scrut: Core; readonly cases: Core[] }
export const ElimEnum = (num: Ix, lift: Ix, motive: Core, scrut: Core, cases: Core[]): ElimEnum => ({ tag: 'ElimEnum', num, lift, motive, scrut, cases });
export interface Lift { readonly tag: 'Lift'; readonly type: Core }
export const Lift = (type: Core): Lift => ({ tag: 'Lift', type });
export interface LiftTerm { readonly tag: 'LiftTerm'; readonly term: Core }
export const LiftTerm = (term: Core): LiftTerm => ({ tag: 'LiftTerm', term });
export interface Lower { readonly tag: 'Lower'; readonly term: Core }
export const Lower = (term: Core): Lower => ({ tag: 'Lower', term });
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
export const flattenSigma = (t: Core): [[boolean, Name, Core][], Core] => {
  const params: [boolean, Name, Core][] = [];
  let c = t;  
  while (c.tag === 'Sigma') {
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
export const flattenPair = (t: Core): [[boolean, Core][], Core] => {
  const ps: [boolean, Core][] = [];
  let c = t;
  while (c.tag === 'Pair') {
    ps.push([c.erased, c.fst]);
    c = c.snd;
  }
  return [ps, c];
};

const showP = (b: boolean, t: Core) => b ? `(${show(t)})` : show(t);
const isSimple = (t: Core) => t.tag === 'Var' || t.tag === 'Global' || t.tag === 'Type' || t.tag === 'Meta' || t.tag === 'InsertedMeta' || t.tag === 'Enum' || t.tag === 'EnumLit' || t.tag === 'Pair';
const showS = (t: Core) => showP(!isSimple(t), t);
export const show = (t: Core): string => {
  if (t.tag === 'Var') return `'${t.index}`;
  if (t.tag === 'Global') return `${t.name}${t.lift === 0 ? '' : t.lift === 1 ? '^' : `^${t.lift}`}`;
  if (t.tag === 'Type') return `*${t.index > 0 ? t.index : ''}`;
  if (t.tag === 'Meta') return `?${t.id}`;
  if (t.tag === 'InsertedMeta') return `?*${t.id}`;
  if (t.tag === 'Enum') return `#${t.num}`;
  if (t.tag === 'ElimEnum') return `?${t.num}${t.lift === 0 ? '' : t.lift === 1 ? '^' : `^${t.lift}`} {${show(t.motive)}} ${showS(t.scrut)}${t.cases.length > 0 ? ' ' : ''}${t.cases.map(showS).join(' ')}`;
  if (t.tag === 'EnumLit') return `@${t.val}/${t.num}`;
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
  if (t.tag === 'Sigma') {
    const [params, ret] = flattenSigma(t);
    return `${params.map(([e, x, t]) => !e && x === '_' ? showP(t.tag === 'Sigma' || t.tag === 'Let', t) : `${e ? '{' : '('}${x} : ${show(t)}${e ? '}' : ')'}`).join(' ** ')} ** ${show(ret)}`;
  }
  if (t.tag === 'Pair') {
    const [ps, ret] = flattenPair(t);
    return `(${ps.map(([e, x]) => e ? `{${show(x)}}` : `${show(x)}`).join(', ')}, ${show(ret)}) : ${show(t.type)}`;
  }
  if (t.tag === 'Let')
    return `let ${t.erased ? '{' : ''}${t.name}${t.erased ? '}' : ''} : ${showP(t.type.tag === 'Let', t.type)} = ${showP(t.val.tag === 'Let', t.val)}; ${show(t.body)}`;
  if (t.tag === 'Lift') return `Lift ${showS(t.type)}`;
  if (t.tag === 'LiftTerm') return `lift ${showS(t.term)}`;
  if (t.tag === 'Lower') return `lower ${showS(t.term)}`;
  if (t.tag === 'Proj') return `${t.proj} ${showS(t.term)}`;
  return t;
};

export const shift = (d: Ix, c: Ix, t: Core): Core => {
  if (t.tag === 'Var') return t.index < c ? t : Var(t.index + d);
  if (t.tag === 'App') return App(shift(d, c, t.fn), t.erased, shift(d, c, t.arg));
  if (t.tag === 'Abs') return Abs(t.erased, t.name, shift(d, c, t.type), shift(d, c + 1, t.body));
  if (t.tag === 'Let') return Let(t.erased, t.name, shift(d, c, t.type), shift(d, c, t.val), shift(d, c + 1, t.body));
  if (t.tag === 'Pi') return Pi(t.erased, t.name, shift(d, c, t.type), t.u1, shift(d, c + 1, t.body), t.u2);
  if (t.tag === 'Sigma') return Sigma(t.erased, t.name, shift(d, c, t.type), t.u1, shift(d, c + 1, t.body), t.u2);
  if (t.tag === 'Pair') return Pair(t.erased, shift(d, c, t.fst), shift(d, c, t.snd), shift(d, c, t.type))
  if (t.tag === 'ElimEnum') return ElimEnum(t.num, t.lift, shift(d, c, t.motive), shift(d, c, t.scrut), t.cases.map(x => shift(d, c, x)));
  if (t.tag === 'Lift') return Lift(shift(d, c, t.type));
  if (t.tag === 'LiftTerm') return LiftTerm(shift(d, c, t.term));
  if (t.tag === 'Lower') return Lower(shift(d, c, t.term));
  if (t.tag === 'Proj') return Proj(t.proj, shift(d, c, t.term));
  return t;
};

export const substVar = (j: Ix, s: Core, t: Core): Core => {
  if (t.tag === 'Var') return t.index === j ? s : t;
  if (t.tag === 'App') return App(substVar(j, s, t.fn), t.erased, substVar(j, s, t.arg));
  if (t.tag === 'Abs') return Abs(t.erased, t.name, substVar(j, s, t.type), substVar(j + 1, shift(1, 0, s), t.body));
  if (t.tag === 'Let') return Let(t.erased, t.name, substVar(j, s, t.type), substVar(j, s, t.val), substVar(j + 1, shift(1, 0, s), t.body));
  if (t.tag === 'Pi') return Pi(t.erased, t.name, substVar(j, s, t.type), t.u1, substVar(j + 1, shift(1, 0, s), t.body), t.u2);
  if (t.tag === 'Sigma') return Sigma(t.erased, t.name, substVar(j, s, t.type), t.u1, substVar(j + 1, shift(1, 0, s), t.body), t.u2);
  if (t.tag === 'Pair') return Pair(t.erased, substVar(j, s, t.fst), substVar(j, s, t.snd), substVar(j, s, t.type));
  if (t.tag === 'ElimEnum') return ElimEnum(t.num, t.lift, substVar(j, s, t.motive), substVar(j, s, t.scrut), t.cases.map(x => substVar(j, s, x)));
  if (t.tag === 'Lift') return Lift(substVar(j, s, t.type));
  if (t.tag === 'LiftTerm') return LiftTerm(substVar(j, s, t.term));
  if (t.tag === 'Lower') return Lower(substVar(j, s, t.term));
  if (t.tag === 'Proj') return Proj(t.proj, substVar(j, s, t.term));
  return t;
};

export const subst = (t: Core, u: Core): Core => shift(-1, 0, substVar(0, shift(1, 0, u), t));

export const liftType = (l: Ix, t: Core): Core => {
  if (t.tag === 'Type') return Type(t.index + l);
  if (t.tag === 'Abs') return Abs(t.erased, t.name, liftType(l, t.type), liftType(l, t.body));
  if (t.tag === 'Pi') return Pi(t.erased, t.name, liftType(l, t.type), t.u1 + 1, liftType(l, t.body), t.u2 + 1);
  if (t.tag === 'Sigma') return Sigma(t.erased, t.name, liftType(l, t.type), t.u1 + 1, liftType(l, t.body), t.u2 + 1);
  if (t.tag === 'App') return App(liftType(l, t.fn), t.erased, liftType(l, t.arg));
  if (t.tag === 'Let') return Let(t.erased, t.name, liftType(l, t.type), liftType(l, t.val), liftType(l, t.body));
  if (t.tag === 'Global') return Global(t.name, t.lift + l);
  if (t.tag === 'Enum') return Lift(Enum(t.num));
  if (t.tag === 'ElimEnum') return ElimEnum(t.num, t.lift + l, liftType(l, t.motive), liftType(l, t.scrut), t.cases.map(x => liftType(l, x)));
  if (t.tag === 'EnumLit') return LiftTerm(EnumLit(t.val, t.num));
  if (t.tag === 'Pair') return Pair(t.erased, liftType(l, t.fst), liftType(l, t.snd), liftType(l, t.type));
  if (t.tag === 'Meta') return impossible(`meta in liftType: ${show(t)}`);
  if (t.tag === 'InsertedMeta') return impossible(`meta in liftType: ${show(t)}`);
  if (t.tag === 'Lift') return Lift(Lift(t.type));
  if (t.tag === 'LiftTerm') return LiftTerm(LiftTerm(t.term));
  if (t.tag === 'Lower') return t.term;
  if (t.tag === 'Proj') return Proj(t.proj, liftType(l, t.term));
  return t;
};
