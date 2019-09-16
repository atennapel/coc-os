import { Term, showTerm } from './terms';
import { Core, CType, CVar, CApp, CLet, CPi, CAbs } from '../core/terms';
import { impossible } from '../util';
import { Ix, Name } from '../names';
import { List, lookup, Nil, Cons } from '../list';

export const toCore = (t: Term, k: number = 0, ns: List<[Name, Ix]> = Nil): Core => {
  if (t.tag === 'Type') return CType;
  if (t.tag === 'Var') {
    const i = lookup(ns, t.name);
    return i === null ? impossible('toCore var') : CVar(k - i - 1);
  }
  if (t.tag === 'Abs' && t.type)
    return CAbs(toCore(t.type, k, ns), toCore(t.body, k + 1, Cons([t.name, k], ns)));
  if (t.tag === 'Pi')
    return CPi(toCore(t.type, k, ns), toCore(t.body, k + 1, Cons([t.name, k], ns)));
  if (t.tag === 'App')
    return CApp(toCore(t.left, k, ns), toCore(t.right, k, ns));
  if (t.tag === 'Let' && t.type)
    return CLet(toCore(t.type, k, ns), toCore(t.value, k, ns), toCore(t.body, k + 1, Cons([t.name, k], ns)));

  if (t.tag === 'Abs') return impossible(`untyped abstraction in toCore: ${showTerm(t)}`);
  if (t.tag === 'Let') return impossible(`untyped let in toCore: ${showTerm(t)}`);
  if (t.tag === 'Hole') return impossible(`hole in toCore: ${showTerm(t)}`);
  if (t.tag === 'Ann') return impossible(`annotation in toCore: ${showTerm(t)}`);
  if (t.tag === 'Meta') return impossible(`meta in toCore: ${showTerm(t)}`);

  return impossible('toCore');
};
