import { Ix, Name } from './names';

export type Mode = Expl | ImplUnif;
export type Expl = 'Expl';
export const Expl: Expl = 'Expl';
export type ImplUnif = 'ImplUnif';
export const ImplUnif: ImplUnif = 'ImplUnif';

export type Term = Var | Prim | Global | App | Abs | Pair | Proj | Let | Pi | Sigma | Meta;

export type Var = { tag: 'Var', index: Ix };
export const Var = (index: Ix): Var => ({ tag: 'Var', index });
export type Prim = { tag: 'Prim', name: PrimName };
export const Prim = (name: PrimName): Prim => ({ tag: 'Prim', name });
export type Global = { tag: 'Global', name: Name };
export const Global = (name: Name): Global => ({ tag: 'Global', name });
export type App = { tag: 'App', left: Term, mode: Mode, right: Term };
export const App = (left: Term, mode: Mode, right: Term): App => ({ tag: 'App', left, mode, right });
export type Abs = { tag: 'Abs', mode: Mode, erased: boolean, name: Name, type: Term, body: Term };
export const Abs = (mode: Mode, erased: boolean, name: Name, type: Term, body: Term): Abs => ({ tag: 'Abs', name, erased, mode, type, body });
export type Pair = { tag: 'Pair', fst: Term, snd: Term, type: Term };
export const Pair = (fst: Term, snd: Term, type: Term): Pair => ({ tag: 'Pair', fst, snd, type });
export type Proj = { tag: 'Proj', proj: 'fst' | 'snd', term: Term };
export const Proj = (proj: 'fst' | 'snd', term: Term): Proj => ({ tag: 'Proj', proj, term });
export type Let = { tag: 'Let', erased: boolean, name: Name, type: Term, val: Term, body: Term };
export const Let = (erased: boolean, name: Name, type: Term, val: Term, body: Term): Let => ({ tag: 'Let', erased, name, type, val, body });
export type Pi = { tag: 'Pi', mode: Mode, erased: boolean, name: Name, type: Term, body: Term };
export const Pi = (mode: Mode, erased: boolean,  name: Name, type: Term, body: Term): Pi => ({ tag: 'Pi', mode, erased, name, type, body });
export type Sigma = { tag: 'Sigma', erased: boolean, name: Name, type: Term, body: Term };
export const Sigma = (erased: boolean, name: Name, type: Term, body: Term): Sigma => ({ tag: 'Sigma', erased, name, type, body });
export type Meta = { tag: 'Meta', index: Ix };
export const Meta = (index: Ix): Meta => ({ tag: 'Meta', index });

export type PrimName = (typeof primNames)[number];
export const isPrimName = (name: string): name is PrimName => (primNames as any).includes(name);
export const primNames = [
  'Type',
  'B', '0', '1', 'elimB',
  'HEq', 'ReflHEq', 'elimHEq',
  'IDesc', 'IEnd', 'IArg', 'IFArg', 'IRec', 'IHRec', 'elimIDesc', 'interpI', 'AllI', 'allI',
  'IData', 'ICon', 'indI',
] as const;
export type PrimNameElim = 'elimB' | 'elimHEq' | 'elimIDesc' | 'interpI' | 'AllI' | 'allI' | 'indI';

export const Type = Prim('Type');

export const AppE = (left: Term, right: Term): App => App(left, Expl, right);
export const AppU = (left: Term, right: Term): App => App(left, ImplUnif, right);
export const AbsE = (name: Name, type: Term, body: Term): Abs => Abs(Expl, false, name, type, body);
export const AbsU = (name: Name, type: Term, body: Term): Abs => Abs(ImplUnif, false, name, type, body);
export const PiE = (name: Name, type: Term, body: Term): Pi => Pi(Expl, false, name, type, body);
export const PiU = (name: Name, type: Term, body: Term): Pi => Pi(ImplUnif, false, name, type, body);

export const showMode = (m: Mode): string => m === 'ImplUnif' ? 'impl' : '';

export const flattenApp = (t: Term): [Term, [Mode, Term][]] => {
  const r: [Mode, Term][] = [];
  while (t.tag === 'App') {
    r.push([t.mode, t.right]);
    t = t.left;
  }
  return [t, r.reverse()];
};
export const flattenPi = (t: Term): [[Name, Mode, boolean, Term][], Term] => {
  const r: [Name, Mode, boolean, Term][] = [];
  while (t.tag === 'Pi') {
    r.push([t.name, t.mode, t.erased, t.type]);
    t = t.body;
  }
  return [r, t];
};

