import { initREPL, runREPL } from './repl';
import { setConfig } from './config';
import { parseDefs } from './parser';
import { showCore, showVal } from './surface';
import { elaborateDefs } from './elaboration';
import { normalize } from './values';
import { getGlobal } from './globals';

if (process.argv[2]) {
  const option = process.argv[3] || '';
  if (option.includes('d')) setConfig({ debug: true });
  if (option.includes('e')) setConfig({ showEnvs: true });
  if (option.includes('b')) setConfig({ useBase: true });
  if (option.includes('w')) setConfig({ writeToBase: true });
  try {
    const sc = require('fs').readFileSync(process.argv[2], 'utf8');
    parseDefs(sc, process.argv[2]).then(ds => {
      const ns = elaborateDefs(ds, false);
      const main = getGlobal('main');
      if (!main) console.log(`defined ${ns.join(' ')}`);
      else {
        console.log(`${showCore(main.term)}`);
        console.log(`${showVal(main.type)}`);
        console.log(`${showCore(normalize(main.term, true))}`);
      }
      process.exit();
    }).catch(err => {
      console.error(err);
      process.exit();
    });
  } catch(err) {
    console.error(err);
    process.exit();
  }
} else {
  const _readline = require('readline').createInterface(process.stdin, process.stdout);
  console.log('tinka repl');
  process.stdin.setEncoding('utf8');
  function _input() {
    _readline.question('> ', function(_i: string) {
      runREPL(_i, (s: string, _e?: boolean) => {
        console.log(s);
        setImmediate(_input, 0);
      });
    });
  };
  initREPL();
  _input();
}
