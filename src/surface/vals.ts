import { List, Nil, toString, foldr, Cons, lookup } from '../list';
import { Name, nextName } from '../names';
import { TMetaId, getMeta } from './metas';
import { Maybe, caseMaybe, Just, Nothing } from '../maybe';
import { showTerm, Term, Type, App, Abs, Pi, Var, Meta, Let, Ann, Opq } from './syntax';
import { impossible } from '../util';
import { getEnv } from './env';
import { log } from '../config';

export type Head
  = { tag: 'HVar', name: Name }
  | { tag: 'HMeta', id: TMetaId };
export type Clos = (val: Val) => Val;
export type Val
  = { tag: 'VNe', head: Head, args: List<Val> }
  | { tag: 'VAbs', name: Name, type: Val, body: Clos }
  | { tag: 'VPi', name: Name, type: Val, body: Clos }
  | { tag: 'VOpq', name: Name }
  | { tag: 'VType' };

export type EnvV = List<[Name, Maybe<Val>]>;
export const showEnvV = (l: EnvV): string =>
  toString(l, ([x, b]) => caseMaybe(b, val => `${x} = ${showTerm(quote(val, l))}`, () => x));

export const HVar = (name: Name): Head => ({ tag: 'HVar', name });
export const HMeta = (id: TMetaId): Head => ({ tag: 'HMeta', id });

export const VNe = (head: Head, args: List<Val> = Nil): Val =>
  ({ tag: 'VNe', head, args });
export const VAbs = (name: Name, type: Val, body: Clos): Val =>
  ({ tag: 'VAbs', name, type, body});
export const VPi = (name: Name, type: Val, body: Clos): Val =>
  ({ tag: 'VPi', name, type, body});
export const VOpq = (name: Name): Val =>
  ({ tag: 'VOpq', name });
export const VType: Val = { tag: 'VType' };

export const VVar = (name: Name): Val => VNe(HVar(name));
export const VMeta = (id: TMetaId): Val => VNe(HMeta(id));

export const force = (v: Val): Val => {
  if (v.tag === 'VNe' && v.head.tag === 'HMeta') {
    const val = getMeta(v.head.id);
    if (val.tag === 'Unsolved') return v;
    return force(foldr((x, y) => vapp(y, x), val.val, v.args));
  }
  return v;
};

export const freshName = (vs: EnvV, name_: Name): Name => {
  if (name_ === '_') return '_';
  let name = name_;
  while (lookup(vs, name) !== null)
    name = nextName(name);
  log(() => `freshName ${name_} -> ${name} in ${showEnvV(vs)}`);
  return name;
};

const vid = VAbs('x', VType, v => v);

export const vapp = (a: Val, b: Val): Val => {
  if (a.tag === 'VAbs') return a.body(b);
  if (a.tag === 'VOpq') return vid;
  if (a.tag === 'VNe') return VNe(a.head, Cons(b, a.args));
  return impossible('vapp');
};

export const evaluate = (t: Term, vs: EnvV = Nil): Val => {
  if (t.tag === 'Type') return VType;
  if (t.tag === 'Var') {
    const v = lookup(vs, t.name);
    if (!v) {
      const r = getEnv(t.name);
      if (!r) return impossible(`evaluate ${t.name}`);
      return r.opaque ? VVar(t.name) : r.val;
    }
    return caseMaybe(v, v => v, () => VVar(t.name));
  }
  if (t.tag === 'App')
    return vapp(evaluate(t.left, vs), evaluate(t.right, vs));
  if (t.tag === 'Abs' && t.type)
    return VAbs(t.name, evaluate(t.type, vs),  v => evaluate(t.body, Cons([t.name, Just(v)], vs)));
  if (t.tag === 'Pi')
    return VPi(t.name, evaluate(t.type, vs), v => evaluate(t.body, Cons([t.name, Just(v)], vs)));
  if (t.tag === 'Let')
    return evaluate(t.body, Cons([t.name, Just(evaluate(t.val, vs))], vs));
  if (t.tag === 'Meta') {
    const s = getMeta(t.id);
    return s.tag === 'Solved' ? s.val : VMeta(t.id);
  }
  if (t.tag === 'Opq') return VOpq(t.name);
  return impossible('evaluate');
};

export const quote = (v_: Val, vs: EnvV = Nil): Term => {
  const v = force(v_);
  if (v.tag === 'VType') return Type;
  if (v.tag === 'VNe') {
    const h = v.head;
    return foldr(
      (x, y) => App(y, quote(x, vs)),
      h.tag === 'HVar' ? Var(h.name) : Meta(h.id),
      v.args,
    );
  }
  if (v.tag === 'VAbs') {
    const x = freshName(vs, v.name);
    return Abs(x, quote(v.type, vs), quote(v.body(VVar(x)), Cons([x, Nothing], vs)));
  }
  if (v.tag === 'VPi') {
    const x = freshName(vs, v.name);
    return Pi(x, quote(v.type, vs), quote(v.body(VVar(x)), Cons([x, Nothing], vs)));
  }
  if (v.tag === 'VOpq') return Opq(v.name);
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
      [true, App(spine[1], zonk(vs, tm.right))] :
      [false, vapp(spine[1], evaluate(tm.right, vs))];
  }
  return [true, zonk(vs, tm)];
};
export const zonk = (vs: EnvV, tm: Term): Term => {
  if (tm.tag === 'Meta') {
    const s = getMeta(tm.id);
    return s.tag === 'Solved' ? quote(s.val, vs) : tm;
  }
  if (tm.tag === 'Pi')
    return Pi(tm.name, zonk(vs, tm.type), zonk(Cons([tm.name, Nothing], vs), tm.body));
  if (tm.tag === 'Abs')
    return Abs(tm.name, tm.type ? zonk(vs, tm.type) : null, zonk(Cons([tm.name, Nothing], vs), tm.body));
  if (tm.tag === 'Let')
    return Let(tm.name, zonk(vs, tm.val), zonk(Cons([tm.name, Nothing], vs), tm.body));
  if (tm.tag === 'Ann') return Ann(zonk(vs, tm.term), tm.type);
  if (tm.tag === 'App') {
    const spine = zonkSpine(vs, tm.left);
    return spine[0] ?
      App(spine[1], zonk(vs, tm.right)) :
      quote(vapp(spine[1], evaluate(tm.right, vs)), vs);
  }
  return tm;
};

// only use this with elaborated terms
export const normalize = (t: Term, vs: EnvV = Nil): Term =>
  quote(evaluate(t, vs), vs);
