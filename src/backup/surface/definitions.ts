import { Name } from '../names';
import { Term, showTerm } from './syntax';

export type Def
  = { tag: 'DDef', name: Name, value: Term, opaque: boolean };

export const DDef = (name: Name, value: Term, opaque: boolean = false): Def =>
  ({ tag: 'DDef', name, value, opaque });

export const showDef = (d: Def): string => {
  if (d.tag === 'DDef') return `${d.opaque ? 'opaque ' : ''}${d.name} := ${showTerm(d.value)}`;
  return '';
};
