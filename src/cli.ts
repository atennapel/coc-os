import { initREPL, runREPL } from './repl';
import { log, setConfig } from './config';
import { parseDefs } from './parser';
import { showDefs } from './surface';
import { elaborateDefs } from './elaboration';

if (process.argv[2]) {
  const option = process.argv[3] || '';
  if (option.includes('d')) setConfig({ debug: true });
  if (option.includes('e')) setConfig({ showEnvs: true });
  try {
    const s = require('fs').readFileSync(process.argv[2], 'utf8');
    parseDefs(s, {}).then(ds => {
      log(() => showDefs(ds));

      log(() => 'ELABORATE');
      elaborateDefs(ds);
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
