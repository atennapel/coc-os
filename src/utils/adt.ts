// Copied from https://github.com/rklaehn/adt-ts

export type Tagged = { tag: string }
export type RemoveTag<T extends Tagged> = { [K in Exclude<keyof T, 'tag'>]: T[K] }
export type SelectTag<T, Tag> = T extends { tag: Tag } ? T : never
export type WithTag<T> = { [TKey in keyof T]: { readonly tag: TKey } & Readonly<T[TKey]> }
export type FromCases<P> = WithTag<P>[keyof P]
