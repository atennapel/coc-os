import { parseDefs } from './parser';
import { initREPL, runREPL } from './repl';
import { setConfig } from './config';
import { globalReset, globalMap } from './globalenv';
import { toInternalDefs } from './definitions';
import { typecheckDefs } from './typecheck';
import { showSurface } from './syntax';
import { showTermUZ } from './domain';

if (process.argv[2]) {
  const option = process.argv[3];
  if (option === '-d') setConfig({ debug: true });
  else if (option === '-dc' || option === '-cd') setConfig({ debug: true, checkCore: true });
  else if (option === '-c') setConfig({ checkCore: true });
  try {
    globalReset();
    const sc = require('fs').readFileSync(process.argv[2], 'utf8');
    parseDefs(sc, {}).then(ds => {
      const dsc = toInternalDefs(ds)
      const ns = typecheckDefs(dsc);
      const m = globalMap();
      const main = m.main;
      if (!main) console.log(`defined ${ns.join(' ')}`);
      else {
        console.log(`${showSurface(main.term)} : ${showTermUZ(main.type)}`);
      }
      process.exit();
    }).catch(err => {
      console.error(err);
      process.exit();
    });
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