export const show = (t: Term): string => {
  if (t.tag === 'Var') return `${t.index}`;
  if (t.tag === 'Prim') return t.name === 'Type' ? '*' : `%${t.name}`;
  if (t.tag === 'Global') return `${t.name}`;
  if (t.tag === 'Meta') return `?${t.index}`;
  if (t.tag === 'App') {
    const [f, as] = flattenApp(t);
    return `(${show(f)} ${as.map(([m, a]) => `${m === ImplUnif ? '{' : ''}${show(a)}${m === ImplUnif ? '}' : ''}`).join(' ')})`;
  }
  if (t.tag === 'Abs') return `(\\${t.mode === ImplUnif ? '{' : '('}${t.erased ? '-' : ''}${t.name} : ${show(t.type)}${t.mode === ImplUnif ? '}' : ')'}. ${show(t.body)})`;
  if (t.tag === 'Pair') return `(${show(t.fst)}, ${show(t.snd)} : ${show(t.type)})`;
  if (t.tag === 'Proj') return `(${t.proj} ${show(t.term)})`;
  if (t.tag === 'Let') return `(let ${t.erased ? '-' : ''}${t.name} : ${show(t.type)} = ${show(t.val)} in ${show(t.body)})`;
  if (t.tag === 'Pi') {
    const [as, r] = flattenPi(t);
    return `(${as.map(([x, m, e, ty]) => `${m === ImplUnif ? '{' : '('}${e ? '-' : ''}${x} : ${show(ty)}${m === ImplUnif ? '}' : ')'}`).join(' -> ')} -> ${show(r)})`;
  }
  if (t.tag === 'Sigma') return `((${t.erased ? '-' : ''}${t.name} : ${show(t.type)}) ** ${show(t.body)})`;
  return t;
};

export const eq = (t: Term, o: Term): boolean => {
  if (t.tag === 'Var') return o.tag === 'Var' && t.index === o.index;
  if (t.tag === 'Prim') return o.tag === 'Prim' && t.name === o.name;
  if (t.tag === 'Global') return o.tag === 'Global' && t.name === o.name;
  if (t.tag === 'Meta') return o.tag === 'Meta' && t.index === o.index;
  if (t.tag === 'App') return o.tag === 'App' && eq(t.left, o.left) && eq(t.right, o.right);
  if (t.tag === 'Abs') return o.tag === 'Abs' && t.mode === o.mode && t.erased === o.erased && eq(t.type, o.type) && eq(t.body, o.body);
  if (t.tag === 'Pair') return o.tag === 'Pair' && eq(t.fst, o.snd) && eq(t.fst, o.snd);
  if (t.tag === 'Proj') return o.tag === 'Proj' && t.proj === o.proj && eq(t.term, o.term);
  if (t.tag === 'Let') return o.tag === 'Let' && t.erased === o.erased && eq(t.type, o.type) && eq(t.val, o.val) && eq(t.body, o.body);
  if (t.tag === 'Pi') return o.tag === 'Pi' && t.mode === o.mode && t.erased === o.erased && eq(t.type, o.type) && eq(t.body, o.body);
  if (t.tag === 'Sigma') return o.tag === 'Sigma' && t.erased === o.erased && eq(t.type, o.type) && eq(t.body, o.body);
  return t;
};

export const shift = (d: Ix, c: Ix, t: Term): Term => {
  if (t.tag === 'Var') return t.index < c ? t : Var(t.index + d);
  if (t.tag === 'Prim') return t;
  if (t.tag === 'Global') return t;
  if (t.tag === 'Meta') return t;
  if (t.tag === 'App') return App(shift(d, c, t.left), t.mode, shift(d, c, t.right));
  if (t.tag === 'Abs') return Abs(t.mode, t.erased, t.name, shift(d, c, t.type), shift(d, c + 1, t.body));
  if (t.tag === 'Pair') return Pair(shift(d, c, t.fst), shift(d, c, t.snd), shift(d, c, t.type));
  if (t.tag === 'Proj') return Proj(t.proj, shift(d, c, t.term));
  if (t.tag === 'Let') return Let(t.erased, t.name, shift(d, c, t.type), shift(d, c, t.val), shift(d, c + 1, t.body));
  if (t.tag === 'Pi') return Pi(t.mode, t.erased, t.name, shift(d, c, t.type), shift(d, c + 1, t.body));
  if (t.tag === 'Sigma') return Sigma(t.erased, t.name, shift(d, c, t.type), shift(d, c + 1, t.body));
  return t;
};
