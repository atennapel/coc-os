import { List, Nil, toString, foldr, Cons, lookup, contains, consAll } from '../list';
import { Name, nextName } from '../names';
import { TMetaId, getMeta } from './metas';
import { Maybe, caseMaybe, Just, Nothing } from '../maybe';
import { showTerm, Term, Type, App, Abs, Pi, Var, Meta, Let, Ann, Open, Fix, Unroll, Roll, Rec, Iota, Both } from './syntax';
import { impossible } from '../util';
import { getEnv } from './env';

export type Head
  = { tag: 'HVar', name: Name }
  | { tag: 'HMeta', id: TMetaId };
export type Clos = (val: Val) => Val;
export type Clos2 = (val1: Val, val2: Val) => Val;
export type Val
  = { tag: 'VNe', head: Head, args: List<[boolean, Val]> }
  | { tag: 'VAbs', name: Name, impl: boolean, type: Val, body: Clos }
  | { tag: 'VPi', name: Name, impl: boolean, type: Val, body: Clos }
  | { tag: 'VFix', self: Name, name: Name, type: Val, body: Clos2 }
  | { tag: 'VRec', name: Name, type: Val, body: Clos }
  | { tag: 'VIota', name: Name, type: Val, body: Clos }
  | { tag: 'VBoth', left: Val, right: Val }
  | { tag: 'VType' };

export type EnvV = {
  vals: List<[Name, Maybe<Val>]>;
  opened: List<Name>;
};
export const emptyEnvV: EnvV = { vals: Nil, opened: Nil };
export const extendV = (vs: EnvV, name: Name, val: Maybe<Val>): EnvV =>
  ({ vals: Cons([name, val], vs.vals), opened: vs.opened });
export const openV = (vs: EnvV, names: Name[]): EnvV =>
  ({ vals: vs.vals, opened: consAll(names, vs.opened) });
export const showEnvV = (l: EnvV): string =>
  toString(l.vals, ([x, b]) => caseMaybe(b, val => `${x} = ${showTerm(quote(val, l))}`, () => x)) +
  ` @ ${toString(l.opened)}`;

export const HVar = (name: Name): Head => ({ tag: 'HVar', name });
export const HMeta = (id: TMetaId): Head => ({ tag: 'HMeta', id });

export const VNe = (head: Head, args: List<[boolean, Val]> = Nil): Val =>
  ({ tag: 'VNe', head, args });
export const VAbs = (name: Name, impl: boolean, type: Val, body: Clos): Val =>
  ({ tag: 'VAbs', name, impl, type, body});
export const VPi = (name: Name, impl: boolean, type: Val, body: Clos): Val =>
  ({ tag: 'VPi', name, impl, type, body});
export const VFix = (self: Name, name: Name, type: Val, body: Clos2): Val =>
  ({ tag: 'VFix', self, name, type, body});
export const VRec = (name: Name, type: Val, body: Clos): Val =>
  ({ tag: 'VRec', name, type, body});
export const VIota = (name: Name, type: Val, body: Clos): Val =>
  ({ tag: 'VIota', name, type, body});
export const VBoth = (left: Val, right: Val): Val =>
  ({ tag: 'VBoth', left, right});
export const VType: Val = { tag: 'VType' };

export const VVar = (name: Name): Val => VNe(HVar(name));
export const VMeta = (id: TMetaId): Val => VNe(HMeta(id));

export const force = (vs: EnvV, v: Val): Val => {
  if (v.tag === 'VNe' && v.head.tag === 'HMeta') {
    const val = getMeta(v.head.id);
    if (val.tag === 'Unsolved') return v;
    return force(vs, foldr(([i, x], y) => vapp(y, i, x), val.val, v.args));
  }
  if (v.tag === 'VNe' && v.head.tag === 'HVar' && lookup(vs.vals, v.head.name) === null) {
    const r = getEnv(v.head.name);
    if (r && r.opaque && contains(vs.opened, v.head.name))
      return force(vs, foldr(([i, x], y) => vapp(y, i, x), r.val, v.args));
  }
  return v;
};

