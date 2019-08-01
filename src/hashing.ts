import * as crypto from 'crypto';

import { serializeTerm, serializeKind, serializeType, serializeTDef } from './serialization';
import { Term } from './terms';
import { err } from './util';
import { Kind } from './kinds';
import { Type, TDef } from './types';

export const HASH = 'sha256';
export const HASH_SIZE = 32;

export const hashBytes = (arr: Buffer): Buffer => {
  const hash = crypto.createHash(HASH);
  hash.update(arr);
  return hash.digest();
};

export const checkHash = (hsh: Buffer, exhash: Buffer): void => {
  if (!hsh.equals(exhash))
    return err(`hash does not match`);
};

export const hashKind = (term: Kind): Buffer =>
  hashBytes(serializeKind(term));
export const checkHashKind = (term: Kind, exhash: Buffer): void =>
  checkHash(hashKind(term), exhash);

export const hashType = (term: Type): Buffer =>
  hashBytes(serializeType(term));
export const checkHashType = (term: Type, exhash: Buffer): void =>
  checkHash(hashType(term), exhash);

export const hashTerm = (term: Term): Buffer =>
  hashBytes(serializeTerm(term));
export const checkHashTerm = (term: Term, exhash: Buffer): void =>
  checkHash(hashTerm(term), exhash);

export const hashTDef = (term: TDef): Buffer =>
  hashBytes(serializeTDef(term));
export const checkHashTDef = (term: TDef, exhash: Buffer): void =>
  checkHash(hashTDef(term), exhash);
