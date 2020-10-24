import { Ix, Name } from './names';
import { impossible, terr } from './utils/utils';
import { Val } from './values';
import { HoleInfo } from './elaboration';
import { Data } from './utils/adt';

export type Solution = Data<{
  Unsolved: { type: Val, erased: boolean },
  Solved: { val: Val , type: Val, erased: boolean },
}>;
export const Unsolved = (type: Val, erased: boolean): Solution => ({ tag: 'Unsolved', type, erased });
export const Solved = (val: Val, type: Val, erased: boolean): Solution => ({ tag: 'Solved', val, type, erased });

// postponing
type Blocked = { k: Ix, a: Val, b: Val, blockedBy: Ix[] };
const Blocked = (k: Ix, a: Val, b: Val, blockedBy: Ix[]) => ({ k, a, b, blockedBy });

// holes
type Holes = { [key: string]: HoleInfo };

// context is mutable
type Context = { metas: Solution[], blocked: Blocked[], holes: Holes, instanceId: Ix };
const Context = (metas: Solution[] = [], blocked: Blocked[] = [], holes: Holes = {}, instanceId: Ix = 0) => ({ metas, blocked, holes, instanceId });

let context: Context = Context();
let contextStack: Context[] = [];

const cloneContext = (ctx: Context): Context =>
  Context(ctx.metas.slice(), ctx.blocked.slice(), Object.assign({}, ctx.holes), ctx.instanceId);

export const resetContext = () => {
  context = Context();
};

export const markContext = () => {
  contextStack.push(context);
  context = cloneContext(context);
};
export const discardContext = () => {
  contextStack.pop();
};
export const undoContext = (): void => {
  const ctx = contextStack.pop();
  if (!ctx) return impossible(`tried to undoMetas with empty stack`);
  context = ctx;
};

// metas
export const freshMeta = (type: Val, erased: boolean): Ix => {
  const id = context.metas.length;
  context.metas[id] = Unsolved(type, erased);
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
  context.metas[id] = Solved(val, s.type, s.erased);
};

export const contextSolved = (): boolean =>
  context.metas.every(s => s.tag === 'Solved') && context.blocked.length === 0;

// postponements
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

// holes
export const registerHole = (name: Name, info: HoleInfo): void => {
  if (context.holes[name]) return terr(`named hole used more than once: _${name}`);
  context.holes[name] = info;
};

export const getHoles = (): Holes => context.holes;

export const getHoleEntries = (): [Name, HoleInfo][] => Object.entries(getHoles());

export const freshInstanceId = (): Ix => context.instanceId++;
