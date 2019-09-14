import { EnvV, fresh, BoundV } from './env';
import { Val, VVar } from './values';
import { terr } from './util';
import { showTerm } from './terms';
import { quote, vapp } from './nbe';
import { Cons, zipWith_ } from './list';

export const unify = (vs: EnvV, a: Val, b: Val): void => {
  if (a.tag === 'Type' && b.tag === 'Type') return;
  if (a.tag === 'VAbs' && b.tag === 'VAbs') {
    const x = fresh(vs, a.name);
    const v = VVar(x);
    unify(vs, a.type, b.type);
    unify(Cons(BoundV(x), vs), a.body(v), b.body(v));
    return;
  }
  if (a.tag === 'VPi' && b.tag === 'VPi') {
    const x = fresh(vs, a.name);
    const v = VVar(x);
    unify(vs, a.type, b.type);
    unify(Cons(BoundV(x), vs), a.body(v), b.body(v));
    return;
  }
  if (a.tag === 'VAbs') {
    const x = fresh(vs, a.name);
    const v = VVar(x);
    return unify(Cons(BoundV(x), vs), a.body(v), vapp(b, v));
  }
  if (b.tag === 'VAbs') {
    const x = fresh(vs, b.name);
    const v = VVar(x);
    return unify(Cons(BoundV(x), vs), vapp(a, v), b.body(v));
  }
  if (a.tag === 'VNe' && b.tag === 'VNe' && a.head === b.head)
    return zipWith_((x, y) => unify(vs, x, y), a.args, b.args);
  return terr(`cannot unify ${showTerm(quote(a, vs))} ~ ${showTerm(quote(b, vs))}`);
};
