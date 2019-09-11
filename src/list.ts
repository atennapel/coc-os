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

export const toString = <T>(l: List<T>, fn: (val: T) => string = x => `${x}`): string => {
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

export const append = <T>(a: List<T>, b: List<T>): List<T> =>
  a.tag === 'Cons' ? Cons(a.head, append(a.tail, b)) : b;

export const map = <T, R>(l: List<T>, fn: (val: T) => R): List<R> =>
  l.tag === 'Cons' ? Cons(fn(l.head), map(l.tail, fn)) : l;

export const index = <T>(l: List<T>, i: number): T | null => {
  while (l.tag === 'Cons') {
    if (i-- === 0) return l.head;
    l = l.tail;
  }
  return null;
};

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

export const foldr = <T, R>(f: (h: T, a: R) => R, i: R, l: List<T>): R =>
  l.tag === 'Nil' ? i : f(l.head, foldr(f, i, l.tail));
export const foldl = <T, R>(f: (a: R, h: T) => R, i: R, l: List<T>): R =>
  l.tag === 'Nil' ? i : foldl(f, f(i, l.head), l.tail);

export const zipWith = <A, B, R>(f: (a: A, b: B) => R, la: List<A>, lb: List<B>): List<R> =>
  la.tag === 'Nil' || lb.tag === 'Nil' ? Nil :
    Cons(f(la.head, lb.head), zipWith(f, la.tail, lb.tail));
export const zipWith_ = <A, B>(f: (a: A, b: B) => void, la: List<A>, lb: List<B>): void => {
  if (la.tag === 'Cons' && lb.tag === 'Cons') {
    f(la.head, lb.head);
    zipWith_(f, la.tail, lb.tail);
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
