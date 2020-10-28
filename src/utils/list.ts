export type List<T> = Nil | Cons<T>;

export interface Nil {
  readonly tag: 'Nil';
}
export const Nil: Nil = { tag: 'Nil' };

export interface Cons<T> {
  readonly tag: 'Cons';
  readonly head: T;
  readonly tail: List<T>;
}
export const Cons = <T>(head: T, tail: List<T>): List<T> =>
  ({ tag: 'Cons', head, tail });

export const listFrom = <T>(a: T[]): List<T> =>
  a.reduceRight((x, y) => Cons(y, x), Nil as List<T>);
export const list = <T>(...a: T[]): List<T> => listFrom(a);

export const head = <T>(l: List<T>): T => (l as Cons<T>).head;
export const tail = <T>(l: List<T>): List<T> => (l as Cons<T>).tail;

export const listToString = <T>(l: List<T>, fn: (val: T) => string = x => `${x}`): string => {
  const r: string[] = [];
  let c = l;
  while (c.tag === 'Cons') {
    r.push(fn(c.head));
    c = c.tail;
  }
  return `[${r.join(', ')}]`;
};

export const filter = <T>(l: List<T>, fn: (val: T) => boolean): List<T> =>
  l.tag === 'Cons' ? (fn(l.head) ? Cons(l.head, filter(l.tail, fn)) : filter(l.tail, fn)) : l;
export const first = <T>(l: List<T>, fn: (val: T) => boolean): T | null => {
  let c = l;
  while (c.tag === 'Cons') {
    if (fn(c.head)) return c.head;
    c = c.tail;
  }
  return null;
};
export const each = <T>(l: List<T>, fn: (val: T) => void): void => {
  let c = l;
  while (c.tag === 'Cons') {
    fn(c.head);
    c = c.tail;
  }
};

export const length = <T>(l: List<T>): number => {
  let n = 0;
  let c = l;
  while (c.tag === 'Cons') {
    n++;
    c = c.tail;
  }
  return n;
};

export const isEmpty = <T>(l: List<T>): l is Nil => l.tag === 'Nil';

export const reverse = <T>(l: List<T>): List<T> =>
  listFrom(toArray(l, x => x).reverse());

export const toArray = <T, R>(l: List<T>, fn: (val: T) => R): R[] => {
  let c = l;
  const r = [];
  while (c.tag === 'Cons') {
    r.push(fn(c.head));
    c = c.tail;
  }
  return r;
};
export const toArrayFilter = <T, R>(l: List<T>, m: (val: T) => R, f: (val: T) => boolean) => {
  const a = [];
  while (l.tag === 'Cons') {
    if (f(l.head)) a.push(m(l.head));
    l = l.tail;
  }
  return a;
};

export const append = <T>(a: List<T>, b: List<T>): List<T> =>
  a.tag === 'Cons' ? Cons(a.head, append(a.tail, b)) : b;

export const consAll = <T>(hs: T[], b: List<T>): List<T> =>
  append(listFrom(hs), b);

export const map = <T, R>(l: List<T>, fn: (val: T) => R): List<R> =>
  l.tag === 'Cons' ? Cons(fn(l.head), map(l.tail, fn)) : l;
export const mapIndex = <T, R>(l: List<T>, fn: (ix: number, val: T) => R, i: number = 0): List<R> =>
  l.tag === 'Cons' ? Cons(fn(i, l.head), mapIndex(l.tail, fn, i + 1)) : l;

export const index = <T>(l: List<T>, i: number): T | null => {
  while (l.tag === 'Cons') {
    if (i-- === 0) return l.head;
    l = l.tail;
  }
  return null;
};
export const indexOf = <T>(l: List<T>, x: T): number => {
  let i = 0;
  while (l.tag === 'Cons') {
    if (l.head === x) return i;
    l = l.tail;
    i++;
  }
  return -1;
};
export const indexOfFn = <T>(l: List<T>, x: (v: T) => boolean): number => {
  let i = 0;
  while (l.tag === 'Cons') {
    if (x(l.head)) return i;
    l = l.tail;
    i++;
  }
  return -1;
};

