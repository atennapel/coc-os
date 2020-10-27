import { config, log, setConfig } from './config';
import { elaborate, elaborateDefs } from './elaboration';
import { parse, parseDefs } from './parser';
import { show, showCore, showVal } from './surface';
import * as C from './core';
import * as E from './erased';
import * as EV from './erasedvalues';
import { typecheck } from './typecheck';
import { normalize } from './values';
import { deleteGlobal, getGlobal, getGlobals } from './globals';
import { Nil } from './utils/list';
import { loadFile } from './utils/utils';
import { serializeCore } from './serialization';

const help = `
COMMANDS
[:help or :h] this help message
[:debug or :d] toggle debug log messages
[:defs] show all defs
[:del name] delete a name
[:gtype name] view the type of a name
[:gtyno name] view the fully normalized type of a name
[:gelab name] view the elaborated term of a name
[:gterm name] view the term of a name
[:gnorm name] view the fully normalized term of a name
[:geras name] view the fully erased term of a name
[:gnera name] view the fully normalized erased term of a name
[:view files] view a file
[:def definitions] define names
[:import files] import a file
[:addunfold x y z] always unfold globals
[:postponeInvalidSolution] postpone more invalid meta solutions
[:useBase] use the base library
[:writeToBase] write definitions to base
`.trim();

export const initREPL = () => {
  config.unfold.push('typeof');
};

export const runREPL = (s_: string, cb: (msg: string, err?: boolean) => void) => {
  try {
    const s = s_.trim();
    if (s === ':help' || s === ':h')
      return cb(help);
    if (s === ':d' || s === ':debug') {
      const d = !config.debug;
      setConfig({ debug: d });
      return cb(`debug: ${d}`);
    }
    if (s.startsWith(':addunfold')) {
      const xs = s.slice(10).trim().split(/\s+/g);
      const u = config.unfold;
      xs.forEach(x => u.push(x));
      return cb(`unfold: ${u.join(' ')}`);
    }
    if (s === ':postponeInvalidSolution') {
      const d = !config.postponeInvalidSolution;
      setConfig({ postponeInvalidSolution: d });
      return cb(`postponeInvalidSolution: ${d}`);
    }
    if (s === ':useBase') {
      const d = !config.useBase;
      setConfig({ useBase: d });
      return cb(`useBase: ${d}`);
    }
    if (s === ':writeToBase') {
      const d = !config.writeToBase;
      setConfig({ writeToBase: d });
      return cb(`writeToBase: ${d}`);
    }
    if (s === ':defs') {
      const gs = getGlobals();
      const r: string[] = [];
      for (const [k, e] of gs)
        r.push(`def ${k} : ${showVal(e.type)} = ${showCore(e.term)}`);
      return cb(r.length === 0 ? 'no definitions' : r.join('\n'));
    }
    if (s.startsWith(':del')) {
      const names = s.slice(4).trim().split(/\s+/g);
      names.forEach(x => deleteGlobal(x));
      return cb(`deleted ${names.join(' ')}`);
    }
    if ([':def', ':import', ':execute', ':typecheck', ':-execute', '-typecheck'].some(x => s.startsWith(x))) {
      const rest = s.slice(1);
      parseDefs(rest).then(ds => {
        const xs = elaborateDefs(ds, true);
        return cb(xs.length === 0 ? `done` : `done, defined ${xs.join(' ')}`);
      }).catch(err => cb(''+err, true));
      return;
    }
    if (s.startsWith(':view')) {
      const files = s.slice(5).trim().split(/\s+/g);
      Promise.all(files.map(loadFile)).then(ds => {
        return cb(ds.join('\n\n'));
      }).catch(err => cb(''+err, true));
      return;
    }
    if (s.startsWith(':gtype')) {
      const name = s.slice(6).trim();
      const res = getGlobal(name);
      if (!res) return cb(`undefined global: ${name}`, true);
      return cb(showVal(res.type));
    }
    if (s.startsWith(':gtyno')) {
      const name = s.slice(6).trim();
      const res = getGlobal(name);
      if (!res) return cb(`undefined global: ${name}`, true);
      return cb(showVal(res.type, 0, Nil, true));
    }
    if (s.startsWith(':gelab')) {
      const name = s.slice(6).trim();
      const res = getGlobal(name);
      if (!res) return cb(`undefined global: ${name}`, true);
      return cb(showCore(res.term));
    }
    if (s.startsWith(':gterm')) {
      const name = s.slice(6).trim();
      const res = getGlobal(name);
      if (!res) return cb(`undefined global: ${name}`, true);
      return cb(showVal(res.val));
    }
    if (s.startsWith(':gnorm')) {
      const name = s.slice(6).trim();
      const res = getGlobal(name);
      if (!res) return cb(`undefined global: ${name}`, true);
      return cb(showVal(res.val, 0, Nil, true));
    }
    if (s.startsWith(':geras')) {
      const name = s.slice(6).trim();
      const res = getGlobal(name);
      if (!res) return cb(`undefined global: ${name}`, true);
      return cb(E.show(res.termerased));
    }
    if (s.startsWith(':gnera')) {
      const name = s.slice(6).trim();
      const res = getGlobal(name);
      if (!res) return cb(`undefined global: ${name}`, true);
      return cb(E.show(EV.quote(res.valerased, 0, true)));
    }

    const term = parse(s);
    log(() => show(term));

    log(() => 'ELABORATE');
    const [eterm, etype] = elaborate(term);
    log(() => C.show(eterm));
    log(() => showCore(eterm));
    log(() => C.show(etype));
    log(() => showCore(etype));
    const [ser, ns] = serializeCore(eterm);
    log(() => `serialized: ${ser}`);
    log(() => `names: ${JSON.stringify(ns)}`);

    const unfolded = normalize(eterm, false);
    log(() => showCore(unfolded));

    log(() => 'TYPECHECK');
    const [ttype, er] = typecheck(eterm);
    log(() => C.show(ttype));
    log(() => showCore(ttype));
    log(() => E.show(er));

    return cb(`term: ${show(term)}\ntype: ${showCore(etype)}\netrm: ${showCore(eterm)}\netru: ${showCore(unfolded)}\neras: ${E.show(er)}\nnera: ${E.show(EV.normalize(er, true))}`);
  } catch (err) {
    return cb(`${err}`, true);
  }
};
