import * as crypto from 'crypto';

import { serialize } from './serialization';
import { Term } from './terms';
import { err } from './util';

export const HASH = 'sha256';
export const HASH_SIZE = 32;

export const hashBytes = (arr: Buffer): Buffer => {
  const hash = crypto.createHash(HASH);
  hash.update(arr);
  return hash.digest();
};

export const hash = (term: Term): Buffer => hashBytes(serialize(term));

export const checkHash = (term: Term, exhash: Buffer): void => {
  if (!hash(term).equals(exhash))
    return err(`hash does not match`);
};
