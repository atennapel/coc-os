import { Ix } from './names';
import { impossible } from './utils/utils';
import { Val } from './values';

export type Solution = Unsolved | Solved;

export type Unsolved = { tag: 'Unsolved', type: Val };
export const Unsolved = (type: Val): Unsolved => ({ tag: 'Unsolved', type });
export type Solved = { tag: 'Solved', val: Val, type: Val };
export const Solved = (val: Val, type: Val): Solved => ({ tag: 'Solved', val, type });

// postponing
type Blocked = { k: Ix, a: Val, b: Val, blockedBy: Ix[] };
const Blocked = (k: Ix, a: Val, b: Val, blockedBy: Ix[]) => ({ k, a, b, blockedBy });

// context is mutable
type Context = { metas: Solution[], blocked: Blocked[] };
const Context = (metas: Solution[] = [], blocked: Blocked[] = []) => ({ metas, blocked });

let context: Context = Context();
let contextStack: Context[] = [];

export const resetContext = () => {
  context = Context();
};

export const markMetas = () => {
  contextStack.push(context);
};
export const discardMetas = () => {
  contextStack.pop();
};
export const undoMetas = (): void => {
  const ctx = contextStack.pop();
  if (!ctx) return impossible(`tried to undoMetas with empty stack`);
  context = ctx;
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

export const postpone = (k: Ix, a: Val, b: Val, blockedBy: Ix[]): void => {
  context.blocked.push(Blocked(k, a, b, blockedBy));
};

export const problemsBlockedBy = (m: Ix): Blocked[] => {
  const bs = context.blocked;
  const newbs = [];
  const r = [];
  for (let i = 0, l = bs.length; i < l; i++) {
    const c = bs[i];
    if (c.blockedBy.includes(m)) r.push(c);
    else newbs.push(c);
  }
  context.blocked = newbs;
  return r;
};

export const allProblems = (): Blocked[] => {
  const blocked = context.blocked;
  context.blocked = [];
  return blocked;
};

export const amountOfProblems = (): number => context.blocked.length;

export const contextSolved = (): boolean =>
  context.metas.every(s => s.tag === 'Solved') && context.blocked.length === 0;
