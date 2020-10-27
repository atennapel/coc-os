import { Name } from './names';
import { deserializeCore } from './serialization';
import { typecheck } from './typecheck';
import * as E from './erased';
import * as C from './core';

export const getFromBase = (x: Name): [C.Term, E.Term] => {
  const ser = require('fs').readFileSync(`./base/${x}`);
  let ns: Name[] | null = null;
  try {
    ns = JSON.parse(require('fs').readFileSync(`./names/${x}`));
  } catch (err) {}
  const term = deserializeCore(ser, ns);
  const [type, erased] = typecheck(term);
  return [type, erased];
};
