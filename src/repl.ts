import { normalize } from './nbe';
import { elaborate } from './elaborate';
import { parse } from './parser';
import { showTerm } from './terms';
import { config } from './config';

export const initREPL = () => {};

export const runREPL = (_s: string, _cb: (msg: string, err?: boolean) => void) => {
  try {
    if (_s === ':debug') {
      config.debug = !config.debug;
      return _cb(`debug is now ${config.debug}`);
    }
    const tm = parse(_s);
    console.log(`inpt: ${showTerm(tm)}`);
    const [term, type] = elaborate(tm);
    console.log(`term: ${showTerm(term)}`);
    console.log(`type: ${showTerm(type)}`);
    const nf = normalize(term);
    console.log(`nmfm: ${showTerm(nf)}`);
    return _cb(`${showTerm(term)} : ${showTerm(type)} ~> ${showTerm(nf)}`);
  } catch (err) {
    return _cb('' + err, true);
  }
};
