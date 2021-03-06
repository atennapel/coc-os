import { Ix, Name } from './names';
import { Data } from './utils/adt';
import { eqArr } from './utils/utils';

export type Mode = Data<{ Expl: {}, ImplUnif: {} }>;
export const { Expl, ImplUnif } = { Expl: { tag: 'Expl' } as Mode, ImplUnif: { tag: 'ImplUnif' } as Mode };

export type Term = Data<{
  Var: { index: Ix },
  Prim: { name: PrimName },
  Global: { name: Name },
  Meta: { index: Ix },

  Pi: { mode: Mode, erased: boolean, name: Name, type: Term, body: Term },
  Abs: { mode: Mode, erased: boolean, name: Name, type: Term, body: Term },
  App: { left: Term, mode: Mode, right: Term },

  Sigma: { erased: boolean, name: Name, type: Term, body: Term },
  Pair: { fst: Term, snd: Term, type: Term },
  Proj: { proj: 'fst' | 'snd', term: Term },

  Let: { erased: boolean, name: Name, type: Term, val: Term, body: Term },

  Data: { index: Term, cons: Term[] },
  TCon: { data: Term, args: Term[] },
  Con: { data: Term, index: Ix, args: Term[] },
}>;
export const Var = (index: Ix): Term => ({ tag: 'Var', index });
export const Prim = (name: PrimName): Term => ({ tag: 'Prim', name });
export const Global = (name: Name): Term => ({ tag: 'Global', name });
export const App = (left: Term, mode: Mode, right: Term): Term => ({ tag: 'App', left, mode, right });
export const Abs = (mode: Mode, erased: boolean, name: Name, type: Term, body: Term): Term => ({ tag: 'Abs', name, erased, mode, type, body });
export const Pair = (fst: Term, snd: Term, type: Term): Term => ({ tag: 'Pair', fst, snd, type });
export const Proj = (proj: 'fst' | 'snd', term: Term): Term => ({ tag: 'Proj', proj, term });
export const Let = (erased: boolean, name: Name, type: Term, val: Term, body: Term): Term => ({ tag: 'Let', erased, name, type, val, body });
export const Pi = (mode: Mode, erased: boolean,  name: Name, type: Term, body: Term): Term => ({ tag: 'Pi', mode, erased, name, type, body });
export const Sigma = (erased: boolean, name: Name, type: Term, body: Term): Term => ({ tag: 'Sigma', erased, name, type, body });
export const Meta = (index: Ix): Term => ({ tag: 'Meta', index });
export const DataDef = (index: Term, cons: Term[]): Term => ({ tag: 'Data', index, cons });
export const TCon = (data: Term, args: Term[]): Term => ({ tag: 'TCon', data, args });
export const Con = (data: Term, index: Ix, args: Term[]): Term => ({ tag: 'Con', data, index, args });

export type PrimName = (typeof primNames)[number];
export const isPrimName = (name: string): name is PrimName => (primNames as any).includes(name);
export const primNames = [
  'Type', 'Data',
  'B', '0', '1', 'elimB',
  'HEq', 'ReflHEq', 'elimHEq',
  'IDesc', 'IEnd', 'IArg', 'IArgE', 'IFArg', 'IRec', 'IHRec', 'elimIDesc', 'InterpI', 'AllI', 'allI',
  'IData', 'ICon', 'indI',
] as const;
export type PrimNameElim = 'elimB' | 'elimHEq' | 'elimIDesc' | 'InterpI' | 'AllI' | 'allI' | 'indI';

export const Type = Prim('Type');
export const DataSort = Prim('Data');

export const AppE = (left: Term, right: Term): Term => App(left, Expl, right);
export const AppU = (left: Term, right: Term): Term => App(left, ImplUnif, right);
export const AbsE = (name: Name, type: Term, body: Term): Term => Abs(Expl, false, name, type, body);
export const AbsU = (name: Name, type: Term, body: Term): Term => Abs(ImplUnif, false, name, type, body);
export const PiE = (name: Name, type: Term, body: Term): Term => Pi(Expl, false, name, type, body);
export const PiU = (name: Name, type: Term, body: Term): Term => Pi(ImplUnif, false, name, type, body);

