export type Name = string;

export const nextName = (x: Name): Name => {
  const s = x.split('$');
  if (s.length === 2) return `${s[0]}\$${+s[1] + 1}`;
  return `${x}\$0`;
};
