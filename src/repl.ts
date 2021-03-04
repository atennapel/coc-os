import { config, log, setConfig } from './config';
import { ImportMap, parse, parseDefs } from './parser';
import { show, showCore, showVal } from './surface';
import * as C from './core';
import { typecheck } from './typecheck';
import { deleteGlobal, getGlobal, getGlobals } from './globals';
import { loadFile } from './utils/utils';
import { elaborate, elaborateDefs } from './elaboration';
import * as E from './erased';
import { nil } from './utils/List';

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
[:showStackTrace] show stack trace of error
`.trim();

let showStackTrace = false;
let importMap: ImportMap = {};

export const initREPL = () => {
  showStackTrace = false;
  importMap = {};
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
    if (s === ':showStackTrace') {
      showStackTrace = !showStackTrace;
      return cb(`showStackTrace: ${showStackTrace}`);
    }
    if (s === ':defs') {
      const gs = getGlobals();
      const r: string[] = [];
      for (const x in gs)
        r.push(`def ${x} : ${showVal(gs[x].type)} = ${showCore(gs[x].term)}`);
      return cb(r.length === 0 ? 'no definitions' : r.join('\n'));
    }
    if (s.startsWith(':del')) {
      const names = s.slice(4).trim().split(/\s+/g);
      names.forEach(x => deleteGlobal(x));
      return cb(`deleted ${names.join(' ')}`);
    }
    if (s.startsWith(':view')) {
      const files = s.slice(5).trim().split(/\s+/g);
      Promise.all(files.map(loadFile)).then(ds => {
        return cb(ds.join('\n\n'));
      }).catch(err => cb(''+err, true));
      return;
    }
    if (s.startsWith(':clearImportMap')) {
      importMap = {};
      return cb(`cleared import map`);
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
      return cb(showVal(res.type, 0, true));
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
      return cb(showVal(res.value));
    }
    if (s.startsWith(':gnorm')) {
      const name = s.slice(6).trim();
      const res = getGlobal(name);
      if (!res) return cb(`undefined global: ${name}`, true);
      return cb(showVal(res.value, 0, true));
    }
    if (s.startsWith(':')) return cb(`invalid command: ${s}`, true);

    if (['def', 'import'].some(x => s.startsWith(x))) {
      parseDefs(s, importMap).then(ds => {
        elaborateDefs(ds); // TODO: show which items were defined
        return cb(`done`);
      }).catch(err => cb(`${err}`, true));
      return;
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
    const eras = E.erase(eterm);
    log(() => E.show(eras));
    const neras = E.normalize(eras, 0, nil, true);
    log(() => E.show(neras));

    return cb(`term: ${show(term)}\ntype: ${showCore(etype)}\netrm: ${showCore(eterm)}\nnorm: ${E.show(neras)}`);
  } catch (err) {
    if (showStackTrace) console.error(err);
    return cb(`${err}`, true);
  }
};
