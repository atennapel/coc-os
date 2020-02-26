import { Name } from './names';
import { Term, showTerm, toInternal } from './syntax';
import * as S from './surface';

export type Def = DDef;

export type DDef = { tag: 'DDef', name: Name, value: Term };
export const DDef = (name: Name, value: Term): DDef => ({ tag: 'DDef', name, value });

export const showDef = (d: Def): string => {
  if (d.tag === 'DDef') return `def ${d.name} = ${showTerm(d.value)}`;
  return d.tag;
};

export const toInternalDef = (d: S.Def): Def => {
  if (d.tag === 'DDef') return DDef(d.name, toInternal(d.value));
  return d.tag;
};
export const toInternalDefs = (d: S.Def[]): Def[] => d.map(toInternalDef);
