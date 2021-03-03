import { Ix, Lvl, Name } from './names';
import { cons, List, nil } from './utils/List';
import { EnvV, Val, VVar } from './values';

export interface EntryT {
  readonly type: Val;
  readonly erased: boolean;
  readonly bound: boolean;
  readonly inserted: boolean;
}
export const EntryT = (type: Val, erased: boolean, bound: boolean, inserted: boolean): EntryT =>
  ({ type, erased, bound, inserted });

export type EnvT = List<EntryT>;

export const indexEnvT = (ts: EnvT, ix: Ix): [EntryT, Ix, number] | null => {
  let l: EnvT = ts;
  let i = 0;
  let erased = 0;
  while (l.isCons()) {
    if (l.head.inserted) {
      l = l.tail;
      i++;
      continue;
    }
    if (ix === 0) return [l.head, i, erased];
    if (l.head.erased) erased++;
    i++;
    ix--;
    l = l.tail;
  }
  return null;
};

export class Local {

  readonly erased: boolean;
  readonly level: Lvl;
  readonly ns: List<Name>;
  readonly nsSurface: List<Name>;
  readonly ts: EnvT;
  readonly vs: EnvV;

  constructor(
    erased: boolean,
    level: Lvl,
    ns: List<Name>,
    nsSurface: List<Name>,
    ts: EnvT,
    vs: EnvV,
  ) {
    this.erased = erased;
    this.level = level;
    this.ns = ns;
    this.nsSurface = nsSurface;
    this.ts = ts;
    this.vs = vs;
  }

  private static _empty: Local;
  static empty() {
    if (Local._empty === undefined) Local._empty = new Local(false, 0, nil, nil, nil, nil);
    return Local._empty;  
  }

  bind(erased: boolean, name: Name, ty: Val): Local {
    return new Local(
      this.erased,
      this.level + 1,
      cons(name, this.ns),
      cons(name, this.nsSurface),
      cons(EntryT(ty, erased, true, false), this.ts),
      cons(VVar(this.level), this.vs),
    );
  }
  insert(erased: boolean, name: Name, ty: Val): Local {
    return new Local(
      this.erased,
      this.level + 1,
      cons(name, this.ns),
      this.nsSurface,
      cons(EntryT(ty, erased, true, true), this.ts),
      cons(VVar(this.level), this.vs),
    );
  }
  define(erased: boolean, name: Name, ty: Val, val: Val): Local {
    return new Local(
      this.erased,
      this.level + 1,
      cons(name, this.ns),
      cons(name, this.nsSurface),
      cons(EntryT(ty, erased, false, false), this.ts),
      cons(val, this.vs),
    );
  }

  undo(): Local {
    if (this.level === 0) return this;
    return new Local(
      this.erased,
      this.level - 1,
      (this.ns as any).tail,
      (this.nsSurface as any).tail,
      (this.ts as any).tail,
      (this.vs as any).tail,
    );
  }

  inType(): Local {
    return new Local(
      true,
      this.level,
      this.ns,
      this.nsSurface,
      this.ts,
      this.vs,
    );
  }

}
