import { Ix } from '../names';
import { Term as TTerm, showTerm as showTTerm } from '../core/syntax';

export type Term = Var | App | Abs;

export type Var = { tag: 'Var', index: Ix };
export const Var = (index: Ix): Var => ({ tag: 'Var', index });
export type App = { tag: 'App', left: Term, right: Term };
export const App = (left: Term, right: Term): App => ({ tag: 'App', left, right });
export type Abs = { tag: 'Abs', body: Term };
export const Abs = (body: Term): Abs => ({ tag: 'Abs', body });

export const idTerm = Abs(Var(0));

export const showTermS = (t: Term): string => {
  if (t.tag === 'Var') return `${t.index}`;
  if (t.tag === 'App') return `(${showTermS(t.left)} ${showTermS(t.right)})`;
  if (t.tag === 'Abs') return `(\\${showTermS(t.body)})`;
  return t;
};

export const flattenApp = (t: Term): [Term, Term[]] => {
  const r: Term[] = [];
  while (t.tag === 'App') {
    r.push(t.right);
    t = t.left;
  }
  return [t, r.reverse()];
};

export const showTermP = (b: boolean, t: Term): string =>
  b ? `(${showTerm(t)})` : showTerm(t);
export const showTerm = (t: Term): string => {
  if (t.tag === 'Var') return `${t.index}`;
  if (t.tag === 'App') {
    const [f, as] = flattenApp(t);
    return `${showTermP(f.tag === 'Abs' || f.tag === 'App', f)} ${
      as.map((t, i) =>
          `${showTermP(t.tag === 'App' || (t.tag === 'Abs' && i < as.length - 1), t)}`).join(' ')}`;
  }
  if (t.tag === 'Abs') return `\\${showTerm(t.body)}`;
  return t;
};

export const shift = (d: Ix, c: Ix, t: Term): Term => {
  if (t.tag === 'Var') return t.index < c ? t : Var(t.index + d);
  if (t.tag === 'Abs') return Abs(shift(d, c + 1, t.body));
  if (t.tag === 'App') return App(shift(d, c, t.left), shift(d, c, t.right));
  return t;
};

export const erase = (t: TTerm): Term => {
  if (t.tag === 'Var') return Var(t.index);
  if (t.tag === 'App') return t.meta.erased ? erase(t.left) : App(erase(t.left), erase(t.right));
  if (t.tag === 'Abs') return t.meta.erased ? shift(-1, 0, erase(t.body)) : Abs(erase(t.body));
  if (t.tag === 'Let') return t.meta.erased ? shift(-1, 0, erase(t.body)) : App(Abs(erase(t.body)), erase(t.val));
  if (t.tag === 'Roll') return erase(t.term);
  if (t.tag === 'Unroll') return erase(t.term);
  if (t.tag === 'Pi') return idTerm;
  if (t.tag === 'Fix') return idTerm;
  if (t.tag === 'Type') return idTerm;
  throw new Error(`unable to erase: ${showTTerm(t)}`);
};