export const takeWhile = <T>(l: List<T>, fn: (val: T) => boolean): List<T> =>
  l.tag === 'Cons' && fn(l.head) ? Cons(l.head, takeWhile(l.tail, fn)) : Nil;
export const dropWhile = <T>(l: List<T>, fn: (val: T) => boolean): List<T> =>
  l.tag === 'Cons' && fn(l.head) ? dropWhile(l.tail, fn) : l;

export const indecesOf = <T>(l: List<T>, val: T): number[] => {
  const a: number[] = [];
  let i = 0;
  while (l.tag === 'Cons') {
    if (l.head === val) a.push(i);
    l = l.tail;
    i++;
  }
  return a;
};

export const take = <T>(l: List<T>, n: number): List<T> =>
  n <= 0 || l.tag === 'Nil' ? Nil : Cons(l.head, take(l.tail, n - 1));

export const extend = <K, T>(name: K, val: T, rest: List<[K, T]>): List<[K, T]> =>
  Cons([name, val] as [K, T], rest);
export const lookup = <K, T>(l: List<[K, T]>, name: K, eq: (a: K, b: K) => boolean = (x, y) => x === y): T | null => {
  while (l.tag === 'Cons') {
    const h = l.head;
    if (eq(h[0], name)) return h[1];
    l = l.tail;
  }
  return null;
};

export const foldr = <T, R>(f: (h: T, a: R, j: number) => R, i: R, l: List<T>, j: number = 0): R =>
  l.tag === 'Nil' ? i : f(l.head, foldr(f, i, l.tail, j + 1), j);
export const foldl = <T, R>(f: (a: R, h: T) => R, i: R, l: List<T>): R =>
  l.tag === 'Nil' ? i : foldl(f, f(i, l.head), l.tail);
export const foldrprim = <T, R>(f: (h: T, a: R, l: List<T>, j: number) => R, i: R, l: List<T>, ind: number = 0): R =>
  l.tag === 'Nil' ? i : f(l.head, foldrprim(f, i, l.tail, ind + 1), l, ind);
export const foldlprim = <T, R>(f: (h: T, a: R, l: List<T>, j: number) => R, i: R, l: List<T>, ind: number = 0): R =>
  l.tag === 'Nil' ? i : foldlprim(f, f(l.head, i, l, ind), l.tail, ind + 1);

export const zipWith = <A, B, R>(f: (a: A, b: B) => R, la: List<A>, lb: List<B>): List<R> =>
  la.tag === 'Nil' || lb.tag === 'Nil' ? Nil :
    Cons(f(la.head, lb.head), zipWith(f, la.tail, lb.tail));
export const zipWithIndex = <A, B, R>(f: (a: A, b: B, i: number) => R, la: List<A>, lb: List<B>, i: number = 0): List<R> =>
  la.tag === 'Nil' || lb.tag === 'Nil' ? Nil :
    Cons(f(la.head, lb.head, i), zipWithIndex(f, la.tail, lb.tail, i + 1));
export const zipWith_ = <A, B>(f: (a: A, b: B) => void, la: List<A>, lb: List<B>): void => {
  if (la.tag === 'Cons' && lb.tag === 'Cons') {
    f(la.head, lb.head);
    zipWith_(f, la.tail, lb.tail);
  }
};
export const zipWithR_ = <A, B>(f: (a: A, b: B) => void, la: List<A>, lb: List<B>): void => {
  if (la.tag === 'Cons' && lb.tag === 'Cons') {
    zipWith_(f, la.tail, lb.tail);
    f(la.head, lb.head);
  }
};
export const and = (l: List<boolean>): boolean =>
  l.tag === 'Nil' ? true : l.head && and(l.tail);

export const range = (n: number): List<number> =>
  n <= 0 ? Nil : Cons(n - 1, range(n - 1));

export const contains = <T>(l: List<T>, v: T): boolean =>
  l.tag === 'Cons' ? (l.head === v || contains(l.tail, v)) : false;

export const max = (l: List<number>): number =>
  foldl((a, b) => b > a ? b : a, Number.MIN_SAFE_INTEGER, l);

export const last = <T>(l: List<T>): T | null => {
  let c = l;
  while (c.tag === 'Cons') if (c.tail.tag === 'Nil') return c.head;
  return null;
};
