import { config } from './config';
import { parse } from './surface/parser';
import { showTerm } from './surface/terms';
import { typecheck } from './surface/typecheck';
import { normalize } from './surface/vals';

export const initREPL = () => {};

export const runREPL = (_s: string, _cb: (msg: string, err?: boolean) => void) => {
  try {
    if (_s === ':debug') {
      config.debug = !config.debug;
      return _cb(`debug is now ${config.debug}`);
    }
    const tm = parse(_s);
    console.log(`inpt: ${showTerm(tm)}`);
    const [type, term] = typecheck(tm);
    console.log(`term: ${showTerm(term)}`);
    console.log(`type: ${showTerm(type)}`);
    const nf = normalize(term);
    console.log(`nmfm: ${showTerm(nf)}`);
    return _cb(`${showTerm(term)} : ${showTerm(type)} ~>\n${showTerm(nf)}`);
  } catch (err) {
    return _cb('' + err, true);
  }
};
