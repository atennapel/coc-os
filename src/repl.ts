import { parse, parseDefs } from './surface/parser';
import { log, setConfig, config } from './config';
import { showTerm } from './surface/syntax';
import { elaborate, elaborateDefs } from './surface/elaborate';
import { normalize, quote } from './surface/vals';
import { resetEnv, getEnvMap, delEnv } from './surface/env';

const help = `
EXAMPLES
identity = \\(t : *) (x : t). x
zero = \\t z s. z : /(t : *) t (/t. t). t

COMMANDS
[:help or :h] this help message
[:debug or :d] toggle debug log messages
[:def definitions] define names
[:defs] show all defs
[:del name] delete a name
`.trim();

const loadFile = (fn: string): Promise<string> => Promise.reject(new Error('unimplemented'));

export const initREPL = () => {
  resetEnv();
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
      const e = getEnvMap();
      const msg = Object.keys(e).map(k => `${e[k].opaque ? 'def opaque' : 'def'} ${k} : ${showTerm(quote(e[k].type))} = ${showTerm(quote(e[k].val))}`).join('\n');
      return _cb(msg || 'no definitions');
    }
    if (_s.startsWith(':del')) {
      const name = _s.slice(4).trim();
      delEnv(name);
      return _cb(`deleted ${name}`);
    }
    if (_s.startsWith(':def')) {
      const rest = _s.slice(1);
      const ds = parseDefs(rest);
      const xs = elaborateDefs(ds);
      return _cb(`defined ${xs.join(' ')}`);
    }
    if (_s.startsWith(':import')) {
      const files = _s.slice(7).trim().split(/\s+/g);
      Promise.all(files.map(loadFile)).then(defs => {
        const xs: string[] = [];
        defs.forEach(rest => {
          const ds = parseDefs(rest);
          const lxs = elaborateDefs(ds);
          lxs.forEach(x => xs.push(x));
        });
        return _cb(`imported ${files.join(' ')}; defined ${xs.join(' ')}`);
      }).catch(err => _cb(''+err, true));
      return;
    }
    let typeOnly = false;
    if (_s.startsWith(':t')) {
      _s = _s.slice(_s.startsWith(':type') ? 5 : 2);
      typeOnly = true;
    } else if (_s.startsWith(':')) return _cb('invalid command', true);
    let msg = '';
    let tm_;
    try {
      const t = parse(_s);
      log(() => showTerm(t));
      const [ty, tm] = elaborate(t);
      tm_ = tm;
      log(() => showTerm(ty));
      log(() => showTerm(tm));
      msg += `type: ${showTerm(ty)}\nterm: ${showTerm(tm)}`;
      if (typeOnly) return _cb(msg);
    } catch (err) {
      log(() => ''+err);
      return _cb(''+err, true);
    }
    try {
      const n = normalize(tm_);
      log(() => showTerm(n));
      msg += '\nnorm: ' + showTerm(n);
      return _cb(msg);
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
