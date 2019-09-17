import { CHead, CVal, CVVar } from './values';
import { terr } from '../util';
import { cquote, cvapp, cevaluate } from './nbe';
import { showCore, Core, CType, CPi } from './terms';
import { zipWith_, Cons, Nil, index } from '../list';
import { CEnv, CHashEnv } from './env';

const cheadeq = (a: CHead, b: CHead): boolean => {
  if (a === b) return true;
  if (a.tag === 'CVar') return b.tag === 'CVar' && a.index === b.index;
  if (a.tag === 'CHash') return b.tag === 'CHash' && a.hash === b.hash;
  return false;
};

export const eqtype = (k: number, a: CVal, b: CVal): void => {
  if (a.tag === 'CType' && b.tag === 'CType') return;
  if (a.tag === 'CVAbs' && b.tag === 'CVAbs') {
    eqtype(k, a.type, b.type);
    const v = CVVar(k);
    return eqtype(k + 1, a.body(v), a.body(v));
  }
  if (a.tag === 'CVAbs') {
    const v = CVVar(k);
    return eqtype(k + 1, a.body(v), cvapp(b, v));
  }
  if (b.tag === 'CVAbs') {
    const v = CVVar(k);
    return eqtype(k + 1, cvapp(a, v), b.body(v));
  }
  if (a.tag === 'CVPi' && b.tag === 'CVPi') {
    eqtype(k, a.type, b.type);
    const v = CVVar(k);
    return eqtype(k + 1, a.body(v), a.body(v));
  }
  if (a.tag === 'CVNe' && b.tag === 'CVNe' && cheadeq(a.head, b.head))
    return zipWith_((x, y) => eqtype(k, x, y), a.args, b.args);
  return terr(`typecheck failed: ${showCore(cquote(b, k))} ~ ${showCore(cquote(a, k))}`);
};

const check = (henv: CHashEnv, tenv: CEnv, venv: CEnv, k: number, t: Core, ty: CVal): void => {  
  if (t.tag === 'CLet') {
    check(henv, tenv, venv, k, t.type, CType);
    const vty = cevaluate(t.type, henv, venv);
    check(henv, tenv, venv, k, t.value, vty);
    check(henv, Cons(vty, tenv), Cons(cevaluate(t.value, henv, venv), venv), k + 1, t.body, ty);
    return;
  }
  const ty2 = synth(henv, tenv, venv, k, t);
  eqtype(k, ty2, ty);
};

const synth = (henv: CHashEnv, tenv: CEnv, venv: CEnv, k: number, t: Core): CVal => {
  if (t.tag === 'CType') return CType;
  if (t.tag === 'CVar')
    return index(tenv, t.index) || terr(`var out of scope ${t.index}`);
  if (t.tag === 'CAbs') {
    check(henv, tenv, venv, k, t.type, CType);
    const type = cevaluate(t.type, henv, venv);
    const rt = synth(henv, Cons(type, tenv), Cons(CVVar(k), venv), k + 1, t.body);
    return cevaluate(CPi(t.type, cquote(rt, k + 1)), henv, venv);
  }
  if (t.tag === 'CPi') {
    check(henv, tenv, venv, k, t.type, CType);
    check(henv, Cons(cevaluate(t.type, henv, venv), tenv), Cons(CVVar(k), venv), k + 1, t.body, CType);
    return CType;
  }
  if (t.tag === 'CApp') {
    const ta = synth(henv, tenv, venv, k, t.left);
    return synthapp(henv, tenv, venv, k, ta, t.right);
  }
  if (t.tag === 'CLet') {
    check(henv, tenv, venv, k, t.type, CType);
    const vty = cevaluate(t.type, henv, venv);
    check(henv, tenv, venv, k, t.value, vty);
    return synth(henv, Cons(vty, tenv), Cons(cevaluate(t.value, henv, venv), venv), k + 1, t.body);
  }
  if (t.tag === 'CHash') {
    const r = henv[t.hash];
    if (!r) return terr(`undefined hash ${showCore(t)}`);
    return r.type;
  }
  return terr(`cannot synth ${showCore(t)}`);
};

const synthapp = (henv: CHashEnv, tenv: CEnv, venv: CEnv, k: number, ta: CVal, b: Core): CVal => {
  if (ta.tag === 'CVPi') {
    check(henv, tenv, venv, k, b, ta.type);
    return ta.body(cevaluate(b, henv, venv));
  }
  return terr(`invalid type in synthapp: ${showCore(cquote(ta, k))}`);
};

export const typecheck = (henv: CHashEnv, t: Core): Core => {
  const ty = synth(henv, Nil, Nil, 0, t);
  return cquote(ty);
};
