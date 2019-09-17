import { elaborate } from './language/elaborate';
import { runREPL, initREPL, henv, chenv } from './repl';
import * as readline from 'readline';
import { showTerm } from './language/terms';
import { normalize } from './language/nbe';
import { parse } from './language/parser';
import { toCore } from './language/translation';
import { typecheck } from './core/typecheck';
import { showCore } from './core/terms';
import { cnormalize } from './core/nbe';
import { serializeCore, deserializeCore } from './core/serialize';
import { hashBytes } from './hash';

if (process.argv[2]) {
  const sc = require('fs').readFileSync(process.argv[2], 'utf8');
  const tm = parse(sc);
  console.log(`inpt: ${showTerm(tm)}`);
  const [term, type] = elaborate(henv, tm);
  console.log(`term: ${showTerm(term)}`);
  console.log(`type: ${showTerm(type)}`);
  console.log(`nmfm: ${showTerm(normalize(term, henv))}`);
  const core = toCore(term);
  const cty = typecheck(chenv, core);
  console.log(`core: ${showCore(core)} : ${showCore(cty)}`);
  console.log(`conf: ${showCore(cnormalize(core, chenv))}`);
  const ser = serializeCore(core);
  const hsh = hashBytes(ser);
  console.log(`serz: ${ser.toString('hex')}`);
  console.log(`hash: ${hsh.toString('hex')}`);
  console.log(`desz: ${showCore(deserializeCore(ser))}`);
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
