import { log, setConfig, config } from './config';
import { showTerm } from './surface';
import { parseDefs, parse, ImportMap } from './parser';
import { Nil } from './utils/list';
import { loadFile } from './utils/util';
import { globalReset, globalMap, globalDelete, globalGet } from './globalenv';
import { toInternalDefs } from './definitions';
import { typecheckDefs, typecheck } from './typecheck';
import { showTermUZ, normalize } from './domain';
import { showSurface, toInternal, Term } from './syntax';
import { quote as quoteC, normalize as normalizeC } from './core/domain';
import { showTerm as showTermC, toCore, Term as CTerm } from './core/syntax';
import { typecheck as typecheckC } from './core/typecheck';

const help = `
EXAMPLES
identity = \\{t : *} (x : t). x
zero = \\{t} z s. z : {t : *} -> t -> (t -> t) -> t

COMMANDS
[:help or :h] this help message
[:debug or :d] toggle debug log messages
[:def definitions] define names
[:defs] show all defs
[:import files] import a file
[:view files] view a file
[:t term] or [:type term] show the type of an expressions
[:del name] delete a name
[:gtypec name] view the core type of a name
[:gtypenormc name] view the fully normalized core type of a name
[:gelabc name] view the core elaborated term of a name
[:gtermc name] view the core term of a name
[:gnormc name] view the fully normalized core term of a name
[:gtype name] view the fully normalized type of a name
[:gelab name] view the elaborated term of a name
[:gterm name] view the term of a name
[:gnorm name] view the fully normalized term of a name
[:core term] also typecheck core term
`.trim();

let importMap: ImportMap = {};

export const initREPL = () => {
  globalReset();
  importMap = {};
};

export const runREPL = (_s: string, _cb: (msg: string, err?: boolean) => void) => {
  try {
    _s = _s.trim();
    if (_s === ':help' || _s === ':h')
      return _cb(help);
    if (_s === ':debug' || _s === ':d') {
      setConfig({ debug: !config.debug });
      return _cb(`debug: ${config.debug}`);
    }
    if (_s === ':defs') {
      const e = globalMap();
      const msg = Object.keys(e).map(k => `def ${k} : ${showTermUZ(e[k].type)} = ${showSurface(e[k].term)} ~> ${showTermUZ(e[k].val)}`).join('\n');
      return _cb(msg || 'no definitions');
    }
    if (_s.startsWith(':del')) {
      const name = _s.slice(4).trim();
      globalDelete(name);
      return _cb(`deleted ${name}`);
    }
    if (_s.startsWith(':def') || _s.startsWith(':import')) {
      const rest = _s.slice(1);
      parseDefs(rest, importMap).then(ds => {
        const dsc = toInternalDefs(ds)
        const xs = typecheckDefs(dsc, true);
        return _cb(`defined ${xs.join(' ')}`);
      }).catch(err => _cb(''+err, true));
      return;
    }
    if (_s.startsWith(':gtypenormc')) {
      const name = _s.slice(11).trim();
      const res = globalGet(name);
      if (!res) return _cb(`undefined global: ${name}`, true);
      return _cb(showTermC(quoteC(res.coretype, 0, true)));
    }
    if (_s.startsWith(':gtypec')) {
      const name = _s.slice(7).trim();
      const res = globalGet(name);
      if (!res) return _cb(`undefined global: ${name}`, true);
      return _cb(showTermC(quoteC(res.coretype, 0, false)));
    }
    if (_s.startsWith(':gtype')) {
      const name = _s.slice(6).trim();
      const res = globalGet(name);
      if (!res) return _cb(`undefined global: ${name}`, true);
      return _cb(showTermUZ(res.type, Nil, Nil, 0, true));
    }
    if (_s.startsWith(':gelabc')) {
      const name = _s.slice(7).trim();
      const res = globalGet(name);
      if (!res) return _cb(`undefined global: ${name}`, true);
      return _cb(showTermC(res.coreterm));
    }
    if (_s.startsWith(':gelab')) {
      const name = _s.slice(6).trim();
      const res = globalGet(name);
      if (!res) return _cb(`undefined global: ${name}`, true);
      return _cb(showSurface(res.term));
    }
    if (_s.startsWith(':gtermc')) {
      const name = _s.slice(7).trim();
      const res = globalGet(name);
      if (!res) return _cb(`undefined global: ${name}`, true);
      return _cb(showTermC(quoteC(res.coreval, 0, false)));
    }
    if (_s.startsWith(':gterm')) {
      const name = _s.slice(7).trim();
      const res = globalGet(name);
      if (!res) return _cb(`undefined global: ${name}`, true);
      return _cb(showTermUZ(res.val));
    }
    if (_s.startsWith(':gnormc')) {
      const name = _s.slice(7).trim();
      const res = globalGet(name);
      if (!res) return _cb(`undefined global: ${name}`, true);
      return _cb(showTermC(quoteC(res.coreval, 0, true)));
    }
    if (_s.startsWith(':gnorm')) {
      const name = _s.slice(7).trim();
      const res = globalGet(name);
      if (!res) return _cb(`undefined global: ${name}`, true);
      return _cb(showTermUZ(res.val, Nil, Nil, 0, true));
    }
    if (_s.startsWith(':view')) {
      const files = _s.slice(5).trim().split(/\s+/g);
      Promise.all(files.map(loadFile)).then(ds => {
        return _cb(ds.join('\n\n'));
      }).catch(err => _cb(''+err, true));
      return;
    }
    let typeOnly = false;
    let core = false;
    if (_s.startsWith(':t')) {
      _s = _s.slice(_s.startsWith(':type') ? 5 : 2);
      typeOnly = true;
    }
    if (_s.startsWith(':core')) {
      _s = _s.slice(5);
      core = true;
    }
    if (_s.startsWith(':')) return _cb('invalid command', true);
    let msg = '';
    let tm_: Term;
    let tmc_: CTerm | null = null;
    try {
      const t = parse(_s);
      log(() => showTerm(t));
      const tt = toInternal(t);
      const [ztm, vty] = typecheck(tt);
      tm_ = ztm;
      log(() => showTermUZ(vty));
      log(() => showSurface(tt));
      log(() => showSurface(tm_));
      msg += `type: ${showTermUZ(vty)}\nterm: ${showSurface(tm_)}`;
      if (core) {
        const ctm = toCore(ztm);
        tmc_ = ctm;
        log(() => showTermC(ctm));
        const cty = typecheckC(ctm);
        const ctyq = quoteC(cty, 0, false);
        log(() => showTermC(ctyq));
        msg += `\nctyp: ${showTermC(ctyq)}\ncter: ${showTermC(tmc_)}`;
      }
      if (typeOnly) return _cb(msg);
    } catch (err) {
      log(() => ''+err);
      return _cb(''+err, true);
    }
    try {
      const n = normalize(tm_, Nil, 0, true);
      log(() => showSurface(n));
      return _cb(`${msg}\nnorm: ${showSurface(n)}${core && tmc_ ? `\ncnor: ${showTermC(normalizeC(tmc_, Nil, 0, true))}` : ''}`);
    } catch (err) {
      log(() => ''+err);
      msg += '\n'+err;
      return _cb(msg, true);
    }
  } catch (err) {
    log(() => ''+err);
    return _cb(err, true);
  }
};
