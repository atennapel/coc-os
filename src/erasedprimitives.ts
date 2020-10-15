import { PrimName } from './core';
import { VAbs, Val, vapps, VPair, vproj } from './erasedvalues';
import { impossible } from './utils/utils';

const l = VAbs;
const ap = vapps;
const id = l(x => x);
const fst = (x: Val) => vproj('fst', x);
const snd = (x: Val) => vproj('snd', x);

// in = \x alg. alg (\r. r alg) x
const inM = l(x => l(alg => ap([alg, l(r => ap([r, alg])), x])));
// fold = \alg r. r alg
const foldM = l(alg => l(r => ap([r, alg])));
// elimIDesc = \ce ca cf cr ch d. foldM (\r x. x ce (\t f. ca t f (\a. r (f a))) (\t d. cf t d (r d)) (\i d. cr i d (r d)) (\t i d. ch t i d (r d))) d 
const elimIDesc = l(ce => l(ca => l(cf => l(cr => l(ch => l(d => ap([foldM, l(r => l(x => ap([
    x,
    ce,
    l(t => l(f => ap([ca, t, f, l(a => ap([r, ap([f, a])]))]))),
    l(t => l(d => ap([cf, t, d, ap([r, d])]))),
    l(i => l(d => ap([cr, i, d, ap([r, d])]))),
    l(t => l(i => l(d => ap([ch, t, i, d, ap([r, d])])))),
  ]))), d])))))));
// allI = \d. elimIDesc (\i p xs. id) (\t f r p xs. r xs.fst p xs.snd) (\t d r. r p xs.snd) (\i d r. (p xs.fst, r p xs.snd)) (\t i d r. (\h. p (xs.fst h), r p xs.snd)) d
const allI = l(d => ap([
  elimIDesc,
  l(_ => l(_ => l(_ => id))),
  l(_ => l(_ => l(r => l(p => l(xs => ap([r, fst(xs), p, snd(xs)])))))),
  l(_ => l(_ => l(r => l(p => l(xs => ap([r, p, snd(xs)])))))),
  l(_ => l(_ => l(r => l(p => l(xs => VPair(ap([p, fst(xs)]), ap([r, p, snd(xs)]))))))),
  l(_ => l(_ => l(_ => l(r => l(p => l(xs => VPair(l(h => ap([p, ap([fst(xs), h])])), ap([r, p, snd(xs)])))))))),
  d,
]));

const primErasedMap: { [K in PrimName]: Val } = {

  'Type': id,
  
  'B': id,
  '0': l(_ => l(y => y)),
  '1': l(x => l(_ => x)),
  'elimB': l(f => l(t => l(b => ap([b, t, f])))),

  'HEq': id,
  'ReflHEq': id,
  'elimHEq': id,

  'IDesc': id,
  // \i. inM (\ce ca cf cr ch. ce i)
  'IEnd': l(i => ap([inM, l(c => l(_ => l(_ => l(_ => l(_ => ap([c, i]))))))])),
  // \t f. inM (\ce ca cf cr ch. ca t f)
  'IArg': l(t => l(f => ap([inM, l(_ => l(c => l(_ => l(_ => l(_ => ap([c, t, f]))))))]))),
  // \t d. inM (\ce ca cf cr ch. cf t d)
  'IFArg': l(t => l(d => ap([inM, l(_ => l(_ => l(c => l(_ => l(_ => ap([c, t, d]))))))]))),
  // \i d. inM (\ce ca cf cr ch. cr i d)
  'IRec': l(i => l(d => ap([inM, l(_ => l(_ => l(_ => l(c => l(_ => ap([c, i, d]))))))]))),
  // \t i d. inM (\ce ca cf cr ch. ch t i d)
  'IHRec': l(t => l(i => l(d => ap([inM, l(_ => l(_ => l(_ => l(_ => l(c => ap([c, t, i, d]))))))])))),
  'elimIDesc': elimIDesc,

  'interpI': id,
  'AllI': id,
  'allI': allI,

  'IData': id,
  // \x. inM (\f. f x)
  'ICon': l(x => ap([inM, l(f => ap([f, x]))])),
  // \d h x. foldM (\rec f. f (\c. h c (allI d r c))) x
  'indI': l(d => l(h => l(x => ap([foldM, l(r => l(f => ap([f, l(c => ap([h, c, ap([allI, d, r, c])]))]))), x])))),

};

export const primErased = (name: PrimName): Val => primErasedMap[name] || impossible(`primErased: ${name}`);
