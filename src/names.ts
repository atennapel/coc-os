export type Name = string;
export type Ix = number;

export const nextName = (x: Name): Name => {
  if (x === '_') return x;
  const s = x.split('$');
  if (s.length === 2) return `${s[0]}\$${+s[1] + 1}`;
  return `${x}\$0`;
};
