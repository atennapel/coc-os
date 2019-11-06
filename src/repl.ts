import { config, log } from './config';
import { parse } from './surface/parser';
import { showTerm, toCore } from './surface/terms';
import { typecheck } from './surface/typecheck';
import { normalize } from './surface/vals';
import * as C from './core/terms';
import * as CV from './core/vals';
import { erase, showETerm } from './erased/terms';
import * as EV from './erased/vals';

export const initREPL = () => {};

export const runREPL = (_s: string, _cb: (msg: string, err?: boolean) => void) => {
  try {
    if (_s === ':debug') {
      config.debug = !config.debug;
      return _cb(`debug is now ${config.debug}`);
    }
    const tm = parse(_s);
    log(() => `inpt: ${showTerm(tm)}`);
    const [type, term] = typecheck(tm);
    log(() => `term: ${showTerm(term)}`);
    log(() => `type: ${showTerm(type)}`);
    const nf = normalize(term);
    log(() => `nmfm: ${showTerm(nf)}`);
    const core = toCore(term);
    log(() => `core: ${C.showTerm(core)}`);
    const cnm = CV.normalize(core);
    log(() => `ncor: ${C.showTerm(cnm)}`);
    const er = erase(core);
    log(() => `eras: ${showETerm(er)}`);
    const ner = EV.normalize(er);
    log(() => `nera: ${showETerm(ner)}`);
    return _cb(`${showTerm(term)} : ${showTerm(type)} ~>\n${showTerm(nf)} ~>\n${C.showTerm(core)} ~>\n${C.showTerm(core)} ~>\n${C.showTerm(cnm)} ~>\n${showETerm(er)} ~>\n${showETerm(ner)}`);
  } catch (err) {
    return _cb('' + err, true);
  }
};
