import { parse } from './parser';
import { toNameless, showSTerm } from './surface';
import { elaborate } from './elaboration';
import { runREPL } from './repl';
import { showTerm } from './terms';
import { nf } from './nbe';
import { showETerm, erase } from './erased';
import { typecheck } from './typecheck';

if (process.argv[2]) {
  const sc = require('fs').readFileSync(process.argv[2], 'utf8');
  const ds = parse(sc);
  console.log(showSTerm(ds));
  const nm = toNameless(ds);
  console.log(showSTerm(nm));
  const [tm, ty] = elaborate(nm);
  console.log(`${showTerm(tm)} : ${showTerm(ty)}`);
  console.log(showTerm(typecheck(tm)));
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
