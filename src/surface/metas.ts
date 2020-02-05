import { Val } from './domain';
import { Meta } from './syntax';
import { impossible } from '../util';
import { Ix } from '../names';

export type Solution = Unsolved | Solved;

export type Unsolved = { tag: 'Unsolved' };
const Unsolved: Unsolved = { tag: 'Unsolved' };
export type Solved = { tag: 'Solved', val: Val };
const Solved = (val: Val): Solved => ({ tag: 'Solved', val });

let metas: Solution[] = [];

export const metaReset = () => { metas = [] };

export const metaGet = (id: Ix): Solution => {
  const s = metas[id] || null;
  if (!s) return impossible(`undefined meta ?${id} in metaGet`);
  return s;
};
export const metaSet = (id: Ix, val: Val): void => {
  metas[id] = Solved(val);
};

export const freshMetaId = (): Ix => {
  const id = metas.length;
  metas[id] = Unsolved;
  return id;
};
export const freshMeta = () => Meta(freshMetaId());
