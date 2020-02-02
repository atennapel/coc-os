import { Name } from '../../names';
import { Term, showTerm, toSurface } from './syntax';
import * as D from '../definitions';

export type Def = DDef;

export type DDef = { tag: 'DDef', name: Name, value: Term };
export const DDef = (name: Name, value: Term): DDef => ({ tag: 'DDef', name, value });

export const showDef = (d: Def): string => {
  if (d.tag === 'DDef') return `def ${d.name} = ${showTerm(d.value)}`;
  return d.tag;
};

export const toSurfaceDef = (d: D.Def): Def => {
  if (d.tag === 'DDef') return DDef(d.name, toSurface(d.value));
  return d.tag;
};
