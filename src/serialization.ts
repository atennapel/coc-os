import { Term, Star, showTerm, Var, Hash, App, Pi, Abs } from './terms';
import { impossible, err } from './util';

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
    arr.push(BYTES.Hash);
    arr.push(0, 0, 0, 0);
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

export const serialize = (term: Term): Uint8Array => {
  const arr: number[] = [];
  serializeTerm(term, arr);
  return new Uint8Array(arr);
};

const deserializeTerm = (arr: Uint8Array, i: number): [number, Term] => {
  const c = arr[i];
  if (c === BYTES.Star) {
    return [i + 1, Star];
  }
  if (c === BYTES.Hash) {
    if (i + 4 >= arr.length)
      return err(`not enough bytes for hash`);
    const h1 = arr[i + 1];
    const h2 = arr[i + 2];
    const h3 = arr[i + 3];
    const h4 = arr[i + 4];
    return [i + 5, Hash(`${h1}${h2}${h3}${h4}`)];
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

export const deserialize = (arr: Uint8Array): Term => {
  const [i, term] = deserializeTerm(arr, 0);
  if (i < arr.length)
    return err(`deserialization failure (too many bytes): ${showTerm(term)}`);
  return term;
};

export const showBytes = (arr: Uint8Array): string =>
  Array.from(arr).map(n => `00${n.toString(16)}`.slice(-2)).join('');
