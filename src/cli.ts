import { initREPL, runREPL } from './repl';
import { log, setConfig } from './config';
import { parseDefs } from './parser';
import { showCore, showDefs } from './surface';
import { elaborateDefs } from './elaboration';
import { getGlobals } from './globals';
import * as E from './erased';

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

      const gs = getGlobals();
      if (gs.main) {
        const e = gs.main;
        const eterm = e.term;
        const etype = e.etype;
        let neras: string | null = '';

        if (e.erasedTerm) neras = E.show(E.quote(e.erasedTerm[1], 0, true));

        console.log(`type: ${showCore(etype)}\netrm: ${showCore(eterm)}${neras ? `\nnorm: ${neras}` : ''}`);
      } else console.log('no main definition');
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
