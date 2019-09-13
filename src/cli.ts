import { parseDefs } from './parser';
import { elaborateDefs } from './elaboration';
import { runREPL, initREPL } from './repl';
import { showDefs } from './defs';
import * as readline from 'readline';
import { showTerm } from './terms';
import { nf } from './nbe';
import { showETerm, erase } from './erased';

if (process.argv[2]) {
  const sc = require('fs').readFileSync(process.argv[2], 'utf8');
  const ds = parseDefs(sc);
  console.log(showDefs(ds));
  const res = elaborateDefs(ds);
  if (res) {
    const [tm, ty] = res;
    console.log(`${showTerm(tm)}`);
    const normal = nf(tm);
    //console.log(showTerm(normal));
    //console.log(showETerm(erase(normal)));
    console.log(`${showTerm(normal)} : ${showTerm(ty)} ~> ${showETerm(erase(normal))}`);
  }
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
