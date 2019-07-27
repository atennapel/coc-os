import { deserialize } from './serialization';
import { checkHash } from './hashing';
import { typecheck } from './typecheck';
import { Term } from './terms';

export const checkDef = (def: Buffer, exhash: Buffer): [Term, Term] => {
  const term = deserialize(def);
  checkHash(term, exhash);
  const ty = typecheck(term);
  return [term, ty];
};
