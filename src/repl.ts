import { parse } from './surface/parser';
import { log, setConfig, config } from './config';
import { showTerm } from './surface/syntax';
import { elaborate } from './surface/elaborate';
import { normalize } from './surface/vals';
import { resetEnv } from './surface/env';

const help = `
EXAMPLES
identity = \\(t : *) (x : t). x
zero = \\t z s. z : /(t : *) t (/t. t). t

COMMANDS
[:help or :h] this help message
[:debug or :d] toggle debug log messages
[:def name term] set a name
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
    return _cb(msg);
  }
};
