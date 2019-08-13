export const impossible = (msg: string) => {
  throw new Error(`impossible: ${msg}`);
};

export const terr = (msg: string) => {
  throw new TypeError(msg);
};

export const err = (msg: string) => {
  throw new Error(msg);
};

export type HashString = string;
export type Id = number;
export type Name = string;
