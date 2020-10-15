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
// elimIDesc = \ce ca cf cr ch d. foldM (\r x. x ce (\f. ca f (\a. r (f a))) (\f. cae f (r f)) (\d. cf d (r d)) (\d. cr d (r d)) (\d. ch d (r d))) d 
const elimIDesc = l(ce => l(ca => l(cae => l(cf => l(cr => l(ch => l(d => ap([foldM, l(r => l(x => ap([
    x,
    ce,
    l(f => ap([ca, f, l(a => ap([r, ap([f, a])]))])),
    l(f => ap([cae, f, ap([r, f])])),
    l(d => ap([cf, d, ap([r, d])])),
    l(d => ap([cr, d, ap([r, d])])),
    l(d => ap([ch, d, ap([r, d])])),
  ]))), d]))))))));
// allI = \d. elimIDesc (\p xs. id) (\f r p xs. r xs.fst p xs.snd) (\f r p xs. r p xs) (\d r. r p xs.snd) (\d r. (p xs.fst, r p xs.snd)) (\d r. (\h. p (xs.fst h), r p xs.snd)) d
const allI = l(d => ap([
  elimIDesc,
  l(_ => l(_ => id)),
  l(_ => l(r => l(p => l(xs => ap([r, fst(xs), p, snd(xs)]))))),
  l(_ => l(r => l(p => l(xs => ap([r, p, xs]))))),
  l(_ => l(r => l(p => l(xs => ap([r, p, snd(xs)]))))),
  l(_ => l(r => l(p => l(xs => VPair(ap([p, fst(xs)]), ap([r, p, snd(xs)])))))),
  l(_ => l(r => l(p => l(xs => VPair(l(h => ap([p, ap([fst(xs), h])])), ap([r, p, snd(xs)])))))),
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
  // inM (\ce ca cae cf cr ch. ce)
  'IEnd': ap([inM, l(c => l(_ => l(_ => l(_ => l(_ => l(_ => c))))))]),
  // \f. inM (\ce ca cae cf cr ch. ca f)
  'IArg': l(f => ap([inM, l(_ => l(c => l(_ => l(_ => l(_ => l(_ => ap([c, f])))))))])),
  // \f. inM (\ce ca cae cf cr ch. cae f)
  'IArgE': l(f => ap([inM, l(_ => l(_ => l(c => l(_ => l(_ => l(_ => ap([c, f])))))))])),
  // \d. inM (\ce ca cae cf cr ch. cf d)
  'IFArg': l(d => ap([inM, l(_ => l(_ => l(_ => l(c => l(_ => l(_ => ap([c, d])))))))])),
  // \d. inM (\ce ca cae cf cr ch. cr d)
  'IRec': l(d => ap([inM, l(_ => l(_ => l(_ => l(_ => l(c => l(_ => ap([c, d])))))))])),
  // \d. inM (\ce ca cae cf cr ch. ch d)
  'IHRec': l(d => ap([inM, l(_ => l(_ => l(_ => l(_ => l(_ => l(c => ap([c, d])))))))])),
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
