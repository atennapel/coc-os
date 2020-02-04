import { Name } from './names';

export type Meta = { erased: boolean };
export const eqMeta = (a: Meta, b: Meta): boolean => a.erased === b.erased;

export const MetaE: Meta = { erased: true };
export const MetaR: Meta = { erased: false };

export type Term = Var | App | Abs | Let | Roll | Unroll | Pi | Fix | Type | Ann;

export type Var = { tag: 'Var', name: Name };
export const Var = (name: Name): Var => ({ tag: 'Var', name });
export type App = { tag: 'App', left: Term, meta: Meta, right: Term };
export const App = (left: Term, meta: Meta, right: Term): App => ({ tag: 'App', left, meta, right });
export type Abs = { tag: 'Abs', meta: Meta, name: Name, type: Term | null, body: Term };
export const Abs = (meta: Meta, name: Name, type: Term | null, body: Term): Abs => ({ tag: 'Abs', meta, name, type, body });
export type Let = { tag: 'Let', meta: Meta, name: Name, val: Term, body: Term };
export const Let = (meta: Meta, name: Name, val: Term, body: Term): Let => ({ tag: 'Let', meta, name, val, body });
export type Roll = { tag: 'Roll', type: Term, term: Term };
export const Roll = (type: Term, term: Term): Roll => ({ tag: 'Roll', type, term });
export type Unroll = { tag: 'Unroll', term: Term };
export const Unroll = (term: Term): Unroll => ({ tag: 'Unroll', term });
export type Pi = { tag: 'Pi', meta: Meta, name: Name, type: Term, body: Term };
export const Pi = (meta: Meta, name: Name, type: Term, body: Term): Pi => ({ tag: 'Pi', meta, name, type, body });
export type Fix = { tag: 'Fix', name: Name, type: Term, body: Term };
export const Fix = (name: Name, type: Term, body: Term): Fix => ({ tag: 'Fix', name, type, body });
export type Type = { tag: 'Type' };
export const Type: Type = { tag: 'Type' };
export type Ann = { tag: 'Ann', term: Term, type: Term };
export const Ann = (term: Term, type: Term): Ann => ({ tag: 'Ann', term, type });

export const showTermS = (t: Term): string => {
  if (t.tag === 'Var') return t.name;
  if (t.tag === 'App') return `(${showTermS(t.left)} ${t.meta.erased ? '-' : ''}${showTermS(t.right)})`;
  if (t.tag === 'Abs')
    return t.type ? `(\\(${t.meta.erased ? '-' : ''}${t.name} : ${showTermS(t.type)}). ${showTermS(t.body)})` : `(\\${t.meta.erased ? '-' : ''}${t.name}. ${showTermS(t.body)})`;
  if (t.tag === 'Let') return `(let ${t.meta.erased ? '-' : ''}${t.name} = ${showTermS(t.val)} in ${showTermS(t.body)})`;
  if (t.tag === 'Roll') return `(roll ${showTermS(t.type)} ${showTermS(t.term)})`;
  if (t.tag === 'Unroll') return `(unroll ${showTermS(t.term)})`;
  if (t.tag === 'Pi') return `(/(${t.meta.erased ? '-' : ''}${t.name} : ${showTermS(t.type)}). ${showTermS(t.body)})`;
  if (t.tag === 'Fix') return `(fix (${t.name} : ${showTermS(t.type)}). ${showTermS(t.body)})`;
  if (t.tag === 'Type') return '*';
  if (t.tag === 'Ann') return `(${showTermS(t.term)} : ${showTermS(t.type)})`;
  return t;
};

export const flattenApp = (t: Term): [Term, [Meta, Term][]] => {
  const r: [Meta, Term][] = [];
  while (t.tag === 'App') {
    r.push([t.meta, t.right]);
    t = t.left;
  }
  return [t, r.reverse()];
};
export const flattenAbs = (t: Term): [[Name, Meta, Term | null][], Term] => {
  const r: [Name, Meta, Term | null][] = [];
  while (t.tag === 'Abs') {
    r.push([t.name, t.meta, t.type]);
    t = t.body;
  }
  return [r, t];
};
export const flattenPi = (t: Term): [[Name, Meta, Term][], Term] => {
  const r: [Name, Meta, Term][] = [];
  while (t.tag === 'Pi') {
    r.push([t.name, t.meta, t.type]);
    t = t.body;
  }
  return [r, t];
};

export const showTermP = (b: boolean, t: Term): string =>
  b ? `(${showTerm(t)})` : showTerm(t);
export const showTerm = (t: Term): string => {
  if (t.tag === 'Type') return '*';
  if (t.tag === 'Var') return t.name;
  if (t.tag === 'App') {
    const [f, as] = flattenApp(t);
    return `${showTermP(f.tag === 'Abs' || f.tag === 'Pi' || f.tag === 'App' || f.tag === 'Let' || f.tag === 'Ann' || f.tag === 'Roll' || f.tag === 'Fix', f)} ${
      as.map(([im, t], i) =>
        im.erased ? `{${showTerm(t)}}` :
          `${showTermP(t.tag === 'App' || t.tag === 'Ann' || t.tag === 'Let' || (t.tag === 'Abs' && i < as.length - 1) || t.tag === 'Pi' || f.tag === 'Fix', t)}`).join(' ')}`;
  }
  if (t.tag === 'Abs') {
    const [as, b] = flattenAbs(t);
    return `\\${as.map(([x, im, t]) => im.erased ? `{${x}${t ? ` : ${showTermP(t.tag === 'Ann', t)}` : ''}}` : !t ? x : `(${x} : ${showTermP(t.tag === 'Ann', t)})`).join(' ')}. ${showTermP(b.tag === 'Ann', b)}`;
  }
  if (t.tag === 'Pi') {
    const [as, b] = flattenPi(t);
    return `${as.map(([x, im, t]) => x === '_' ? (im.erased ? `${im ? '{' : ''}${showTerm(t)}${im.erased ? '}' : ''}` : `${showTermP(t.tag === 'Ann' || t.tag === 'Abs' || t.tag === 'Let' || t.tag === 'Pi' || t.tag === 'Fix', t)}`) : `${im ? '{' : '('}${x} : ${showTermP(t.tag === 'Ann', t)}${im ? '}' : ')'}`).join(' -> ')} -> ${showTermP(b.tag === 'Ann', b)}`;
  }
  if (t.tag === 'Let')
    return `let ${t.meta.erased ? `{${t.name}}` : t.name} = ${showTermP(t.val.tag === 'Let', t.val)} in ${showTermP(t.body.tag === 'Ann', t.body)}`;
  if (t.tag === 'Fix')
    return `fix (${t.name} : ${showTermP(t.type.tag === 'Ann', t.type)}). ${showTermP(t.body.tag === 'Ann', t.body)}`;
  if (t.tag === 'Unroll')
    return `unroll ${showTermP(t.term.tag === 'Ann', t.term)}`;
  if (t.tag === 'Roll')
    return `roll ${showTermP(t.type.tag === 'App' || t.type.tag === 'Ann' || t.type.tag === 'Abs' || t.type.tag === 'Fix' || t.type.tag === 'Let' || t.type.tag === 'Pi' || t.type.tag === 'Roll' || t.type.tag === 'Unroll', t.type)} ${showTermP(t.term.tag === 'Ann', t.term)}`;
  if (t.tag === 'Ann')
    return `${showTermP(t.term.tag === 'Ann', t.term)} : ${showTermP(t.term.tag === 'Ann', t.type)}`;
  return t;
};
