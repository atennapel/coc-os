import { initREPL, runREPL } from './repl';
import { log, setConfig } from './config';
import { parse } from './parser';
import { show, showCore } from './surface';
import { elaborate } from './elaboration';
import * as C from './core';
import { typecheck } from './typecheck';
import * as E from './erased';
import { nil } from './utils/List';

if (process.argv[2]) {
  const option = process.argv[3] || '';
  if (option.includes('d')) setConfig({ debug: true });
  if (option.includes('e')) setConfig({ showEnvs: true });
  try {
    const s = require('fs').readFileSync(process.argv[2], 'utf8');
    const term = parse(s);
    log(() => show(term));

    log(() => 'ELABORATE');
    const [eterm, etype] = elaborate(term);
    log(() => C.show(eterm));
    log(() => showCore(eterm));
    log(() => C.show(etype));
    log(() => showCore(etype));

    log(() => 'TYPECHECK');
    const ttype = typecheck(eterm);
    log(() => C.show(ttype));
    log(() => showCore(ttype));

    log(() => 'NORMALIZE');
    const eras = E.erase(eterm);
    log(() => E.show(eras));
    const neras = E.normalize(eras, 0, nil, true);
    log(() => E.show(neras));

    console.log(`term: ${show(term)}\ntype: ${showCore(etype)}\netrm: ${showCore(eterm)}\nnorm: ${E.show(neras)}`);
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
