import { Ix } from '../names';
import { Term as TTerm, showTerm as showTTerm } from '../core/syntax';
import { impossible } from '../util';

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

export const erase = (t: TTerm, map: { [key: string]: Term } = {}): Term => {
  if (t.tag === 'Global') return map[t.name] || impossible(`erase: global not in map: ${t.name}`);
  if (t.tag === 'Var') return Var(t.index);
  if (t.tag === 'App') return t.plicity.erased ? erase(t.left, map) : App(erase(t.left, map), erase(t.right, map));
  if (t.tag === 'Abs') return t.plicity.erased ? shift(-1, 0, erase(t.body, map)) : Abs(erase(t.body, map));
  if (t.tag === 'Let') return t.plicity.erased ? shift(-1, 0, erase(t.body, map)) : App(Abs(erase(t.body, map)), erase(t.val, map));
  if (t.tag === 'Roll') return erase(t.term, map);
  if (t.tag === 'Unroll') return erase(t.term, map);
  if (t.tag === 'Assert') return erase(t.term, map);
  if (t.tag === 'Pi') return idTerm;
  if (t.tag === 'Fix') return idTerm;
  if (t.tag === 'Type') return idTerm;
  throw new Error(`unable to erase: ${showTTerm(t)}`);
};
