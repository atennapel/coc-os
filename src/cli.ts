import { initREPL, runREPL } from './repl';
import { log, setConfig } from './config';
import { parse } from './parser';
import { show, showCore } from './surface';
import { elaborate } from './elaboration';
import * as C from './core';
import { typecheck } from './typecheck';
import { normalize } from './values';

if (process.argv[2]) {
  const option = process.argv[3] || '';
  if (option.includes('d')) setConfig({ debug: true });
  if (option.includes('e')) setConfig({ showEnvs: true });
  try {
    const sc = require('fs').readFileSync(process.argv[2], 'utf8');
    const term = parse(sc);
    console.log(`term: ${show(term)}`);
    log(() => show(term));

    log(() => 'ELABORATE');
    const [eterm, etype] = elaborate(term);
    console.log(`type: ${showCore(etype)}`);
    console.log(`etrm: ${showCore(eterm)}`);
    log(() => C.show(eterm));
    log(() => showCore(eterm));
    log(() => C.show(etype));
    log(() => showCore(etype));

    log(() => 'TYPECHECK');
    const ttype = typecheck(eterm);
    log(() => C.show(ttype));
    log(() => showCore(ttype));

    log(() => 'NORMALIZE');
    const norm = normalize(eterm);
    console.log(`norm: ${showCore(norm)}`);
    log(() => C.show(norm));
    log(() => showCore(norm));
  } catch(err) {
    console.error(err);
    process.exit();
  };
} else {
  const _readline = require('readline').createInterface(process.stdin, process.stdout);
  console.log('tinka repl');
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
