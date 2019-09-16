import { impossible } from '../util';
import { Cons, Nil, foldr, index, map } from '../list';
import { CVal, CVNe, CVAbs, CVPi, CVVar } from './values';
import { CEnv } from './env';
import { Core, CApp, CAbs, CPi, CVar } from './terms';

export const cvapp = (a: CVal, b: CVal): CVal => {
  if (a.tag === 'CVAbs') return a.body(b);
  if (a.tag === 'CVNe') return CVNe(a.head, Cons(b, a.args));
  return impossible('cvapp');
};

export const cevaluate = (t: Core, vs: CEnv = Nil): CVal => {
  if (t.tag === 'CType') return t;
  if (t.tag === 'CVar') {
    const v = index(vs, t.index);
    return v || impossible('evaluate cvar');
  }
  if (t.tag === 'CApp')
    return cvapp(cevaluate(t.left, vs), cevaluate(t.right, vs));
  if (t.tag === 'CAbs')
    return CVAbs(cevaluate(t.type, vs), v => cevaluate(t.body, Cons(v, vs)));
  if (t.tag === 'CPi')
    return CVPi(cevaluate(t.type, vs), v => cevaluate(t.body, Cons(v, vs)));
  if (t.tag === 'CLet')
    return cevaluate(t.body, Cons(cevaluate(t.value, vs), vs));
  return impossible('cevaluate');
};

export const cquote = (v: CVal, k: number = 0): Core => {
  if (v.tag === 'CType') return v;
  if (v.tag === 'CVNe')
    return foldr(
      (x, y) => CApp(y, x),
      CVar(k - (v.head.index + 1)) as Core,
      map(v.args, x => cquote(x, k))
    );
  if (v.tag === 'CVAbs')
    return CAbs(cquote(v.type, k), cquote(v.body(CVVar(k)), k + 1));
  if (v.tag === 'CVPi')
    return CPi(cquote(v.type, k), cquote(v.body(CVVar(k)), k + 1));
  return impossible('cquote');
};

export const cnormalize = (t: Core, vs: CEnv = Nil, k: number = 0): Core =>
  cquote(cevaluate(t, vs), k);