export const showMode = (m: Mode): string => m === ImplUnif ? 'impl' : '';

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
  if (t.tag === 'Abs') return `(\\${t.mode.tag === 'ImplUnif' ? '{' : '('}${t.erased ? '-' : ''}${t.name} : ${show(t.type)}${t.mode.tag === 'ImplUnif' ? '}' : ')'}. ${show(t.body)})`;
  if (t.tag === 'Pair') return `(${show(t.fst)}, ${show(t.snd)} : ${show(t.type)})`;
  if (t.tag === 'Proj') return `(${t.proj} ${show(t.term)})`;
  if (t.tag === 'Let') return `(let ${t.erased ? '-' : ''}${t.name} : ${show(t.type)} = ${show(t.val)}; ${show(t.body)})`;
  if (t.tag === 'Pi') {
    const [as, r] = flattenPi(t);
    return `(${as.map(([x, m, e, ty]) => `${m === ImplUnif ? '{' : '('}${e ? '-' : ''}${x} : ${show(ty)}${m === ImplUnif ? '}' : ')'}`).join(' -> ')} -> ${show(r)})`;
  }
  if (t.tag === 'Sigma') return `((${t.erased ? '-' : ''}${t.name} : ${show(t.type)}) ** ${show(t.body)})`;
  if (t.tag === 'Data') return `(data ${show(t.index)}${t.cons.length > 0 ? ' ' : ''}${t.cons.map(show).join(' ')})`;
  if (t.tag === 'TCon') return `(tcon ${show(t.data)}${t.args.length > 0 ? ' ' : ''}${t.args.map(show).join(' ')})`;
  if (t.tag === 'Con') return `(con ${show(t.data)} ${t.index}${t.args.length > 0 ? ' ' : ''}${t.args.map(show).join(' ')})`;
  return t;
};

export const eq = (t: Term, o: Term): boolean => {
  if (t.tag === 'Var') return o.tag === 'Var' && t.index === o.index;
  if (t.tag === 'Prim') return o.tag === 'Prim' && t.name === o.name;
  if (t.tag === 'Global') return o.tag === 'Global' && t.name === o.name;
  if (t.tag === 'Meta') return o.tag === 'Meta' && t.index === o.index;
  if (t.tag === 'App') return o.tag === 'App' && eq(t.left, o.left) && eq(t.right, o.right);
  if (t.tag === 'Abs') return o.tag === 'Abs' && t.mode.tag === o.mode.tag && t.erased === o.erased && eq(t.type, o.type) && eq(t.body, o.body);
  if (t.tag === 'Pair') return o.tag === 'Pair' && eq(t.fst, o.snd) && eq(t.fst, o.snd);
  if (t.tag === 'Proj') return o.tag === 'Proj' && t.proj === o.proj && eq(t.term, o.term);
  if (t.tag === 'Let') return o.tag === 'Let' && t.erased === o.erased && eq(t.type, o.type) && eq(t.val, o.val) && eq(t.body, o.body);
  if (t.tag === 'Pi') return o.tag === 'Pi' && t.mode.tag === o.mode.tag && t.erased === o.erased && eq(t.type, o.type) && eq(t.body, o.body);
  if (t.tag === 'Sigma') return o.tag === 'Sigma' && t.erased === o.erased && eq(t.type, o.type) && eq(t.body, o.body);
  if (t.tag === 'Data') return o.tag === 'Data' && eq(t.index, o.index) && eqArr(t.cons, o.cons, eq);
  if (t.tag === 'TCon') return o.tag === 'TCon' && eq(t.data, o.data) && eqArr(t.args, o.args, eq);
  if (t.tag === 'Con') return o.tag === 'Con' && t.index === o.index && eq(t.data, o.data) && eqArr(t.args, o.args, eq);
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
  if (t.tag === 'Data') return DataDef(shift(d, c, t.index), t.cons.map(x => shift(d, c, x)));
  if (t.tag === 'TCon') return TCon(shift(d, c, t.data), t.args.map(x => shift(d, c, x)));
  if (t.tag === 'Con') return Con(shift(d, c, t.data), t.index, t.args.map(x => shift(d, c, x)));
  return t;
};

export const subst = (j: Ix, s: Term, t: Term): Term => {
  if (t.tag === 'Var') return t.index === j ? s : t;
  if (t.tag === 'Prim') return t;
  if (t.tag === 'Global') return t;
  if (t.tag === 'Meta') return t;
  if (t.tag === 'App') return App(subst(j, s, t.left), t.mode, subst(j, s, t.right));
  if (t.tag === 'Abs') return Abs(t.mode, t.erased, t.name, subst(j, s, t.type), subst(j + 1, shift(1, 0, s), t.body));
  if (t.tag === 'Pair') return Pair(subst(j, s, t.fst), subst(j, s, t.snd), subst(j, s, t.type));
  if (t.tag === 'Proj') return Proj(t.proj, subst(j, s, t.term));
  if (t.tag === 'Let') return Let(t.erased, t.name, subst(j, s, t.type), subst(j, s, t.val), subst(j + 1, shift(1, 0, s), t.body));
  if (t.tag === 'Pi') return Pi(t.mode, t.erased, t.name, subst(j, s, t.type), subst(j + 1, shift(1, 0, s), t.body));
  if (t.tag === 'Sigma') return Sigma(t.erased, t.name, subst(j, s, t.type), subst(j + 1, shift(1, 0, s), t.body));
  if (t.tag === 'Data') return DataDef(subst(j, s, t.index), t.cons.map(x => subst(j, s, x)));
  if (t.tag === 'TCon') return TCon(subst(j, s, t.data), t.args.map(x => subst(j, s, x)));
  if (t.tag === 'Con') return Con(subst(j, s, t.data), t.index, t.args.map(x => subst(j, s, x)));
  return t;
};

export const substTop = (t: Term, u: Term): Term => shift(-1, 0, subst(0, shift(1, 0, u), t));
