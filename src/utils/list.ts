import { impossible } from './utils';

export abstract class List<T> {

  private static _Nil: List<never>;
  static Nil(): List<never> {
    if (List._Nil === undefined)
      List._Nil = new Nil();
    return List._Nil;
  }
  static Cons<T>(head: T, tail: List<T>): List<T> { return new Cons(head, tail) }

  static from<T>(values: T[]): List<T> {
    let l: List<T> = List.Nil();
    for (let i = values.length - 1; i >= 0; i--)
      l = List.Cons(values[i], l);
    return l;
  }
  static of<T>(...values: T[]): List<T> { return List.from(values) }

  static range(n: number): List<number> {
    let l: List<number> = List.Nil();
    for (let i = 0; i < n; i++) l = List.Cons(i, l);
    return l;
  }

  abstract isNil(): this is Nil;
  abstract isCons(): this is Cons<T>;
  abstract case<R>(nil: () => R, cons: (head: T, tail: List<T>) => R): R;
  abstract caseFull<R>(nil: (val: Nil) => R, cons: (cons: Cons<T>) => R): R;

  toString(fn: (val: T) => string = val => `${val}`): string {
    return `[${this.toMappedArray(fn).join(', ')}]`;
  }

  abstract toMappedArray<R>(fn: (val: T) => R): R[];
  abstract toArray(): T[];
  abstract map<R>(fn: (val: T) => R): List<R>;
  abstract each(fn: (val: T) => void): void;
  abstract index(ix: number): T | null;
  abstract updateAt(ix: number, fn: (val: T) => T): List<T>;

  abstract findIndex(fn: (val: T) => boolean): number;
  abstract find(fn: (val: T) => boolean): T | null;

  abstract indexOf(val: T): number;
  contains(val: T): boolean { return this.indexOf(val) >= 0 }

  abstract reverse(): List<T>;

  abstract zip<R>(o: List<R>): List<[T, R]>;
  abstract zipWith<R, U>(o: List<R>, fn: (a: T, b: R) => U): List<U>;
  abstract zipWith_<R>(o: List<R>, fn: (a: T, b: R) => void): void;
  abstract zipWithR_<R>(o: List<R>, fn: (a: T, b: R) => void): void;

  abstract foldr<R>(cons: (a: T, b: R) => R, nil: R): R;
  abstract foldl<R>(cons: (a: R, b: T) => R, nil: R): R;

  abstract length(): number;
  abstract uncons(): [T, List<T>];
}

export class Nil extends List<never> {

  isNil(): this is Nil { return true }
  isCons(): this is Cons<never> { return false }
  case<R>(nil: () => R, _cons: (head: never, tail: List<never>) => R): R { return nil() }
  caseFull<R>(nil: (val: Nil) => R, _cons: (cons: Cons<never>) => R): R { return nil(this) }

  toString(): string { return '[]' }
  toMappedArray(): never[] { return [] }
  toArray(): never[] { return [] }
  map(): List<never> { return this }
  each(): void {}
  index(): null { return null }
  updateAt(): List<never> { return this }

  findIndex(): number { return -1 }
  find(): null { return null }

  indexOf(): number { return -1 }
  contains(): boolean { return false }

  reverse(): List<never> { return this }

  zip<R>(): List<[never, R]> { return this }
  zipWith<U>(): List<U> { return this }
  zipWith_(): void {}
  zipWithR_(): void {}

  foldr<R>(_cons: (a: never, b: R) => R, nil: R): R { return nil }
  foldl<R>(_cons: (a: R, b: never) => R, nil: R): R { return nil }

  length(): number { return 0 }
  uncons(): never { return impossible('uncons called on Nil') }

}

export class Cons<T> extends List<T> {

  readonly head: T;
  readonly tail: List<T>;

  constructor(head: T, tail: List<T>) {
    super();
    this.head = head;
    this.tail = tail;
  }

