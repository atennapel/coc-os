import { List, filter, map, foldr, Nil, Cons, lookup, foldl, toString } from '../list';
import { Name, Term, Meta, App, Var, showTerm, Pi, Type, Abs, Let } from './terms';
import { Val, EnvV, quote, force, fresh, VVar, evaluate, VType, VPi, zonk, showEnvV } from './vals';
import { unify } from './unification';
import { terr } from '../util';
import { log } from '../config';

export type EnvT = List<[Name, { bound: boolean, type: Val }]>;
export const Bound = (type: Val) => ({ bound: true, type });
export const Def = (type: Val) => ({ bound: false, type });
export const showEnvT = (l: EnvT, vs: EnvV): string =>
  toString(l, ([x, b]) => `${x} :${b.bound ? '' : '='} ${showTerm(quote(b.type, vs))}`);

const freshMeta = (ts: EnvT): Term => {
  const spine = map(filter(ts, ([x, { bound }]) => bound), ([x, _]) => Var(x));
  return foldr((x, y) => App(y, false, x), Meta() as Term, spine);
};

const inst = (ts: EnvT, vs: EnvV, ty_: Val): [Val, List<Term>] => {
  const ty = force(ty_);
  if (ty.tag === 'VPi' && ty.impl) {
    const m = freshMeta(ts);
    const vm = evaluate(m, vs);
    const [res, args] = inst(ts, vs, ty.body(vm));
    return [res, Cons(m, args)];
  }
  return [ty, Nil];
};

const check = (ts: EnvT, vs: EnvV, tm: Term, ty_: Val): Term => {
  const ty = force(ty_);
  log(() => `check ${showTerm(tm)} : ${showTerm(quote(ty, vs))} in ${showEnvT(ts, vs)} and ${showEnvV(vs)}`);
  if (ty.tag === 'Type' && tm.tag === 'Type') return Type;
  if (tm.tag === 'Abs' && !tm.type && ty.tag === 'VPi' && tm.impl === ty.impl) {
    const x = fresh(vs, ty.name);
    const vx = VVar(x);
    const body = check(Cons([tm.name, Bound(ty.type)], ts), Cons([tm.name, vx], vs), tm.body, ty.body(vx));
    return Abs(tm.name, quote(ty.type, vs), tm.impl, body);
  }
  if (ty.tag === 'VPi' && ty.impl && !(tm.tag === 'Abs' && tm.type && tm.impl)) {
    const x = fresh(vs, ty.name);
    const vx = VVar(x);
    const term = check(Cons([x, Bound(ty.type)], ts), Cons([x, true], vs), tm, ty.body(vx));
    return Abs(x, quote(ty.type, vs), true, term);
  }
  /*
  if (tm.tag === 'App') {
    const [fn, args] = flattenApp(tm);
    const [vty, fntm] = synth(ts, vs, fn);
    const [rt, rem, targs] = collect(ts, vs, vty, args);
    const [rtinst, ms] = inst(ts, vs, rt);
    unify(vs, rtinst, vty);
    const tms = handleArgs(ts, vs, targs);
    return;
  }
  */
  if (tm.tag === 'Hole')
    return freshMeta(ts);
  if (tm.tag === 'Let') {
    if (tm.type) {
      const type = check(ts, vs, tm.type, VType);
      const vt = evaluate(type, vs);
      const val = check(ts, vs, tm.val, vt);
      const vv = evaluate(val, vs);
      const body = check(Cons([tm.name, Def(vt)], ts), Cons([tm.name, vv], vs), tm.body, ty);
      return Let(tm.name, type, tm.impl, val, body);
    } else {
      const [vt, val] = synth(ts, vs, tm.val);
      const vv = evaluate(val, vs);
      const body = check(Cons([tm.name, Def(vt)], ts), Cons([tm.name, vv], vs), tm.body, ty);
      return Let(tm.name, quote(vt, vs), tm.impl, val, body);
    }
  }
  const [ty2, term] = synth(ts, vs, tm);
  const [ty2inst, targs] = inst(ts, vs, ty2);
  unify(vs, ty2inst, ty);
  return foldl((a, m) => App(a, true, m), term, targs);
};

