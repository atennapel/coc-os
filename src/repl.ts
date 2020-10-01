import { config, log, setConfig } from './config';
import { elaborate } from './elaboration';
import { parse } from './parser';
import { show, showCore, showVal } from './surface';
import * as C from './core';
import { typecheck } from './typecheck';
import { evaluate, normalize } from './values';
import { deleteGlobal, getGlobal, getGlobals, hasGlobal, setGlobal } from './globals';
import { Nil } from './utils/list';
import { Name } from './names';

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
`.trim();

export const initREPL = () => {
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
      const name = s.slice(7).trim();
      const res = getGlobal(name);
      if (!res) return cb(`undefined global: ${name}`, true);
      return cb(showVal(res.val));
    }
    if (s.startsWith(':gnorm')) {
      const name = s.slice(7).trim();
      const res = getGlobal(name);
      if (!res) return cb(`undefined global: ${name}`, true);
      return cb(showVal(res.val, 0, Nil, true));
    }

    let code = s;
    let g: Name | null = null;
    if (s.startsWith(':def')) {
      const spl = s.slice(4).trim().split('=');
      g = spl[0].trim();
      code = spl.slice(1).join('=');
    }

    const term = parse(code);
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
    const norm = normalize(eterm, true);
    log(() => C.show(norm));
    log(() => showCore(norm));

    if (g) {
      if (hasGlobal(g)) deleteGlobal(g);
      setGlobal(g, eterm, evaluate(eterm, Nil), evaluate(etype, Nil));
    }

    return cb(`${g ? `defined ${g}\n` : ''}term: ${show(term)}\ntype: ${showCore(etype)}\netrm: ${showCore(eterm)}\nnorm: ${showCore(norm)}`);
  } catch (err) {
    return cb(`${err}`, true);
  }
};