  isNil(): this is Nil { return false }
  isCons(): this is Cons<T> { return true }
  case<R>(_nil: () => R, cons: (head: T, tail: List<T>) => R): R { return cons(this.head, this.tail) }
  caseFull<R>(_nil: (val: Nil) => R, cons: (cons: Cons<T>) => R): R { return cons(this) }

  toMappedArray<R>(fn: (val: T) => R): R[] {
    const r: R[] = [];
    let c: List<T> = this;
    while (c.isCons()) {
      r.push(fn(c.head));
      c = c.tail;
    }
    return r;
  }
  toArray(): T[] {
    const r: T[] = [];
    let c: List<T> = this;
    while (c.isCons()) {
      r.push(c.head);
      c = c.tail;
    }
    return r;
  }

  map<R>(fn: (val: T) => R): List<R> {
    return new Cons(fn(this.head), this.tail.map(fn));
  }
  each(fn: (val: T) => void): void {
    let c: List<T> = this;
    while (c.isCons()) {
      fn(c.head);
      c = c.tail;
    }
  }

  index(ix: number): T | null {
    if (ix < 0) return impossible(`index with negative index: ${ix}`);
    if (ix === 0) return this.head;
    let i = ix;
    let c: List<T> = this;
    while (c.isCons()) {
      if (i <= 0) return c.head;
      c = c.tail;
      i--;
    }
    return null;
  }
  updateAt(ix: number, fn: (val: T) => T): List<T> {
    if (ix < 0) return impossible(`updateAt with negative index: ${ix}`);
    if (ix === 0) return new Cons(fn(this.head), this.tail);
    return new Cons(this.head, this.tail.updateAt(ix - 1, fn));
  }

  findIndex(fn: (val: T) => boolean): number {
    let i = 0;
    let c: List<T> = this;
    while (c.isCons()) {
      if (fn(c.head)) return i;
      c = c.tail;
      i++;
    }
    return -1;
  }
  find(fn: (val: T) => boolean): T | null {
    let c: List<T> = this;
    while (c.isCons()) {
      if (fn(c.head)) return c.head;
      c = c.tail;
    }
    return null;
  }

  indexOf(val: T): number {
    let i = 0;
    let c: List<T> = this;
    while (c.isCons()) {
      if (c.head === val) return i;
      c = c.tail;
      i++;
    }
    return -1;
  }

  reverse(): List<T> {
    let c: List<T> = this;
    let r: List<T> = List.Nil();
    while (c.isCons()) {
      r = new Cons(c.head, r);
      c = c.tail;
    }
    return r;
  }

  zip<R>(b: List<R>): List<[T, R]> {
    if (b.isCons()) return new Cons([this.head, b.head], this.tail.zip(b.tail));
    return List.Nil();
  }
  zipWith<R, U>(b: List<R>, fn: (a: T, b: R) => U): List<U> {
    if (b.isCons()) return new Cons(fn(this.head, b.head), this.tail.zipWith(b.tail, fn));
    return List.Nil();
  }
  zipWith_<R>(o: List<R>, fn: (a: T, b: R) => void): void {
    let a: List<T> = this;
    let b: List<R> = o;
    while (a.isCons() && b.isCons()) {
      fn(a.head, b.head);
      a = a.tail;
      b = b.tail;
    }
  }
  zipWithR_<R>(o: List<R>, fn: (a: T, b: R) => void): void {
    if (o.isCons()) {
      this.tail.zipWithR_(o.tail, fn);
      fn(this.head, o.head);
    }
  }

  foldr<R>(cons: (a: T, b: R) => R, nil: R): R {
    return cons(this.head, this.tail.foldr(cons, nil));
  }
  foldl<R>(cons: (a: R, b: T) => R, nil: R): R {
    return this.tail.foldl(cons, cons(nil, this.head));
  }

  length(): number {
    let i = 0;
    let c: List<T> = this;
    while (c.isCons()) {
      c = c.tail;
      i++;
    }
    return i;
  }

  uncons(): [T, List<T>] {
    return [this.head, this.tail];
  }

}

export const nil: List<never> = new Nil();
export const cons = <T>(head: T, tail: List<T>): List<T> => new Cons(head, tail);
