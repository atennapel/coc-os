import { Name, Ix } from './names';

export type Plicity = { erased: boolean };
export const eqPlicity = (a: Plicity, b: Plicity): boolean => a.erased === b.erased;

export const PlicityE: Plicity = { erased: true };
export const PlicityR: Plicity = { erased: false };

export type Term = Var | App | Abs | Let | Roll | Unroll | Pi | Fix | Type | Ann | Hole | Meta | Ind | IndFix;

export type Var = { tag: 'Var', name: Name };
export const Var = (name: Name): Var => ({ tag: 'Var', name });
export type App = { tag: 'App', left: Term, plicity: Plicity, right: Term };
export const App = (left: Term, plicity: Plicity, right: Term): App => ({ tag: 'App', left, plicity, right });
export type Abs = { tag: 'Abs', plicity: Plicity, name: Name, type: Term | null, body: Term };
export const Abs = (plicity: Plicity, name: Name, type: Term | null, body: Term): Abs => ({ tag: 'Abs', plicity, name, type, body });
export type Let = { tag: 'Let', plicity: Plicity, name: Name, val: Term, body: Term };
export const Let = (plicity: Plicity, name: Name, val: Term, body: Term): Let => ({ tag: 'Let', plicity, name, val, body });
export type Roll = { tag: 'Roll', type: Term | null, term: Term };
export const Roll = (type: Term | null, term: Term): Roll => ({ tag: 'Roll', type, term });
export type Unroll = { tag: 'Unroll', term: Term };
export const Unroll = (term: Term): Unroll => ({ tag: 'Unroll', term });
export type Pi = { tag: 'Pi', plicity: Plicity, name: Name, type: Term, body: Term };
export const Pi = (plicity: Plicity, name: Name, type: Term, body: Term): Pi => ({ tag: 'Pi', plicity, name, type, body });
export type Fix = { tag: 'Fix', name: Name, type: Term, body: Term };
export const Fix = (name: Name, type: Term, body: Term): Fix => ({ tag: 'Fix', name, type, body });
export type Type = { tag: 'Type' };
export const Type: Type = { tag: 'Type' };
export type Ann = { tag: 'Ann', term: Term, type: Term };
export const Ann = (term: Term, type: Term): Ann => ({ tag: 'Ann', term, type });
export type Hole = { tag: 'Hole', name: Name | null };
export const HoleN: Hole = { tag: 'Hole', name: null };
export const Hole = (name: Name): Hole => ({ tag: 'Hole', name });
export type Meta = { tag: 'Meta', index: Ix };
export const Meta = (index: Ix): Meta => ({ tag: 'Meta', index });
export type Ind = { tag: 'Ind', type: Term | null, term: Term };
export const Ind = (type: Term | null, term: Term): Ind => ({ tag: 'Ind', type, term });
export type IndFix = { tag: 'IndFix', type: Term, term: Term };
export const IndFix = (type: Term, term: Term): IndFix => ({ tag: 'IndFix', type, term });

export const showTermS = (t: Term): string => {
  if (t.tag === 'Var') return t.name;
  if (t.tag === 'Meta') return `?${t.index}`;
  if (t.tag === 'Hole') return `_${t.name || ''}`;
  if (t.tag === 'App') return `(${showTermS(t.left)} ${t.plicity.erased ? '-' : ''}${showTermS(t.right)})`;
  if (t.tag === 'Abs')
    return t.type ? `(\\(${t.plicity.erased ? '-' : ''}${t.name} : ${showTermS(t.type)}). ${showTermS(t.body)})` : `(\\${t.plicity.erased ? '-' : ''}${t.name}. ${showTermS(t.body)})`;
  if (t.tag === 'Let') return `(let ${t.plicity.erased ? '-' : ''}${t.name} = ${showTermS(t.val)} in ${showTermS(t.body)})`;
  if (t.tag === 'Roll') return t.type ? `(roll {${showTermS(t.type)}} ${showTermS(t.term)})` : `(roll ${showTermS(t.term)})`;
  if (t.tag === 'Unroll') return `(unroll ${showTermS(t.term)})`;
  if (t.tag === 'Pi') return `(/(${t.plicity.erased ? '-' : ''}${t.name} : ${showTermS(t.type)}). ${showTermS(t.body)})`;
  if (t.tag === 'Fix') return `(fix (${t.name} : ${showTermS(t.type)}). ${showTermS(t.body)})`;
  if (t.tag === 'Type') return '*';
  if (t.tag === 'Ann') return `(${showTermS(t.term)} : ${showTermS(t.type)})`;
  if (t.tag === 'Ind') return t.type ? `(induction {${showTermS(t.type)}} ${showTermS(t.term)})` : `(induction ${showTermS(t.term)})`;
  if (t.tag === 'IndFix') return `(inductionFix {${showTermS(t.type)}} ${showTermS(t.term)})`;
  return t;
};

export const flattenApp = (t: Term): [Term, [Plicity, Term][]] => {
  const r: [Plicity, Term][] = [];
  while (t.tag === 'App') {
    r.push([t.plicity, t.right]);
    t = t.left;
  }
  return [t, r.reverse()];
};
export const flattenAbs = (t: Term): [[Name, Plicity, Term | null][], Term] => {
  const r: [Name, Plicity, Term | null][] = [];
  while (t.tag === 'Abs') {
    r.push([t.name, t.plicity, t.type]);
    t = t.body;
  }
  return [r, t];
};
export const flattenPi = (t: Term): [[Name, Plicity, Term][], Term] => {
  const r: [Name, Plicity, Term][] = [];
  while (t.tag === 'Pi') {
    r.push([t.name, t.plicity, t.type]);
    t = t.body;
  }
  return [r, t];
};

