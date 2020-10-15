import { Ix, Name } from './names';

export type Term = Var | Global | App | Abs | Pair | Proj | Let;

export type Var = { tag: 'Var', index: Ix };
export const Var = (index: Ix): Var => ({ tag: 'Var', index });
export type Global = { tag: 'Global', name: Name };
export const Global = (name: Name): Global => ({ tag: 'Global', name });
export type App = { tag: 'App', left: Term, right: Term };
export const App = (left: Term, right: Term): App => ({ tag: 'App', left, right });
export type Abs = { tag: 'Abs', body: Term };
export const Abs = (body: Term): Abs => ({ tag: 'Abs', body });
export type Pair = { tag: 'Pair', fst: Term, snd: Term };
export const Pair = (fst: Term, snd: Term): Pair => ({ tag: 'Pair', fst, snd });
export type Proj = { tag: 'Proj', proj: 'fst' | 'snd', term: Term };
export const Proj = (proj: 'fst' | 'snd', term: Term): Proj => ({ tag: 'Proj', proj, term });
export type Let = { tag: 'Let', val: Term, body: Term };
export const Let = (val: Term, body: Term): Let => ({ tag: 'Let', val, body });

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
  if (t.tag === 'Pair') return `(${flattenPair(t).join(', ')})`;
  if (t.tag === 'Proj') return `${t.proj} ${show(t.term)}`;
  if (t.tag === 'Let') return `let ${showP(t.val.tag === 'Let', t.val)} in ${show(t.body)}`;
  return t;
};
