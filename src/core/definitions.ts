import { Name } from '../names';
import { Term, showTerm, toCore } from './syntax';
import * as D from '../surface/definitions';

export type Def = DDef;

export type DDef = { tag: 'DDef', name: Name, value: Term };
export const DDef = (name: Name, value: Term): DDef => ({ tag: 'DDef', name, value });

export const showDef = (d: Def): string => {
  if (d.tag === 'DDef') return `def ${d.name} = ${showTerm(d.value)}`;
  return d.tag;
};

export const toCoreDef = (d: D.Def): Def => {
  if (d.tag === 'DDef') return DDef(d.name, toCore(d.value));
  return d.tag;
};
export const toCoreDefs = (d: D.Def[]): Def[] => d.map(toCoreDef);
