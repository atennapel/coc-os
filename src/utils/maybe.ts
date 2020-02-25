export type Maybe<T> = { tag: 'Nothing' } | { tag: 'Just', val: T };

export const Nothing: Maybe<any> = { tag: 'Nothing' };
export const Just = <T>(val: T): Maybe<T> => ({ tag: 'Just', val });

export const caseMaybe = <T, R>(m: Maybe<T>, f: (val: T) => R, d: () => R): R =>
  m.tag === 'Just' ? f(m.val) : d();
