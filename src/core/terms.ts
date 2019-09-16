import { impossible } from '../util';
import { Ix } from '../names';

export type Core = CVar | CAbs | CApp | CLet | CPi | CType;

export interface CVar {
  readonly tag: 'CVar';
  readonly index: Ix;
}
export const CVar = (index: Ix): CVar => ({ tag: 'CVar', index });

export interface CAbs {
  readonly tag: 'CAbs';
  readonly type: Core;
  readonly body: Core;
}
export const CAbs = (type: Core, body: Core): CAbs =>
  ({ tag: 'CAbs', type, body });

export interface CApp {
  readonly tag: 'CApp';
  readonly left: Core;
  readonly right: Core;
}
export const CApp = (left: Core, right: Core): CApp =>
  ({ tag: 'CApp', left, right });

export interface CLet {
  readonly tag: 'CLet';
  readonly type: Core;
  readonly value: Core;
  readonly body: Core;
}
export const CLet = (type: Core, value: Core, body: Core): CLet =>
  ({ tag: 'CLet', type, value, body });

export interface CPi {
  readonly tag: 'CPi';
  readonly type: Core;
  readonly body: Core;
}
export const CPi = (type: Core, body: Core): CPi =>
  ({ tag: 'CPi', type, body });

export interface CType {
  readonly tag: 'CType';
}
export const CType: CType = { tag: 'CType' };

export const showCore = (t: Core): string => {
  if (t.tag === 'CVar') return `${t.index}`;
  if (t.tag === 'CAbs')
    return `(\\${showCore(t.type)}. ${showCore(t.body)})`;
  if (t.tag === 'CApp')
    return `(${showCore(t.left)} ${showCore(t.right)})`;
  if (t.tag === 'CLet')
    return `(let ${showCore(t.type)} = ${showCore(t.value)} in ${showCore(t.body)})`;
  if (t.tag === 'CPi')
    return `(${showCore(t.type)} -> ${showCore(t.body)})`;
  if (t.tag === 'CType') return '*';
  return impossible('showCore');
};
