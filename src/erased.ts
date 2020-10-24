import { Ix, Name } from './names';
import { Data } from './utils/adt';

export type Term = Data<{
  Var: { tag: 'Var', index: Ix };
  Global: { name: Name },
  Abs: { body: Term },
  App: { left: Term, right: Term },
  Pair: { fst: Term, snd: Term },
  Proj: { proj: 'fst' | 'snd', term: Term },
  Let: { val: Term, body: Term },
}>;
export const Var = (index: Ix): Term => ({ tag: 'Var', index });
export const Global = (name: Name): Term => ({ tag: 'Global', name });
export const App = (left: Term, right: Term): Term => ({ tag: 'App', left, right });
export const Abs = (body: Term): Term => ({ tag: 'Abs', body });
export const Pair = (fst: Term, snd: Term): Term => ({ tag: 'Pair', fst, snd });
export const Proj = (proj: 'fst' | 'snd', term: Term): Term => ({ tag: 'Proj', proj, term });
export const Let = (val: Term, body: Term): Term => ({ tag: 'Let', val, body });

export const termId = Abs(Var(0));

export const flattenApp = (t: Term): [Term, Term[]] => {
  const r: Term[] = [];
  while (t.tag === 'App') {
    r.push(t.right);
    t = t.left;
  }
  return [t, r.reverse()];
};
export const flattenPair = (t: Term): Term[] => {
  const r: Term[] = [];
  while (t.tag === 'Pair') {
    r.push(t.fst);
    t = t.snd;
  }
  r.push(t);
  return r;
};

const showP = (b: boolean, t: Term): string => b ? `(${show(t)})` : show(t);
export const show = (t: Term): string => {
  if (t.tag === 'Var') return `${t.index}`;
  if (t.tag === 'Global') return `${t.name}`;
  if (t.tag === 'App') {
    const [f, as] = flattenApp(t);
    return `${showP(f.tag === 'Abs' || f.tag === 'Let', f)} ${as.map(t => showP(t.tag === 'Abs' || t.tag === 'App' || t.tag === 'Let' || t.tag === 'Proj', t)).join(' ')}`;
  }
  if (t.tag === 'Abs') return `\\${show(t.body)}`;
  if (t.tag === 'Pair') return `(${flattenPair(t).map(show).join(', ')})`;
  if (t.tag === 'Proj') return `${t.proj} ${show(t.term)}`;
  if (t.tag === 'Let') return `let ${showP(t.val.tag === 'Let', t.val)} in ${show(t.body)}`;
  return t;
};
