export const impossible = (msg: string) => {
  throw new Error(`impossible: ${msg}`);
};

export const terr = (msg: string) => {
  throw new TypeError(msg);
};

export const serr = (msg: string) => {
  throw new SyntaxError(msg);
};

export const loadFile = (fn: string): Promise<string> => {
  if (typeof window === 'undefined') {
    return new Promise((resolve, reject) => {
      require('fs').readFile(fn, 'utf8', (err: Error, data: string) => {
        if (err) return reject(err);
        return resolve(data);
      });
    });
  } else {
    return fetch(fn).then(r => r.text());
  }
};

export const range = (n: number): number[] => {
  const a = Array(n);
  for (let i = 0; i < n; i++) a[i] = i;
  return a;
};

export const hasDuplicates = <T>(x: T[]): boolean => {
  const m: { [k: string]: true } = {};
  for (let i = 0; i < x.length; i++) {
    const y = `${x[i]}`;
    if (m[y]) return true;
    m[y] = true;
  }
  return false;
};

export const tryT = <T>(v: () => T, e: (err: TypeError) => T, throwErr: boolean = false): T => {
  try {
    return v();
  } catch (err) {
    if (!(err instanceof TypeError)) throw err;
    const r = e(err);
    if (throwErr) throw err;
    return r;
  }
};
export const tryTE = <T>(v: () => T | TypeError): T | TypeError => tryT(v, err => err);

export const mapObj = <K extends string, A, B>(o: { [key in K]: A }, fn: (val: A) => B): { [key in K]: B } => {
  const n: { [key in K]: B } = {} as any;
  for (const k in o) n[k] = fn(o[k]);
  return n;
};

export const eqArr = <T>(a: T[], b: T[], eq: (a: T, b: T) => boolean = (x, y) => x === y): boolean => {
  const l = a.length;
  if (b.length !== l) return false;
  for (let i = 0; i < l; i++) if (!eq(a[i], b[i])) return false;
  return true;
};