export const freshName = (vs: EnvV, name_: Name): Name => {
  if (name_ === '_') return '_';
  let name = name_;
  while (lookup(vs.vals, name) !== null || getEnv(name))
    name = nextName(name);
  // log(() => `freshName ${name_} -> ${name} in ${showEnvV(vs)}`);
  return name;
};

export const vapp = (a: Val, impl: boolean, b: Val): Val => {
  if (a.tag === 'VAbs') return a.body(b);
  if (a.tag === 'VRec') return vapp(a.body(a), impl, b);
  if (a.tag === 'VNe') return VNe(a.head, Cons([impl, b], a.args));
  return impossible('vapp');
};

export const evaluate = (t: Term, vs: EnvV = emptyEnvV): Val => {
  if (t.tag === 'Type') return VType;
  if (t.tag === 'Var') {
    const v = lookup(vs.vals, t.name);
    if (!v) {
      const r = getEnv(t.name);
      if (!r) return impossible(`evaluate ${t.name}`);
      return r.opaque && !contains(vs.opened, t.name) ? VVar(t.name) : r.val;
    }
    return caseMaybe(v, v => v, () => VVar(t.name));
  }
  if (t.tag === 'App')
    return vapp(evaluate(t.left, vs), t.impl, evaluate(t.right, vs));
  if (t.tag === 'Abs' && t.type)
    return VAbs(t.name, t.impl, evaluate(t.type, vs),  v => evaluate(t.body, extendV(vs, t.name, Just(v))));
  if (t.tag === 'Pi')
    return VPi(t.name, t.impl, evaluate(t.type, vs), v => evaluate(t.body, extendV(vs, t.name, Just(v))));
  if (t.tag === 'Fix')
    return VFix(t.self, t.name, evaluate(t.type, vs), (v, w) => evaluate(t.body, extendV(extendV(vs, t.name, Just(w)), t.self, Just(v))));
  if (t.tag === 'Rec')
    return VRec(t.name, evaluate(t.type, vs), v => evaluate(t.body, extendV(vs, t.name, Just(v))));
  if (t.tag === 'Let')
    return evaluate(t.body, extendV(vs, t.name, Just(evaluate(t.val, vs))));
  if (t.tag === 'Meta') {
    const s = getMeta(t.id);
    return s.tag === 'Solved' ? s.val : VMeta(t.id);
  }
  if (t.tag === 'Open')
    return evaluate(t.body, openV(vs, t.names));
  if (t.tag === 'Unroll') return evaluate(t.body, vs);
  if (t.tag === 'Roll') return evaluate(t.body, vs);
  if (t.tag === 'Iota')
    return VIota(t.name, evaluate(t.type, vs), v => evaluate(t.body, extendV(vs, t.name, Just(v))));
  if (t.tag === 'Both')
    return VBoth(evaluate(t.left, vs), evaluate(t.right, vs));
  return impossible('evaluate');
};

export const quote = (v_: Val, vs: EnvV = emptyEnvV): Term => {
  const v = force(vs, v_);
  if (v.tag === 'VType') return Type;
  if (v.tag === 'VNe') {
    const h = v.head;
    return foldr(
      ([i, x], y) => App(y, i, quote(x, vs)),
      h.tag === 'HVar' ? Var(h.name) : Meta(h.id),
      v.args,
    );
  }
  if (v.tag === 'VAbs') {
    const x = freshName(vs, v.name);
    return Abs(x, v.impl, quote(v.type, vs), quote(v.body(VVar(x)), extendV(vs, x, Nothing)));
  }
  if (v.tag === 'VPi') {
    const x = freshName(vs, v.name);
    return Pi(x, v.impl, quote(v.type, vs), quote(v.body(VVar(x)), extendV(vs, x, Nothing)));
  }
  if (v.tag === 'VFix') {
    const self = freshName(vs, v.self);
    const x = freshName(vs, v.name);
    return Fix(self, x, quote(v.type, vs), quote(v.body(VVar(self), VVar(x)), extendV(extendV(vs, x, Nothing), self, Nothing)));
  }
  if (v.tag === 'VRec') {
    const x = freshName(vs, v.name);
    return Rec(x, quote(v.type, vs), quote(v.body(VVar(x)), extendV(vs, x, Nothing)));
  }
  if (v.tag === 'VIota') {
    const x = freshName(vs, v.name);
    return Iota(x, quote(v.type, vs), quote(v.body(VVar(x)), extendV(vs, x, Nothing)));
  }
  if (v.tag === 'VBoth')
    return Both(quote(v.left, vs), quote(v.right, vs));
  return v;
};

