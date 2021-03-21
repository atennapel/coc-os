import { Ix } from './names';
import { impossible } from './utils/utils';
import { Val } from './values';

export type MetaVar = number;

export type Solution = Unsolved | Solved;
export interface Unsolved { readonly tag: 'Unsolved'; readonly universe: Ix }
export const Unsolved = (universe: Ix): Unsolved => ({ tag: 'Unsolved', universe });
export interface Solved { readonly tag: 'Solved'; readonly solution: Val }
export const Solved = (solution: Val): Solved => ({ tag: 'Solved', solution });

export type Metas = Solution[];

let metas: Metas = [];

export const resetMetas = (): void => { metas = [] };

export const freshMeta = (universe: Ix): MetaVar => {
  const id = metas.length;
  metas.push(Unsolved(universe));
  return id;
};

export const getMeta = (id: MetaVar): Solution => {
  const entry = metas[id];
  if (!entry) return impossible(`getMeta with undefined meta ${id}`);
  return entry;
};

export const setMeta = (id: MetaVar, solution: Val): void => {
  const entry = metas[id];
  if (!entry) return impossible(`setMeta with undefined meta ${id}`);
  if (entry.tag === 'Solved') return impossible(`setMeta with solved meta ${id}`);
  metas[id] = Solved(solution);
};

export const allMetasSolved = (): boolean => metas.every(x => x.tag === 'Solved');
