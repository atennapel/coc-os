import { Val } from './vals';
import { Meta } from './syntax';
import { impossible } from '../util';

export type TMetaId = number;

export type Solution
  = { tag: 'Unsolved' }
  | { tag: 'Solved', val: Val };

let metas: Solution[] = [];

export const resetMetas = () => { metas = [] };

export const getMeta = (id: TMetaId): Solution => {
  const s = metas[id] || null;
  if (!s) return impossible(`undefined meta ?${id} in getSolvedMeta`);
  return s;
};
export const setMeta = (id: TMetaId, val: Val): void => {
  metas[id] = { tag: 'Solved', val };
};
export const freshMetaId = (): TMetaId => {
  const id = metas.length;
  metas[id] = { tag: 'Unsolved' };
  return id;
};
export const freshMeta = () => Meta(freshMetaId());
