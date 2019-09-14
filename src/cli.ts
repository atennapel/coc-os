import { elaborate } from './elaborate';
import { runREPL, initREPL } from './repl';
import * as readline from 'readline';
import { showTerm } from './terms';
import { normalize } from './nbe';
import { parse } from './parser';

if (process.argv[2]) {
  const sc = require('fs').readFileSync(process.argv[2], 'utf8');
  const tm = parse(sc);
  const [term, type] = elaborate(tm);
  console.log(`term: ${showTerm(term)}`);
  console.log(`type: ${showTerm(type)}`);
  console.log(`nmfm: ${showTerm(normalize(term))}`);
  process.exit();
}

const _readline = readline.createInterface(process.stdin, process.stdout);
initREPL();
console.log('REPL');
process.stdin.setEncoding('utf8');
function _input() {
  _readline.question('> ', function(_i: string) {
    runREPL(_i, (s, e) => {
      console.log(s);
      setImmediate(_input, 0);
    });
  });
};
_input();
