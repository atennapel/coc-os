import { Var, Meta, Type, Name, Term, App, Abs, Pi } from './terms';
import { List, Nil, Cons, foldr, lookup } from '../list';
import { impossible } from '../util';

export type Head = Var | Meta;
export type Clos = (val: Val) => Val;
export type Val
  = { tag: 'VNe', head: Head, args: List<[boolean, Val]> }
  | { tag: 'VAbs', name: Name, type: Val, impl: boolean, body: Clos }
  | { tag: 'VPi', name: Name, type: Val, impl: boolean, body: Clos }
  | { tag: 'Type' };

export type EnvV = List<[Name, Val | true]>;

export const VType = Type as Val;
export const VNe = (head: Head, args: List<[boolean, Val]> = Nil): Val =>
  ({ tag: 'VNe', head, args });
export const VAbs = (name: Name, type: Val, impl: boolean, body: Clos): Val =>
  ({ tag: 'VAbs', name, type, impl, body});
export const VPi = (name: Name, type: Val, impl: boolean, body: Clos): Val =>
  ({ tag: 'VPi', name, type, impl, body});

export const VVar = (name: Name): Val => VNe(Var(name));

export const nextName = (name: Name): Name => {
  const ps = name.split('$');
  if (ps.length === 2) {
    const a = ps[0];
    const b = +ps[1];
    if (!isNaN(b)) return `${a}\$${b + 1}`;
    return a;
  }
  return `${name}\$${0}`;
};
export const fresh = (vs: EnvV, name: Name): Name => {
  if (name === '_') return '_';
  while (lookup(vs, name) !== null) name = nextName(name);
  return name;
};

export const force = (v: Val): Val => {
  if (v.tag === 'VNe' && v.head.tag === 'Meta' && v.head.val)
    return force(foldr(([i, x], y) => vapp(y, i, x), v.head.val, v.args));
  return v;
};

export const vapp = (a: Val, impl: boolean, b: Val): Val => {
  if (a.tag === 'VAbs') return a.body(b);
  if (a.tag === 'VNe') return VNe(a.head, Cons([impl, b], a.args));
  return impossible('vapp');
};

export const evaluate = (t: Term, vs: EnvV = Nil): Val => {
  if (t.tag === 'Type') return t;
  if (t.tag === 'Var') {
    const v = lookup(vs, t.name);
    return v === true ? VVar(t.name) : v !== null ? v : impossible(`evaluate ${t.name}`)
  }
  if (t.tag === 'App')
    return vapp(evaluate(t.left, vs), t.impl, evaluate(t.right, vs));
  if (t.tag === 'Abs' && t.type)
    return VAbs(t.name, evaluate(t.type, vs), t.impl, v => evaluate(t.body, Cons([t.name, v], vs)));
  if (t.tag === 'Pi')
    return VPi(t.name, evaluate(t.type, vs), t.impl, v => evaluate(t.body, Cons([t.name, v], vs)));
  if (t.tag === 'Let')
    return evaluate(t.body, Cons([t.name, evaluate(t.val)], vs));
  if (t.tag === 'Meta')
    return t.val || VNe(t);
  return impossible('evaluate');
};

export const quote = (v_: Val, vs: EnvV = Nil): Term => {
  const v = force(v_);
  if (v.tag === 'Type') return v;
  if (v.tag === 'VNe')
    return foldr(
      ([impl, x], y) => App(y, impl, quote(x, vs)),
      v.head as Term,
      v.args,
    );
  if (v.tag === 'VAbs') {
    const x = fresh(vs, v.name);
    return Abs(x, quote(v.type, vs), v.impl, quote(v.body(VVar(x)), Cons([x, true], vs)));
  }
  if (v.tag === 'VPi') {
    const x = fresh(vs, v.name);
    return Pi(x, quote(v.type, vs), v.impl, quote(v.body(VVar(x)), Cons([x, true], vs)));
  }
  return v;
};

// only use this with elaborated terms
export const normalize = (t: Term, vs: EnvV = Nil): Term =>
  quote(evaluate(t, vs), vs); 
