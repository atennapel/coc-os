import { impossible } from './util';
import { STerm, showSTerm } from './surface';

export type Def = DLet | DOpaque;

export interface DLet {
  readonly tag: 'DLet';
  readonly name: string;
  readonly term: STerm;
}
export const DLet = (name: string, term: STerm): DLet =>
  ({ tag: 'DLet', name, term });

export interface DOpaque {
  readonly tag: 'DOpaque';
  readonly name: string;
  readonly oname: string;
  readonly term: STerm;
}
export const DOpaque = (name: string, oname: string, term: STerm): DOpaque =>
  ({ tag: 'DOpaque', name, oname, term });
 
export const showDef = (d: Def): string => {
  if (d.tag === 'DLet')
    return `let ${d.name} = ${showSTerm(d.term)}`;
  if (d.tag === 'DOpaque')
    return `opaque ${d.name} with ${d.oname} = ${showSTerm(d.term)}`;
  return impossible('showDef');
};
export const showDefs = (ds: Def[]): string =>
  ds.map(showDef).join('\n');
