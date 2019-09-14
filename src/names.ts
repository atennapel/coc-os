import { List, each } from './list';

export type Name = string;

export const splitName = (x: Name): [Name, number] => {
  const s = x.split('$');
  return [s[0], +s[1]];
};

export const freshName = (l: List<Name>, x: Name): Name => {
  if (x === '_') return x;
  const map: { [key: string]: true } = {};
  each(l, x => map[x] = true);
  let y = splitName(x)[0];
  while (map[y]) {
    if (y.indexOf('$') >= 0) {
      const [z, n] = splitName(y);
      y = `${z}\$${n + 1}`;
    } else {
      y = `${y}\$0`;
    }
  }
  return x;
};
