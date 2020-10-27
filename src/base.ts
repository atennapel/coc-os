import { Name } from './names';
import { deserializeCore, serializeCore } from './serialization';
import { typecheck } from './typecheck';
import * as E from './erased';
import * as C from './core';

type BaseCache = { [key: string]: [C.Term, C.Term, E.Term] };
const cache: BaseCache = {};

export const getFromBase = (x: Name, erased: boolean = false): [C.Term, C.Term, E.Term] => {
  if (cache[x]) return cache[x];
  const fs = require('fs');
  const y = /[A-Z]/.test(x[0]) ? `_${x}` : x;
  const ser = fs.readFileSync(`./base/${y}`);
  let ns: Name[] | null = null;
  if (fs.existsSync(`./names/${y}`))
    ns = JSON.parse(fs.readFileSync(`./names/${y}`));
  const term = deserializeCore(ser, ns);
  const [type, eras] = typecheck(term, erased);
  cache[x] = [term, type, eras];
  return [term, type, eras];
};

export const addToBase = (x: Name, t: C.Term, erased: boolean = false, alreadyTypechecked: boolean = false): void => {
  if (!alreadyTypechecked) {
    const [type, eras] = typecheck(t, erased);
    cache[x] = [t, type, eras];
  }
  const y = /[A-Z]/.test(x[0]) ? `_${x}` : x;
  const [ser, ns] = serializeCore(t);
  const fs = require('fs');
  fs.writeFileSync(`./base/${y}`, ser);
  fs.writeFileSync(`./names/${y}`, JSON.stringify(ns));
};
