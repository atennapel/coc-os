import { List, lookup } from './list';

export type Name = string;

const nextName = (x: Name): Name => {
  const s = x.split('$');
  if (s.length === 2) return `${s[0]}\$${+s[1] + 1}`;
  return `${x}\$0`;
};

export const freshName = <T>(vs: List<[Name, T]>, name: Name): Name => {
  if (name === '_') return '_';
  while (lookup(vs, name) !== null) name = nextName(name);
  return name;
};
