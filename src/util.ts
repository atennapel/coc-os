export const impossible = (msg: string) => {
  throw new Error(`impossible: ${msg}`);
};

export const terr = (msg: string) => {
  throw new TypeError(msg);
};

export const mapobj = <A, B>(o: { [key: string]: A }, f: (v: A) => B): { [key: string]: B } => {
  const n: { [key: string]: B } = {};
  for (let k in o) n[k] = f(o[k]);
  return n;
};
