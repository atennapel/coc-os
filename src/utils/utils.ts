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
