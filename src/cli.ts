import { parseDefs } from './surface/parser';
import { elaborateDefs } from './surface/elaborate';
import { initREPL, runREPL } from './repl';
import { getEnvMap } from './surface/env';
import { showTerm } from './surface/syntax';
import { quote } from './surface/vals';

if (process.argv[2]) {
  try {
    const sc = require('fs').readFileSync(process.argv[2], 'utf8');
    const ds = parseDefs(sc);
    const ns = elaborateDefs(ds);
    const m = getEnvMap();
    const main = m.main;
    if (!main) console.log(`defined ${ns.join(' ')}`);
    else {
      console.log(`${showTerm(quote(main.val))} : ${showTerm(quote(main.type))}`);
    }
    process.exit();
  } catch(err) {
    console.error(err);
    process.exit();
  };
} else {
  const _readline = require('readline').createInterface(process.stdin, process.stdout);
  console.log('REPL');
  process.stdin.setEncoding('utf8');
  function _input() {
    _readline.question('> ', function(_i: string) {
      runREPL(_i, (s: string, e?: boolean) => {
        console.log(s);
        setImmediate(_input, 0);
      });
    });
  };
  initREPL();
  _input();
}
