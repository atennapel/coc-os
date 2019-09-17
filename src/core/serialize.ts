import { err, impossible } from '../util';
import { Core, showCore, CHash, CAbs, CApp, CLet, CPi, CType, CVar } from './terms';
import { HASH_SIZE } from '../hash';

export enum CORE_BYTES {
  Abs,
  App,
  Let,
  Pi,
  Type,
  Hash,
}
export const VAR_BYTE = 6;
export const MAX_VAR_BYTE = Math.pow(2, 8) - VAR_BYTE - 1;

const serializeTermR = (term: Core, arr: number[]): void => {
  if (term.tag === 'CVar') {
    if (term.index > MAX_VAR_BYTE)
      return err(`cannot serialize var ${term.index}, too big (${MAX_VAR_BYTE})`);
    arr.push(term.index + VAR_BYTE);
    return;
  }
  if (term.tag === 'CAbs') {
    arr.push(CORE_BYTES.Abs);
    serializeTermR(term.type, arr);
    serializeTermR(term.body, arr);
    return;
  }
  if (term.tag === 'CApp') {
    arr.push(CORE_BYTES.App);
    serializeTermR(term.left, arr);
    serializeTermR(term.right, arr);
    return;
  }
  if (term.tag === 'CLet') {
    arr.push(CORE_BYTES.Let);
    serializeTermR(term.type, arr);
    serializeTermR(term.value, arr);
    serializeTermR(term.body, arr);
    return;
  }
  if (term.tag === 'CPi') {
    arr.push(CORE_BYTES.Pi);
    serializeTermR(term.type, arr);
    serializeTermR(term.body, arr);
    return;
  }
  if (term.tag === 'CType') {
    arr.push(CORE_BYTES.Type);
    return;
  }
  if (term.tag === 'CHash') {
    if (term.hash.length !== HASH_SIZE * 2)
      return err(`invalid hash: ${term.hash}`);
    arr.push(CORE_BYTES.Hash);
    for (let i = 0, l = HASH_SIZE * 2; i < l; i += 2) {
      const hex = parseInt(`${term.hash[i]}${term.hash[i + 1]}`, 16);
      if (isNaN(hex) || hex < 0 || hex > 255)
        return err(`invalid type hash: ${term.hash}`);
      arr.push(hex);
    }
    return;
  }
  return impossible('serializeTermR');
};
export const serializeCore = (term: Core): Buffer => {
  const arr: number[] = [];
  serializeTermR(term, arr);
  return Buffer.from(arr);
};

const deserializeTermR = (arr: Buffer, i: number): [number, Core] => {
  const c = arr[i];
  if (c === CORE_BYTES.Hash) {
    if (i + HASH_SIZE >= arr.length)
      return err(`not enough bytes for hash`);
    const hash = Array(HASH_SIZE);
    for (let j = 0; j < HASH_SIZE; j++)
      hash[j] = `00${arr[i + j + 1].toString(16)}`.slice(-2);
    return [i + HASH_SIZE + 1, CHash(hash.join(''))];
  }
  if (c === CORE_BYTES.Abs) {
    const [j, l] = deserializeTermR(arr, i + 1);
    if (j >= arr.length) return err(`no body for abstraction`);
    const [k, r] = deserializeTermR(arr, j);
    return [k, CAbs(l, r)];
  }
  if (c === CORE_BYTES.App) {
    const [j, l] = deserializeTermR(arr, i + 1);
    if (j >= arr.length) return err(`no right side for application`);
    const [k, r] = deserializeTermR(arr, j);
    return [k, CApp(l, r)];
  }
  if (c === CORE_BYTES.Let) {
    const [j, l] = deserializeTermR(arr, i + 1);
    if (j >= arr.length) return err(`no right side for application`);
    const [k, r] = deserializeTermR(arr, j);
    if (k >= arr.length) return err(`no right side for application`);
    const [m, q] = deserializeTermR(arr, k);
    return [m, CLet(l, r, q)];
  }
  if (c === CORE_BYTES.Pi) {
    const [j, l] = deserializeTermR(arr, i + 1);
    if (j >= arr.length) return err(`no body for abstraction`);
    const [k, r] = deserializeTermR(arr, j);
    return [k, CPi(l, r)];
  }
  if (c === CORE_BYTES.Type)
    return [i + 1, CType];
  return [i + 1, CVar(c - VAR_BYTE)];
};
export const deserializeCore = (arr: Buffer): Core => {
  const [i, term] = deserializeTermR(arr, 0);
  if (i < arr.length)
    return err(`deserialization failure (too many bytes): ${showCore(term)}`);
  return term;
};
