import { List, contains } from './list';

export type Name = string;

// TODO: improve
export const freshName = (l: List<Name>, x: Name): Name => {
  if (x === '_') return x;
  while (contains(l, x)) x = `${x}'`;
  return x;
};
