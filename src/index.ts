// @ts-ignore
import { Var, Abs, Type, showTerm, App, Pi, toCore } from './surface/terms';
import { typecheck } from './surface/typecheck';
import { parse } from './surface/parser';
import { setConfig } from './config';
import * as C from './core/terms';
import { erase, showETerm } from './erased/terms';
import * as CV from './core/vals';
import { normalize } from './surface/vals';
import * as EV from './erased/vals';

/**
 * TODO:
 * - repl let cmd, fix defs in debruijn
 * - delaboration/redecoration
 */

const script = `
leti Nat (/@ t * -> t (-> t t) t)
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
  const etm = normalize(tm);
  console.log(showTerm(etm));
  const core = toCore(tm);
  console.log(C.showTerm(core));
  const cnm = CV.normalize(core);
  console.log(C.showTerm(cnm));
  const er = erase(core);
  console.log(showETerm(er));
  const ner = EV.normalize(er);
  console.log(showETerm(ner));
} catch (err) {
  console.log(err);
}
