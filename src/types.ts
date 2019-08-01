import { HashString, impossible, Id } from './util';
import { Kind, isKindAtom, showKindP, eqKind } from './kinds';

export type Type
  = TVar
  | THash
  | TApp
  | TForall
  | TConst;

export interface TVar {
  readonly tag: 'TVar';
  readonly id: Id;
}
export const TVarC = (id: Id): TVar => ({ tag: 'TVar', id });

type TVarMap = { [key: number]: TVar };
const tvarMap: TVarMap = {};
export const TVar = (id: Id): TVar =>
  tvarMap[id] || (tvarMap[id] = TVarC(id));

export interface THash {
  readonly tag: 'THash';
  readonly hash: HashString;
}
export const THash = (hash: HashString): THash =>
  ({ tag: 'THash', hash });

export type TConstName
  = '(->)'
  | 'IO';
export interface TConst {
  readonly tag: 'TConst';
  readonly name: TConstName;
}
export const TConst = (name: TConstName): TConst =>
  ({ tag: 'TConst', name });
export const TFunC = TConst('(->)');
export const TIO = TConst('IO');

export interface TFun {
  readonly tag: 'TApp';
  readonly left: {
    readonly tag: 'TApp';
    readonly left: {
      readonly tag: 'TConst';
      readonly name: '(->)';
    };
    readonly right: Type;
  }
  readonly right: Type;
}
export const isTFun = (t: Type): t is TFun =>
  t.tag === 'TApp' && t.left.tag === 'TApp' &&
    t.left.left.tag === 'TConst' && t.left.left.name === '(->)';
export const tfunL = (t: TFun) => t.left.right;
export const tfunR = (t: TFun) => t.right;
export const TFun = (a: Type, b: Type): TFun =>
  TApp(TApp(TFunC, a), b) as TFun;
export const tfunFrom = (ks: Type[]): Type =>
  ks.reduceRight((x, y) => TFun(y, x));
export const tfun = (...ks: Type[]): Type => tfunFrom(ks);
export const flattenTFun = (t: Type): Type[] => {
  const a: Type[] = [];
  while (isTFun(t)) {
    a.push(tfunL(t));
    t = tfunR(t);
  }
  a.push(t);
  return a;
};

export interface TForall {
  readonly tag: 'TForall';
  readonly kind: Kind;
  readonly body: Type;
}
export const TForall = (kind: Kind, body: Type): TForall =>
  ({ tag: 'TForall', kind, body });
export const tforall = (ts: Kind[], body: Type): Type =>
  ts.reduceRight((x, y) => TForall(y, x), body);
export const flattenTForall = (t: Type): [Kind[], Type] => {
  const a: Kind[] = [];
  while (t.tag === 'TForall') {
    a.push(t.kind);
    t = t.body;
  }
  return [a, t];
};

export interface TApp {
  readonly tag: 'TApp';
  readonly left: Type;
  readonly right: Type;
}
export const TApp = (left: Type, right: Type): TApp =>
  ({ tag: 'TApp', left, right });
export const tappFrom = (ts: Type[]): Type => ts.reduce(TApp);
export const tapp = (...ts: Type[]): Type => tappFrom(ts);
export const tapp1 = (t: Type, ts: Type[]): Type => ts.reduce(TApp, t);
export const flattenTApp = (t: Type): Type[] => {
  const a: Type[] = [];
  while (t.tag === 'TApp') {
    a.push(t.right);
    t = t.left;
  }
  a.push(t);
  return a.reverse();
};

export const isTypeAtom = (t: Type): boolean =>
  t.tag === 'TVar' || t.tag === 'TConst' || t.tag === 'THash';

export const showTypeP = (b: boolean, t: Type): string =>
  b ? `(${showType(t)})` : showType(t);
export const showType = (t: Type): string => {
  if (t.tag === 'TConst') return t.name;
  if (t.tag === 'TVar') return `${t.id}`;
  if (t.tag === 'THash') return `#${t.hash}`;
  if (t.tag === 'TForall') {
    const [ns, b] = flattenTForall(t);
    return `∀${ns.map(x => showKindP(!isKindAtom(x), x)).join(' ')}. ${showType(b)}`;
  }
  if (isTFun(t))
    return flattenTFun(t).map(x => showTypeP(!isTypeAtom(x), x)).join(' -> ');
  if (t.tag === 'TApp')
    return flattenTApp(t).map(x => showTypeP(!isTypeAtom(x), x)).join(' ');
  return impossible('showType');
};

export const eqType = (a: Type, b: Type): boolean => {
  if (a === b) return true;
  if (a.tag === 'TConst') return b.tag === 'TConst' && a.name === b.name;
  if (a.tag === 'TVar') return b.tag === 'TVar' && a.id === b.id;
  if (a.tag === 'THash') return b.tag === 'THash' && a.hash === b.hash;
  if (a.tag === 'TForall')
    return b.tag === 'TForall' && eqKind(a.kind, b.kind) && eqType(a.body, b.body);
  if (a.tag === 'TApp')
    return b.tag === 'TApp' && eqType(a.left, b.left) && eqType(a.right, b.right);
  return false;
};

export interface TDef {
  readonly tag: 'TDef';
  readonly args: Kind[];
  readonly type: Type;
}
export const TDef = (args: Kind[], type: Type): TDef =>
  ({ tag: 'TDef', args, type });
export const showTDef = (t: TDef): string =>
  `${t.args.map(x => showKindP(!isKindAtom(x), x)).join(' ')}. ${showType(t.type)}`;

export const shiftType = (d: Id, c: Id, t: Type): Type => {
  if (t.tag === 'TVar') return t.id < c ? t : TVar(t.id + d);
  if (t.tag === 'TForall') {
    const b = shiftType(d, c + 1, t.body);
    return b === t.body ? t : TForall(t.kind, b);
  }
  if (t.tag === 'TApp') {
    const l = shiftType(d, c, t.left);
    const r = shiftType(d, c, t.right);
    return l === t.left && r === t.right ? t : TApp(l, r);
  }
  return t;
};

export const substType = (j: Id, s: Type, t: Type): Type => {
  if (t.tag === 'TVar') {
    const k = t.id;
    return k === j ? s : k < j ? t : TVar(k - 1);
  }
  if (t.tag === 'TForall') {
    const b = substType(j + 1, shiftType(1, 0, s), t.body);
    return b === t.body ? t : TForall(t.kind, b);
  }
  if (t.tag === 'TApp') {
    const l = substType(j, s, t.left);
    const r = substType(j, s, t.right);
    return l === t.left && r === t.right ? t : TApp(l, r);
  }
  return t;
};

export const openTForall = (t: TForall, s: Type): Type =>
  substType(0, s, t.body);
