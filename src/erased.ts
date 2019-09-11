import { impossible } from './util';
import { Type, Var, Term } from './terms';

export type ETerm = Var | EAbs | EApp | Type | EPi | EFix;

export interface EAbs {
  readonly tag: 'EAbs';
  readonly body: ETerm;
}
export const EAbs = (body: ETerm): EAbs =>
  ({ tag: 'EAbs', body });

export interface EApp {
  readonly tag: 'EApp';
  readonly left: ETerm;
  readonly right: ETerm;
}
export const EApp = (left: ETerm, right: ETerm): EApp =>
  ({ tag: 'EApp', left, right });

export interface EFix {
  readonly tag: 'EFix';
  readonly body: ETerm;
}
export const EFix = (body: ETerm): EFix =>
  ({ tag: 'EFix', body });

export interface EPi {
  readonly tag: 'EPi';
}
export const EPi: EPi = { tag: 'EPi' };

export const showETerm = (t: ETerm): string => {
  if (t.tag === 'Var') return `${t.index}`;
  if (t.tag === 'EAbs') return `(\\${showETerm(t.body)})`;
  if (t.tag === 'EFix') return `(fix ${showETerm(t.body)})`;
  if (t.tag === 'EApp') return `(${showETerm(t.left)} ${showETerm(t.right)})`;
  if (t.tag === 'Type') return '*';
  if (t.tag === 'EPi') return 'Pi';
  return impossible('showETerm');
};

export const erase = (t: Term): ETerm => {
  if (t.tag === 'Abs') return EAbs(erase(t.body));
  if (t.tag === 'App') return EApp(erase(t.left), erase(t.right));
  if (t.tag === 'Fix') return EFix(erase(t.body));
  if (t.tag === 'Pi') return EPi;
  return t;
};