export const showTermP = (b: boolean, t: Term): string =>
  b ? `(${showTerm(t)})` : showTerm(t);
export const showTerm = (t: Term): string => {
  if (t.tag === 'Type') return '*';
  if (t.tag === 'Var') return t.name;
  if (t.tag === 'Meta') return `?${t.index}`;
  if (t.tag === 'Hole') return `_${t.name || ''}`;
  if (t.tag === 'App') {
    const [f, as] = flattenApp(t);
    return `${showTermP(f.tag === 'Abs' || f.tag === 'Pi' || f.tag === 'App' || f.tag === 'Let' || f.tag === 'Ann' || f.tag === 'Roll' || f.tag === 'Fix', f)} ${
      as.map(([im, t], i) =>
        im.erased ? `{${showTerm(t)}}` :
          `${showTermP(t.tag === 'App' || t.tag === 'Ann' || t.tag === 'Let' || (t.tag === 'Abs' && i < as.length - 1) || t.tag === 'Pi' || t.tag === 'Fix' || t.tag === 'Unroll' || t.tag === 'Roll' || t.tag === 'Ind', t)}`).join(' ')}`;
  }
  if (t.tag === 'Abs') {
    const [as, b] = flattenAbs(t);
    return `\\${as.map(([x, im, t]) => im.erased ? `{${x}${t ? ` : ${showTermP(t.tag === 'Ann', t)}` : ''}}` : !t ? x : `(${x} : ${showTermP(t.tag === 'Ann', t)})`).join(' ')}. ${showTermP(b.tag === 'Ann', b)}`;
  }
  if (t.tag === 'Pi') {
    const [as, b] = flattenPi(t);
    return `${as.map(([x, im, t]) => x === '_' ? (im.erased ? `${im.erased ? '{' : ''}${showTerm(t)}${im.erased ? '}' : ''}` : `${showTermP(t.tag === 'Ann' || t.tag === 'Abs' || t.tag === 'Let' || t.tag === 'Pi' || t.tag === 'Fix', t)}`) : `${im.erased ? '{' : '('}${x} : ${showTermP(t.tag === 'Ann', t)}${im.erased ? '}' : ')'}`).join(' -> ')} -> ${showTermP(b.tag === 'Ann', b)}`;
  }
  if (t.tag === 'Let')
    return `let ${t.plicity.erased ? `{${t.name}}` : t.name} = ${showTermP(t.val.tag === 'Let', t.val)} in ${showTermP(t.body.tag === 'Ann', t.body)}`;
  if (t.tag === 'Fix')
    return `fix (${t.name} : ${showTermP(t.type.tag === 'Ann', t.type)}). ${showTermP(t.body.tag === 'Ann', t.body)}`;
  if (t.tag === 'Unroll')
    return `unroll ${showTermP(t.term.tag === 'Ann', t.term)}`;
  if (t.tag === 'Roll')
    return !t.type ? `roll ${showTermP(t.term.tag === 'Ann', t.term)}` : `roll {${showTerm(t.type)}} ${showTermP(t.term.tag === 'Ann', t.term)}`;
  if (t.tag === 'Ann')
    return `${showTermP(t.term.tag === 'Ann', t.term)} : ${showTermP(t.term.tag === 'Ann', t.type)}`;
  if (t.tag === 'Ind') {
    const fp = (t: Term) => t.tag === 'Ann' || t.tag === 'Abs' || t.tag === 'App' || t.tag === 'Fix' || t.tag === 'Ind' || t.tag === 'Let' || t.tag === 'Pi' || t.tag === 'Roll' || t.tag === 'Unroll';
    return !t.type ? `induction ${showTermP(fp(t.term), t.term)}` : `induction {${showTerm(t.type)}} ${showTermP(fp(t.term), t.term)}`;
  }
  if (t.tag === 'IndFix') {
    const fp = (t: Term) => t.tag === 'Ann' || t.tag === 'Abs' || t.tag === 'App' || t.tag === 'Fix' || t.tag === 'Ind' || t.tag === 'Let' || t.tag === 'Pi' || t.tag === 'Roll' || t.tag === 'Unroll';
    return `inductionFix {${showTerm(t.type)}} ${showTermP(fp(t.term), t.term)}`;
  }
  return t;
};

export const eraseTypes = (t: Term): Term => {
  if (t.tag === 'Var') return t;
  if (t.tag === 'Meta') return t;
  if (t.tag === 'Hole') return t;
  if (t.tag === 'App') return t.plicity.erased ? eraseTypes(t.left) : App(eraseTypes(t.left), t.plicity, eraseTypes(t.right));
  if (t.tag === 'Abs') return t.plicity.erased ? eraseTypes(t.body) : Abs(t.plicity, t.name, null, eraseTypes(t.body));
  if (t.tag === 'Let') return t.plicity.erased ? eraseTypes(t.body) : Let(t.plicity, t.name, eraseTypes(t.val), eraseTypes(t.body));
  if (t.tag === 'Roll') return eraseTypes(t.term);
  if (t.tag === 'Unroll') return eraseTypes(t.term);
  if (t.tag === 'Pi') return Type;
  if (t.tag === 'Fix') return Type;
  if (t.tag === 'Type') return Type;
  if (t.tag === 'Ann') return eraseTypes(t.term);
  if (t.tag === 'Ind') return eraseTypes(t.term);
  if (t.tag === 'IndFix') return IndFix(eraseTypes(t.type), eraseTypes(t.term));
  return t;
};
