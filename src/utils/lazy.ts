export type Lazy<T> = { fn: () => T } & ({ val: null, forced: false } | { val: T, forced: true });

export const Lazy = <T>(fn: () => T): Lazy<T> =>
  ({ fn, val: null, forced: false });
export const lazyOf = <T>(val: T): Lazy<T> => ({ fn: () => val, val, forced: true });
export const forceLazy = <T>(lazy: Lazy<T>): T => {
  if (lazy.forced) return lazy.val;
  const v = lazy.fn();
  (lazy as any).val = v;
  (lazy as any).forced = true;
  return v;
};
export const mapLazy = <A, B>(lazy: Lazy<A>, fn: (val: A) => B): Lazy<B> =>
  Lazy(() => fn(forceLazy(lazy)));
