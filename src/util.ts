export const impossible = (msg: string) => {
  throw new Error(`impossible: ${msg}`);
};

export const terr = (msg: string) => {
  throw new TypeError(msg);
};

export const serr = (msg: string) => {
  throw new SyntaxError(msg);
};
