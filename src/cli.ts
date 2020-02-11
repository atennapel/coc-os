import { parseDefs } from './parser';
import { initREPL, runREPL } from './repl';
import { showTerm } from './syntax';
import { toSurfaceDefs } from './surface/definitions';
import { globalReset, globalMap } from './surface/globalenv';
import { typecheckDefs } from './surface/typecheck';
import { quoteZ } from './surface/domain';
import { fromSurface, showFromSurface } from './surface/syntax';
import { setConfig } from './config';

if (process.argv[2]) {
  if (process.argv[3] === '-d') setConfig({ debug: true });
  try {
    globalReset();
    const sc = require('fs').readFileSync(process.argv[2], 'utf8');
    const ds = parseDefs(sc);
    const dsc = toSurfaceDefs(ds)
    const ns = typecheckDefs(dsc);
    const m = globalMap();
    const main = m.main;
    if (!main) console.log(`defined ${ns.join(' ')}`);
    else {
      console.log(`${showFromSurface(main.term)} : ${showTerm(fromSurface(quoteZ(main.type)))}`);
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
