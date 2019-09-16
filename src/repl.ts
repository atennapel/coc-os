import { normalize } from './language/nbe';
import { elaborate } from './language/elaborate';
import { parse } from './language/parser';
import { showTerm } from './language/terms';
import { config } from './config';
import { showCore } from './core/terms';
import { toCore } from './language/translation';
import { typecheck } from './core/typecheck';

export const initREPL = () => {};

export const runREPL = (_s: string, _cb: (msg: string, err?: boolean) => void) => {
  try {
    if (_s === ':debug') {
      config.debug = !config.debug;
      return _cb(`debug is now ${config.debug}`);
    }
    const tm = parse(_s);
    console.log(`inpt: ${showTerm(tm)}`);
    const [term, type] = elaborate(tm);
    console.log(`term: ${showTerm(term)}`);
    console.log(`type: ${showTerm(type)}`);
    const nf = normalize(term);
    console.log(`nmfm: ${showTerm(nf)}`);
    const core = toCore(term);
    const cty = typecheck(core);
    console.log(`core: ${showCore(core)} : ${showCore(cty)}`);
    return _cb(`${showTerm(term)} : ${showTerm(type)} ~> ${showTerm(nf)} ~> ${showCore(core)} : ${showCore(cty)}`);
  } catch (err) {
    return _cb('' + err, true);
  }
};
