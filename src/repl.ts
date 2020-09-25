import { config, log, setConfig } from './config';
import { elaborate } from './elaboration';
import { parse } from './parser';
import { show, showCore } from './surface';
import * as C from './core';
import { typecheck } from './typecheck';
import { normalize } from './values';

export const initREPL = () => {
};

export const runREPL = (s: string, cb: (msg: string, err?: boolean) => void) => {
  try {
    if (s === ':d' || s === ':debug') {
      const d = !config.debug;
      setConfig({ debug: d });
      return cb(`debug: ${d}`);
    }
    const term = parse(s);
    log(() => show(term));
    log(() => 'ELABORATE');
    const [eterm, etype] = elaborate(term);
    log(() => C.show(eterm));
    log(() => showCore(eterm));
    log(() => C.show(etype));
    log(() => showCore(etype));

    log(() => 'TYPECHECK');
    const ttype = typecheck(eterm);
    log(() => C.show(ttype));
    log(() => showCore(ttype));

    log(() => 'NORMALIZE');
    const norm = normalize(eterm);
    log(() => C.show(norm));
    log(() => showCore(norm));

    return cb(`term: ${show(term)}\ntype: ${showCore(etype)}\netrm: ${showCore(eterm)}\nnorm: ${showCore(norm)}`);
  } catch (err) {
    return cb(`${err}`, true);
  }
};
