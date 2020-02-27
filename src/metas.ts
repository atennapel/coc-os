import { Val } from './domain';
import { Meta } from './syntax';
import { impossible } from './utils/util';
import { Ix } from './names';

export type Solution = Unsolved | Solved;

export type Unsolved = { tag: 'Unsolved' };
const Unsolved: Unsolved = { tag: 'Unsolved' };
export type Solved = { tag: 'Solved', val: Val };
const Solved = (val: Val): Solved => ({ tag: 'Solved', val });

let metas: Solution[] = [];
const stack: Solution[][] = [];

export const metaUnsolved = () => metas.some(x => x.tag === 'Unsolved');

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

export const metaPush = (): void => {
  stack.push(metas);
  metas = metas.slice();
};
export const metaPop = (): void => {
  const x = stack.pop();
  if (!x) return;
  metas = x;
};
export const metaDiscard = (): void => { stack.pop() };