const freshPi = (ts: EnvT, vs: EnvV, x: Name, impl: boolean): Val => {
  const a = freshMeta(ts);
  const va = evaluate(a, vs);
  const b = freshMeta(Cons([x, Bound(va)], ts));
  return VPi(x, va, impl, v => evaluate(b, Cons([x, v], vs)));
};

const synth = (ts: EnvT, vs: EnvV, tm: Term): [Val, Term] => {
  log(() => `synth ${showTerm(tm)} in ${showEnvT(ts, vs)} and ${showEnvV(vs)}`);
  if (tm.tag === 'Type') return [VType, tm];
  if (tm.tag === 'Var') {
    const ty = lookup(ts, tm.name);
    if (!ty) return terr(`undefined var ${tm.name}`);
    return [ty.type, tm];
  }
  if (tm.tag === 'Ann') {
    const type = check(ts, vs, tm.type, VType);
    const vt = evaluate(type, vs);
    const term = check(ts, vs, tm.term, vt);
    return [vt, term];
  }
  if (tm.tag === 'App') {
    /*
    const [fn, args] = flattenApp(tm);
    const [ty, fntm] = synth(ts, vs, fn);
    const [rt, rem, targs] = collect(ts, vs, ty, args);
    const tms = handleArgs(ts, vs, targs);
    const res = foldl((acc, x) => x[0] ? App(acc, true, x[1]) : App(acc, false, ), fntm, targs);
    return [rt, res];
    */
   const [fn, fntm] = synth(ts, vs, tm.left);
   const [rt, res, ms] = synthapp(ts, vs, fn, tm.impl, tm.right);
   return [rt, App(foldl((f, a) => App(f, true, a), fntm, ms), tm.impl, res)];
  }
  if (tm.tag === 'Abs') {
    if (tm.type) {
      const type = check(ts, vs, tm.type, VType);
      const vt = evaluate(type, vs);
      const [rt, body] = synth(Cons([tm.name, Bound(vt)], ts), Cons([tm.name, true], vs), tm.body);
      return [
        evaluate(Pi(tm.name, tm.type, tm.impl, quote(rt, Cons([tm.name, true], vs))), vs),
        Abs(tm.name, type, tm.impl, body),
      ];
    } else {
      const pi = freshPi(ts, vs, tm.name, tm.impl);
      const term = check(ts, vs, tm, pi);
      return [pi, term];
    }
  }
  if (tm.tag === 'Hole') {
    const t = freshMeta(ts);
    const vt = evaluate(freshMeta(ts), vs);
    return [vt, t];
  }
  if (tm.tag === 'Let') {
    if (tm.type) {
      const type = check(ts, vs, tm.type, VType);
      const vt = evaluate(type, vs);
      const val = check(ts, vs, tm.val, vt);
      const vv = evaluate(val, vs);
      const [tr, body] = synth(Cons([tm.name, Def(vt)], ts), Cons([tm.name, vv], vs), tm.body);
      return [tr, Let(tm.name, type, tm.impl, val, body)];
    } else {
      const [vt, val] = synth(ts, vs, tm.val);
      const vv = evaluate(val, vs);
      const [tr, body] = synth(Cons([tm.name, Def(vt)], ts), Cons([tm.name, vv], vs), tm.body);
      return [tr, Let(tm.name, quote(vt, vs), tm.impl, val, body)];
    }
  }
  if (tm.tag === 'Pi') {
    const type = check(ts, vs, tm.type, VType);
    const vt = evaluate(type, vs);
    const body = check(Cons([tm.name, Bound(vt)], ts), Cons([tm.name, true], vs), tm.body, VType);
    return [VType, Pi(tm.name, type, tm.impl, body)];
  }
  return terr(`cannot synth ${showTerm(tm)}`);
};

