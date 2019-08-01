import { impossible } from './util';

export type Kind = KType | KFun;

export interface KType {
  readonly tag: 'KType';
}
export const KType: KType = { tag: 'KType' };

export interface KFun {
  readonly tag: 'KFun';
  readonly left: Kind;
  readonly right: Kind;
}
export const KFun = (left: Kind, right: Kind): KFun =>
  ({ tag: 'KFun', left, right });
export const kfunFrom = (ks: Kind[]): Kind =>
  ks.reduceRight((x, y) => KFun(y, x));
export const kfun = (...ks: Kind[]): Kind => kfunFrom(ks);
export const flattenKFun = (t: Kind): Kind[] => {
  const a: Kind[] = [];
  while (t.tag === 'KFun') {
    a.push(t.left);
    t = t.right;
  }
  a.push(t);
  return a;
};

export const isKindAtom = (t: Kind): boolean => t.tag === 'KType';

export const showKindP = (b: boolean, t: Kind): string =>
  b ? `(${showKind(t)})` : showKind(t);
export const showKind = (t: Kind): string => {
  if (t.tag === 'KType') return '*';
  if (t.tag === 'KFun')
    return flattenKFun(t)
      .map(x => showKindP(!isKindAtom(x), x)).join(' -> ');
  return impossible('showKind');
};

export const eqKind = (a: Kind, b: Kind): boolean => {
  if (a === b) return true;
  if (a.tag === 'KType') return b.tag === 'KType';
  if (a.tag === 'KFun')
    return b.tag === 'KFun' && eqKind(a.left, b.left) &&
      eqKind(a.right, b.right);
  return false;
};
