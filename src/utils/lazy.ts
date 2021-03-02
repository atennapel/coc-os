export class Lazy<T> {

  private readonly fn: () => T;
  private forced: boolean = false;
  private value: T | null = null;

  constructor(fn: () => T) {
    this.fn = fn;
  }

  static from<T>(fn: () => T): Lazy<T> {
    return new Lazy(fn);
  }
  static of<T>(val: T): Lazy<T> {
    return Lazy.from(() => val);
  }
  static value<T>(val: T): Lazy<T> {
    const l = new Lazy(() => val);
    l.forced = true;
    l.value = val;
    return l;
  }

  get(): T {
    if (!this.forced) {
      this.value = this.fn();
      this.forced = true;
    }
    return this.value as T;
  }

  map<R>(fn: (val: T) => R): Lazy<R> {
    return new Lazy(() => fn(this.get()));
  }

}