/*
const collect = (ts: EnvT, vs: EnvV, ty_: Val, args: [boolean, Term][]): [Val, [boolean, Term][], List<[false, Term, Val] | [true, Term]>] => {
  const ty = force(ty_);
  if (args.length === 0) return [ty, [], Nil];
  const impl = args[0][0];
  const tm = args[0][1];
  if (ty.tag === 'VPi' && ty.name === '_' && ty.impl === impl) {
    // (_:a) -> b @ c (pair up)
    const [rt, rem, rargs] = collect(ts, vs, ty.body(VType), args.slice(1));
    return [rt, rem, Cons([false, tm, ty.type], rargs)];
  }
  if (ty.tag === 'VPi' && ty.impl && !impl) {
    // {a} -> b @ c (instantiate with meta then b @ c)
    const m = freshMeta(ts);
    const vm = evaluate(m, vs);
    const [rt, rem, rargs] = collect(ts, vs, ty.body(vm), args);
    return [rt, rem, Cons([true, m], rargs)];
  }
  if (ty.tag === 'VNe' && ty.head.tag === 'Meta') {
    const x = fresh(vs, 'x');
    const pi = freshPi(ts, vs, x, impl);
    unify(Cons([x, true], vs), ty, pi);
    return collect(ts, vs, ty, args);
  }
  return [ty, args, Nil];
};

const isMeta = (ty: Val) => ty.tag === 'VNe' && ty.head.tag === 'Meta';
const APP_CHECK_ORDER: ((tm: Term, ty: Val) => boolean)[] = [
  (tm, ty) => tm.tag === 'Var' && !isMeta(ty),
  (tm, ty) => tm.tag === 'Ann' && !isMeta(ty),
  (_, ty) => !isMeta(ty),
  (tm, _) => tm.tag === 'Var',
  (tm, _) => tm.tag === 'Ann',
];
const checkOnly = (ts: EnvT, vs: EnvV, a: [Term, Val][], f: (tm: Term, ty: Val) => boolean, b: [Term, Term | null][]) => {
  for (let i = 0; i < a.length; i++) {
    const [tm, ty] = a[i];
    const fty = force(ty);
    if (f(tm, fty)) {
      const rtm = check(ts, vs, tm, fty);
      const j = b.findIndex(([t]) => t === tm);
      b[j][1] = rtm;
      a.splice(i--, 1);
    }
  }
};
const handleArgs = (ts: EnvT, vs: EnvV, args: List<[false, Term, Val] | [true, Term]>): Term[] => {
  const a = toArrayFilter(args, x => !x[0] ? [x[1], x[2]] as [Term, Val] : impossible('handleArgs'), ([b]) => !b);
  console.log('handleApp', a.map(([t, ty]) => `${showTerm(t)} : ${showTerm(quote(ty, vs))}`).join(' | '));
  const b = a.map(([t]) => [t, null] as [Term, Term | null]);
  APP_CHECK_ORDER.forEach(f => checkOnly(ts, vs, a, f, b));
  checkOnly(ts, vs, a, () => true, b);
  return b.map(([_, ty]) => ty as Term);
};
*/

const synthapp = (ts: EnvT, vs: EnvV, ty: Val, impl: boolean, arg: Term): [Val, Term, List<Term>] => {
  log(() => `synthapp ${showTerm(quote(ty, vs))} @ ${impl ? '{' : ''}${showTerm(arg)}${impl ? '}' : ''} in ${showEnvT(ts, vs)} and ${showEnvV(vs)}`);
  if (ty.tag === 'VPi' && ty.impl && !impl) {
    // {a} -> b @ c (instantiate with meta then b @ c)
    const m = freshMeta(ts);
    const vm = evaluate(m, vs);
    const [rt, ft, l] = synthapp(ts, vs, ty.body(vm), impl, arg);
    return [rt, ft, Cons(m, l)];
  }
  if (ty.tag === 'VPi' && ty.impl === impl) {
    const tm = check(ts, vs, arg, ty.type);
    const vm = evaluate(tm, vs);
    return [ty.body(vm), tm, Nil];
  }
  return terr(`unable to syntapp: ${showTerm(quote(ty, vs))} @ ${impl ? '{' : ''}${showTerm(arg)}${impl ? '}' : ''}`);
};

export const typecheck = (tm: Term, ts: EnvT = Nil, vs: EnvV = Nil): [Term, Term] => {
  const [ty, term] = synth(ts, vs, tm);
  const zty = zonk(vs, quote(ty, vs));
  log(() => showTerm(term));
  const zterm = zonk(vs, term);
  log(() => showTerm(zterm));
  return [zty, zterm];
};
