export const impossible = (msg: string) => {
  throw new Error(`impossible: ${msg}`);
};

export const terr = (msg: string) => {
  throw new TypeError(msg);
};

export const err = (msg: string) => {
  throw new Error(msg);
};

export type Obj<T> = { [key: string]: T };
export const mapobj = <A, B>(o: Obj<A>, f: (v: A, o: Obj<B>) => B): Obj<B> => {
  const n: Obj<B> = {};
  for (let k in o) n[k] = f(o[k], n);
  return n;
};
