export type Ix = number;
export type Term
  = { tag: 'Var', index: Ix }
  | { tag: 'App', left: Term, impl: boolean, right: Term }
  | { tag: 'Abs', type: Term, impl: boolean, body: Term }
  | { tag: 'Pi', type: Term, impl: boolean, body: Term }
  | { tag: 'Let', val: Term, impl: boolean, body: Term }
  | { tag: 'Type' };

export const Var = (index: Ix): Term => ({ tag: 'Var', index });
export const App = (left: Term, impl: boolean, right: Term): Term => ({ tag: 'App', left, impl, right });
export const Abs = (type: Term, impl: boolean, body: Term): Term => ({ tag: 'Abs', type, impl, body });
export const Pi = (type: Term, impl: boolean, body: Term): Term => ({ tag: 'Pi', type, impl, body });
export const Let = (val: Term, impl: boolean, body: Term): Term => ({ tag: 'Let', impl, val, body });
export const Type: Term = { tag: 'Type' };

export const flattenApp = (t: Term): [Term, [boolean, Term][]] => {
  const r: [boolean, Term][] = [];
  while (t.tag === 'App') {
    r.push([t.impl, t.right]);
    t = t.left;
  }
  return [t, r.reverse()];
};
export const flattenAbs = (t: Term): [[boolean, Term][], Term] => {
  const r: [boolean, Term][] = [];
  while (t.tag === 'Abs') {
    r.push([t.impl, t.type]);
    t = t.body;
  }
  return [r, t];
};
export const flattenPi = (t: Term): [[boolean, Term][], Term] => {
  const r: [boolean, Term][] = [];
  while (t.tag === 'Pi') {
    r.push([t.impl, t.type]);
    t = t.body;
  }
  return [r, t];
};

export const showTermP = (b: boolean, t: Term): string =>
  b ? `(${showTerm(t)})` : showTerm(t);
export const showTerm = (t: Term): string => {
  if (t.tag === 'Type') return '*';
  if (t.tag === 'Var') return `${t.index}`;
  if (t.tag === 'App') {
    const [f, as] = flattenApp(t);
    return `${showTermP(f.tag === 'Abs' || f.tag === 'Pi' || f.tag === 'App' || f.tag === 'Let', f)} ${
      as.map(([im, t], i) =>
        im ? `{${showTerm(t)}}` :
          `${showTermP(t.tag === 'App' || (t.tag === 'Let' && i < as.length - 1) || (t.tag === 'Abs' && i < as.length - 1) || (t.tag === 'Pi' && i < as.length - 1), t)}`).join(' ')}`;
  }
  if (t.tag === 'Abs') {
    const [as, b] = flattenAbs(t);
    return `λ${as.map(([im, t]) => im ? `{${showTerm(t)}}` : showTermP(t.tag === 'Abs' || t.tag === 'Pi' || t.tag === 'App' || t.tag === 'Let', t)).join(' ')}. ${showTerm(b)}`;
  }
  if (t.tag === 'Pi') {
    const [as, b] = flattenPi(t);
    return `π${as.map(([im, t]) => im ? `{${showTerm(t)}}` : showTermP(t.tag === 'Abs' || t.tag === 'Pi' || t.tag === 'App' || t.tag === 'Let', t)).join(' ')}. ${showTerm(b)}`;
  }
  if (t.tag === 'Let')
    return `let ${t.impl ? `implicitly ` : ''}${showTerm(t.val)} in ${showTerm(t.body)}`;
  return t;
};
