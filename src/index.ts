// @ts-ignore
import { Var, Abs, Type, showTerm, App, Pi } from './surface/terms';
import { typecheck } from './surface/typecheck';
import { parse } from './surface/parser';
import { setConfig } from './config';

/**
 * TODO:
 * - fix parsing of lets
 * - core let does not need type
 * - erased normalization
 * - convert surface to core
 * - delaboration/redecoration
 */

const script = `
let Nat (/@ t * -> t (-> t t) t)
let z (: (\\(z s) z) Nat)
let s (: (\\(n z s) s (n z s)) (-> Nat Nat))
(s (s z))
`;

setConfig({ debug: true });

try {
  const term = parse(script);
  console.log(showTerm(term));
  const [ty, tm] = typecheck(term);
  console.log(`${showTerm(tm)} : ${showTerm(ty)}`);
} catch (err) {
  console.log(err);
}
