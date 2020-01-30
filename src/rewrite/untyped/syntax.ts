import { Ix } from '../../names';

export type Term = Var | App | Abs;

export type Var = { tag: 'Var', index: Ix };
export const Var = (index: Ix): Var => ({ tag: 'Var', index });
export type App = { tag: 'App', left: Term, right: Term };
export const App = (left: Term, right: Term): App => ({ tag: 'App', left, right });
export type Abs = { tag: 'Abs', body: Term };
export const Abs = (body: Term): Abs => ({ tag: 'Abs', body });

export const idTerm = Abs(Var(0));

export const showTerm = (t: Term): string => {
  if (t.tag === 'Var') return `${t.index}`;
  if (t.tag === 'App') return `(${showTerm(t.left)} ${showTerm(t.right)})`;
  if (t.tag === 'Abs') return `(\\${showTerm(t.body)})`;
  return t;
};
