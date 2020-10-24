// Copied from https://github.com/rklaehn/adt-ts

type WithTag<T> = { [TKey in keyof T]: { readonly tag: TKey } & Readonly<T[TKey]> }
export type Data<P> = WithTag<P>[keyof P]
