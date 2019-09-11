import { parse } from './parser';
import { toNameless } from './surface';
import { elaborate } from './elaboration';
import { cenv, runREPL } from './repl';
import { showTerm } from './terms';
import { nf } from './nbe';
import { showETerm, erase } from './erased';

if (process.argv[2]) {
  const sc = require('fs').readFileSync(process.argv[2], 'utf8');
  const ds = parse(sc);
  const nm = toNameless(ds);
  const [tm, ty] = elaborate(nm, cenv);
  console.log(`${showTerm(tm)} : ${showTerm(ty)}`);
  const normal = nf(tm);
  console.log(showTerm(normal));
  console.log(showETerm(erase(normal)));
  process.exit();
}

import * as readline from 'readline';
const _readline = readline.createInterface(process.stdin, process.stdout);
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
