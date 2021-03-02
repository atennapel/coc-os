import { List } from './utils/List';

export type Name = string;
export type Ix = number;
export type Lvl = number;

export const nextName = (x: Name): Name => {
  if (x === '_') return x;
  const s = x.split('$');
  if (s.length === 2) return `${s[0]}\$${+s[1] + 1}`;
  return `${x}\$0`;
};

export const chooseName = (x: Name, ns: List<Name>): Name =>
  x === '_' ? x : ns.contains(x) ? chooseName(nextName(x), ns) : x;
