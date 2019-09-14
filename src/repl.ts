import { normalize } from './nbe';
import { elaborate } from './elaborate';
import { parse } from './parser';
import { showTerm } from './terms';

export const initREPL = () => {};

export const runREPL = (_s: string, _cb: (msg: string, err?: boolean) => void) => {
  try {
    const tm = parse(_s);
    const [term, type] = elaborate(tm);
    const nf = normalize(term);
    console.log(`term: ${showTerm(term)}`);
    console.log(`type: ${showTerm(type)}`);
    console.log(`nmfm: ${showTerm(nf)}`);
    return _cb(`${showTerm(term)} : ${showTerm(type)} ~> ${showTerm(nf)}`);
  } catch (err) {
    return _cb('' + err, true);
  }
};
