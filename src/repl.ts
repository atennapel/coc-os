import { parse } from './surface/parser';
import { log, setConfig, config } from './config';
import { showTerm } from './surface/syntax';
import { elaborate } from './surface/elaborate';
import { normalize, evaluate, quote } from './surface/vals';
import { resetEnv, setEnv, getEnvMap, delEnv } from './surface/env';

const help = `
EXAMPLES
identity = \\(t : *) (x : t). x
zero = \\t z s. z : /(t : *) t (/t. t). t

COMMANDS
[:help or :h] this help message
[:debug or :d] toggle debug log messages
[:def name term] set a name
[:defs] show all defs
[:del name] delete a name
`.trim();

export const initREPL = () => {
  resetEnv();
};

export const runREPL = (_s: string, _cb: (msg: string, err?: boolean) => void) => {
  _s = _s.trim();
  if (_s === ':help' || _s === ':h')
    return _cb(help);
  if (_s === ':debug' || _s === ':d') {
    setConfig({ debug: !config.debug });
    return _cb(`debug: ${config.debug}`);
  }
  if (_s === ':defs') {
    const e = getEnvMap();
    const msg = Object.keys(e).map(k => `${k} : ${showTerm(quote(e[k][1]))} = ${showTerm(quote(e[k][0]))}`).join('\n');
    return _cb(msg || 'no definitions');
  }
  if (_s.startsWith(':del')) {
    const name = _s.slice(4).trim();
    delEnv(name);
    return _cb(`deleted ${name}`);
  }
  let name = null;
  if (_s.startsWith(':def')) {
    const rest = _s.slice(4).trim();
    name = rest.split(/\s+/)[0].trim();
    _s = rest.slice(name.length).trim();
  }
  let msg = '';
  let tm_;
  let ty_;
  try {
    const t = parse(_s);
    log(() => showTerm(t));
    const [ty, tm] = elaborate(t);
    tm_ = tm;
    ty_ = ty;
    log(() => showTerm(ty));
    log(() => showTerm(tm));
    msg += `type: ${showTerm(ty)}\nterm: ${showTerm(tm)}`;
  } catch (err) {
    log(() => ''+err);
    return _cb(''+err, true);
  }
  try {
    const n = normalize(tm_);
    log(() => showTerm(n));
    msg += '\nnorm: ' + showTerm(n);
    if (name) {
      setEnv(name, evaluate(tm_), evaluate(ty_));
      msg += `\ndefined ${name}`;
    }
    return _cb(msg);
  } catch (err) {
    log(() => ''+err);
    msg += '\n'+err;
    return _cb(msg);
  }
};
