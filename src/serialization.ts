import { Term, Star, showTerm, Var, Hash, App, Pi, Abs } from './terms';
import { impossible, err } from './util';
import { HASH_SIZE } from './hashing';

export enum BYTES {
  Star = 0,
  Hash,
  Abs,
  Pi,
  App,
}
export const VAR_BYTE = 5;
export const MAX_VAR_BYTE = Math.pow(2, 8) - VAR_BYTE - 1;

const serializeTerm = (term: Term, arr: number[]): void => {
  if (term.tag === 'Var') {
    if (term.id > MAX_VAR_BYTE)
      return err(`cannot serialize var ${term.id}, too big (${MAX_VAR_BYTE})`);
    arr.push(term.id + VAR_BYTE);
    return;
  }
  if (term.tag === 'Star') {
    arr.push(BYTES.Star);
    return;
  }
  if (term.tag === 'Hash') {
    if (term.hash.length !== HASH_SIZE * 2)
      return err(`invalid hash: ${term.hash}`);
    arr.push(BYTES.Hash);
    for (let i = 0, l = HASH_SIZE * 2; i < l; i += 2) {
      const hex = parseInt(`${term.hash[i]}${term.hash[i + 1]}`, 16);
      if (isNaN(hex) || hex < 0 || hex > 255)
        return err(`invalid hash: ${term.hash}`);
      arr.push(hex);
    }
    return;
  }
  if (term.tag === 'Abs') {
    arr.push(BYTES.Abs);
    serializeTerm(term.type, arr);
    serializeTerm(term.body, arr);
    return;
  }
  if (term.tag === 'Pi') {
    arr.push(BYTES.Pi);
    serializeTerm(term.type, arr);
    serializeTerm(term.body, arr);
    return;
  }
  if (term.tag === 'App') {
    arr.push(BYTES.App);
    serializeTerm(term.left, arr);
    serializeTerm(term.right, arr);
    return;
  }
  return impossible('serializeTerm');
};

export const serialize = (term: Term): Buffer => {
  const arr: number[] = [];
  serializeTerm(term, arr);
  return Buffer.from(arr);
};

const deserializeTerm = (arr: Buffer, i: number): [number, Term] => {
  const c = arr[i];
  if (c === BYTES.Star) {
    return [i + 1, Star];
  }
  if (c === BYTES.Hash) {
    if (i + HASH_SIZE >= arr.length)
      return err(`not enough bytes for hash`);
    const hash = Array(HASH_SIZE);
    for (let j = 0; j < HASH_SIZE; j++)
      hash[j] = `00arr[i + j + 1].toString(16)`.slice(-2);
    return [i + HASH_SIZE + 1, Hash(hash.join(''))];
  }
  if (c === BYTES.Abs) {
    const [j, l] = deserializeTerm(arr, i + 1);
    if (j >= arr.length) return err(`no body for abstraction`);
    const [k, r] = deserializeTerm(arr, j);
    return [k, Abs(l, r)];
  }
  if (c === BYTES.Pi) {
    const [j, l] = deserializeTerm(arr, i + 1);
    if (j >= arr.length) return err(`no body for pi`);
    const [k, r] = deserializeTerm(arr, j);
    return [k, Pi(l, r)];
  }
  if (c === BYTES.App) {
    const [j, l] = deserializeTerm(arr, i + 1);
    if (j >= arr.length) return err(`no right side for application`);
    const [k, r] = deserializeTerm(arr, j);
    return [k, App(l, r)];
  }
  return [i + 1, Var(c - VAR_BYTE)];
};

export const deserialize = (arr: Buffer): Term => {
  const [i, term] = deserializeTerm(arr, 0);
  if (i < arr.length)
    return err(`deserialization failure (too many bytes): ${showTerm(term)}`);
  return term;
};
