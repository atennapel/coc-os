import { Ix } from './names';
import { impossible } from './utils/utils';
import { Val } from './values';

export type Solution = Unsolved | Solved;

export type Unsolved = { tag: 'Unsolved', type: Val };
export const Unsolved = (type: Val): Unsolved => ({ tag: 'Unsolved', type });
export type Solved = { tag: 'Solved', val: Val, type: Val };
export const Solved = (val: Val, type: Val): Solved => ({ tag: 'Solved', val, type });

// MUTABLE
export type Context = { metas: Solution[] };
export const Context = (metas: Solution[] = []) => ({ metas });

let context: Context = Context();

export const resetContext = () => {
  context = Context();
};

export const freshMeta = (type: Val): Ix => {
  const id = context.metas.length;
  context.metas[id] = Unsolved(type);
  return id;
};

export const getMeta = (id: Ix): Solution => {
  const s = context.metas[id];
  if (!s) return impossible(`undefined meta ?${id} in metaGet`);
  return s;
};

export const isMetaSolved = (id: Ix): boolean => getMeta(id).tag === 'Solved';

export const solveMeta = (id: Ix, val: Val): void => {
  const s = getMeta(id);
  if (s.tag === 'Solved') return impossible(`meta already solved: ?${id}`);
  context.metas[id] = Solved(val, s.type);
};

export const allMetasSolved = (): boolean => context.metas.every(s => s.tag === 'Solved');