type S = [false, Val] | [true, Term];
const zonkSpine = (vs: EnvV, tm: Term): S => {
  if (tm.tag === 'Meta') {
    const s = getMeta(tm.id);
    if (s.tag === 'Unsolved') return [true, zonk(vs, tm)];
    return [false, s.val];
  }
  if (tm.tag === 'App') {
    const spine = zonkSpine(vs, tm.left);
    return spine[0] ?
      [true, App(spine[1], tm.impl, zonk(vs, tm.right))] :
      [false, vapp(spine[1], tm.impl, evaluate(tm.right, vs))];
  }
  return [true, zonk(vs, tm)];
};
export const zonk = (vs: EnvV, tm: Term): Term => {
  if (tm.tag === 'Meta') {
    const s = getMeta(tm.id);
    return s.tag === 'Solved' ? quote(s.val, vs) : tm;
  }
  if (tm.tag === 'Pi')
    return Pi(tm.name, tm.impl, zonk(vs, tm.type), zonk(extendV(vs, tm.name, Nothing), tm.body));
  if (tm.tag === 'Fix')
    return Fix(tm.self, tm.name, zonk(vs, tm.type), zonk(extendV(extendV(vs, tm.name, Nothing), tm.self, Nothing), tm.body));
  if (tm.tag === 'Rec')
    return Rec(tm.name, zonk(vs, tm.type), zonk(extendV(vs, tm.name, Nothing), tm.body));
  if (tm.tag === 'Iota')
    return Iota(tm.name, zonk(vs, tm.type), zonk(extendV(vs, tm.name, Nothing), tm.body));
  if (tm.tag === 'Abs') {
    const term = zonk(extendV(vs, tm.name, Nothing), tm.body);
    const abs = Abs(tm.name, tm.impl, tm.type ? zonk(vs, tm.type) : null, term);
    return tm.impl && term.tag === 'App' && term.impl && term.right.tag === 'Var' && term.right.name === tm.name ? term.left : abs;
  }
  if (tm.tag === 'Let')
    return Let(tm.name, tm.impl, zonk(vs, tm.val), zonk(extendV(vs, tm.name, Nothing), tm.body));
  if (tm.tag === 'Ann') return Ann(zonk(vs, tm.term), tm.type);
  if (tm.tag === 'App') {
    const spine = zonkSpine(vs, tm.left);
    return spine[0] ?
      App(spine[1], tm.impl, zonk(vs, tm.right)) :
      quote(vapp(spine[1], tm.impl, evaluate(tm.right, vs)), vs);
  }
  if (tm.tag === 'Open')
    return Open(tm.names, zonk(openV(vs, tm.names), tm.body));
  if (tm.tag === 'Unroll')
    return Unroll(zonk(vs, tm.body));
  if (tm.tag === 'Roll')
    return Roll(zonk(vs, tm.type), zonk(vs, tm.body));
  if (tm.tag === 'Both')
    return Roll(zonk(vs, tm.left), zonk(vs, tm.right));
  return tm;
};

// only use this with elaborated terms
export const normalize = (t: Term, vs: EnvV = emptyEnvV): Term =>
  quote(evaluate(t, vs), vs);
export const revaluate = (vs: EnvV, v: Val): Val =>
  evaluate(quote(v, vs), vs);
