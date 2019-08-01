import { Term, showTerm, Var, Hash, App, Abs, AbsT, AppT, Decon, Con, ReturnIO, BindIO, BeepIO } from './terms';
import { impossible, err, terr } from './util';
import { HASH_SIZE } from './hashing';
import { Kind, KType, KFun, showKind } from './kinds';
import { Type, showType, TVar, TFunC, TApp, THash, TForall, TIO, TDef, showTDef } from './types';

export enum KIND_BYTES {
  KType = 0,
  KFun,
}
const serializeKindR = (term: Kind, arr: number[]): void => {
  if (term.tag === 'KType') {
    arr.push(KIND_BYTES.KType);
    return;
  }
  if (term.tag === 'KFun') {
    arr.push(KIND_BYTES.KFun);
    serializeKindR(term.left, arr);
    serializeKindR(term.right, arr);
    return;
  }
  return impossible('serializeKindR');
};
export const serializeKind = (term: Kind): Buffer => {
  const arr: number[] = [];
  serializeKindR(term, arr);
  return Buffer.from(arr);
};

export enum TYPE_BYTES {
  TConst = 0,
  TIO,
  THash,
  TApp,
  TForall,
}
export enum TCONST_BYTES {
  TFunC = 0,
  TIO,
}
export const TVAR_BYTE = 5;
export const MAX_TVAR_BYTE = Math.pow(2, 8) - TVAR_BYTE - 1;
const serializeTypeR = (term: Type, arr: number[]): void => {
  if (term.tag === 'TVar') {
    if (term.id > MAX_TVAR_BYTE)
      return err(`cannot serialize tvar ${term.id}, too big (${MAX_TVAR_BYTE})`);
    arr.push(term.id + TVAR_BYTE);
    return;
  }
  if (term.tag === 'TConst') {
    arr.push(TYPE_BYTES.TConst);
    if (term.name === '(->)') arr.push(TCONST_BYTES.TFunC);
    else if (term.name === 'IO') arr.push(TCONST_BYTES.TIO);
    else return terr(`invalid tconst name: ${term.name}`);
    return;
  }
  if (term.tag === 'THash') {
    if (term.hash.length !== HASH_SIZE * 2)
      return err(`invalid hash: ${term.hash}`);
    arr.push(TYPE_BYTES.THash);
    for (let i = 0, l = HASH_SIZE * 2; i < l; i += 2) {
      const hex = parseInt(`${term.hash[i]}${term.hash[i + 1]}`, 16);
      if (isNaN(hex) || hex < 0 || hex > 255)
        return err(`invalid type hash: ${term.hash}`);
      arr.push(hex);
    }
    return;
  }
  if (term.tag === 'TForall') {
    arr.push(TYPE_BYTES.TForall);
    serializeKindR(term.kind, arr);
    serializeTypeR(term.body, arr);
    return;
  }
  if (term.tag === 'TApp') {
    arr.push(TYPE_BYTES.TApp);
    serializeTypeR(term.left, arr);
    serializeTypeR(term.right, arr);
    return;
  }
  return impossible('serializeTypeR');
};
export const serializeType = (term: Type): Buffer => {
  const arr: number[] = [];
  serializeTypeR(term, arr);
  return Buffer.from(arr);
};
export const serializeTDef = (def: TDef): Buffer => {
  const arr: number[] = [];
  const l = def.args.length;
  if (l > 255)
    return err(`TDef has too many arguments: ${showTDef(def)}`);
  arr.push(l);
  for (let i = 0; i < l; i++) serializeKindR(def.args[i], arr);
  serializeTypeR(def.type, arr);
  return Buffer.from(arr);
};

export enum TERM_BYTES {
  Hash,
  Abs,
  App,
  AbsT,
  AppT,
  Con,
  Decon,
  Const,
}
export enum CONST_BYTES {
  ReturnIO = 0,
  BindIO,
  BeepIO,
}
export const VAR_BYTE = 8;
export const MAX_VAR_BYTE = Math.pow(2, 8) - VAR_BYTE - 1;
const serializeTermR = (term: Term, arr: number[]): void => {
  if (term.tag === 'Var') {
    if (term.id > MAX_VAR_BYTE)
      return err(`cannot serialize var ${term.id}, too big (${MAX_VAR_BYTE})`);
    arr.push(term.id + VAR_BYTE);
    return;
  }
  if (term.tag === 'Hash') {
    if (term.hash.length !== HASH_SIZE * 2)
      return err(`invalid hash: ${term.hash}`);
    arr.push(TERM_BYTES.Hash);
    for (let i = 0, l = HASH_SIZE * 2; i < l; i += 2) {
      const hex = parseInt(`${term.hash[i]}${term.hash[i + 1]}`, 16);
      if (isNaN(hex) || hex < 0 || hex > 255)
        return err(`invalid type hash: ${term.hash}`);
      arr.push(hex);
    }
    return;
  }
  if (term.tag === 'Abs') {
    arr.push(TERM_BYTES.Abs);
    serializeTypeR(term.type, arr);
    serializeTermR(term.body, arr);
    return;
  }
  if (term.tag === 'App') {
    arr.push(TERM_BYTES.App);
    serializeTermR(term.left, arr);
    serializeTermR(term.right, arr);
    return;
  }
  if (term.tag === 'AbsT') {
    arr.push(TERM_BYTES.AbsT);
    serializeKindR(term.kind, arr);
    serializeTermR(term.body, arr);
    return;
  }
  if (term.tag === 'AppT') {
    arr.push(TERM_BYTES.AppT);
    serializeTermR(term.left, arr);
    serializeTypeR(term.right, arr);
    return;
  }
  if (term.tag === 'Con') {
    if (term.con.length !== HASH_SIZE * 2)
      return err(`invalid type hash: ${term.con}`);
    arr.push(TERM_BYTES.Con);
    for (let i = 0, l = HASH_SIZE * 2; i < l; i += 2) {
      const hex = parseInt(`${term.con[i]}${term.con[i + 1]}`, 16);
      if (isNaN(hex) || hex < 0 || hex > 255)
        return err(`invalid type hash: ${term.con}`);
      arr.push(hex);
    }
    return;
  }
  if (term.tag === 'Decon') {
    if (term.con.length !== HASH_SIZE * 2)
      return err(`invalid type hash: ${term.con}`);
    arr.push(TERM_BYTES.Decon);
    for (let i = 0, l = HASH_SIZE * 2; i < l; i += 2) {
      const hex = parseInt(`${term.con[i]}${term.con[i + 1]}`, 16);
      if (isNaN(hex) || hex < 0 || hex > 255)
        return err(`invalid type hash: ${term.con}`);
      arr.push(hex);
    }
    return;
  }
  if (term.tag === 'Const') {
    arr.push(TERM_BYTES.Const);
    if (term.name === 'returnIO') arr.push(CONST_BYTES.ReturnIO);
    else if (term.name === 'bindIO') arr.push(CONST_BYTES.BindIO);
    else if (term.name === 'beepIO') arr.push(CONST_BYTES.BeepIO);
    else return terr(`invalid const name: ${term.name}`);
    return;
  }
  return impossible('serializeTermR');
};
export const serializeTerm = (term: Term): Buffer => {
  const arr: number[] = [];
  serializeTermR(term, arr);
  return Buffer.from(arr);
};

const deserializeKindR = (arr: Buffer, i: number): [number, Kind] => {
  const c = arr[i];
  if (c === KIND_BYTES.KType) {
    return [i + 1, KType];
  }
  if (c === KIND_BYTES.KFun) {
    const [j, l] = deserializeKindR(arr, i + 1);
    if (j >= arr.length) return err(`no right side for kind function`);
    const [k, r] = deserializeKindR(arr, j);
    return [k, KFun(l, r)];
  }
  return impossible('deserializeKindR');
};
export const deserializeKind = (arr: Buffer): Kind => {
  const [i, term] = deserializeKindR(arr, 0);
  if (i < arr.length)
    return err(`deserialization failure (too many bytes): ${showKind(term)}`);
  return term;
};

const deserializeTypeR = (arr: Buffer, i: number): [number, Type] => {
  const c = arr[i];
  if (c === TYPE_BYTES.TConst) {
    const x = arr[i+1];
    if (x === TCONST_BYTES.TFunC) return [i + 2, TFunC];
    if (x === TCONST_BYTES.TIO) return [i + 2, TIO];
    return terr(`invalid tconst byte: ${x}`);
  }
  if (c === TYPE_BYTES.TApp) {
    const [j, l] = deserializeTypeR(arr, i + 1);
    if (j >= arr.length) return err(`no right side for type application`);
    const [k, r] = deserializeTypeR(arr, j);
    return [k, TApp(l, r)];
  }
  if (c === TYPE_BYTES.THash) {
    if (i + HASH_SIZE >= arr.length)
      return err(`not enough bytes for hash`);
    const hash = Array(HASH_SIZE);
    for (let j = 0; j < HASH_SIZE; j++)
      hash[j] = `00${arr[i + j + 1].toString(16)}`.slice(-2);
    return [i + HASH_SIZE + 1, THash(hash.join(''))];
  }
  if (c === TYPE_BYTES.TForall) {
    const [j, l] = deserializeKindR(arr, i + 1);
    if (j >= arr.length) return err(`no right side for type application`);
    const [k, r] = deserializeTypeR(arr, j);
    return [k, TForall(l, r)];
  }
  return [i + 1, TVar(c - TVAR_BYTE)];
};
export const deserializeType = (arr: Buffer): Type => {
  const [i, term] = deserializeTypeR(arr, 0);
  if (i < arr.length)
    return err(`deserialization failure (too many bytes): ${showType(term)}`);
  return term;
};
export const deserializeTDef = (arr: Buffer): TDef => {
  const l = arr[0];
  const ks: Kind[] = Array(l);
  let i = 0;
  for (let j = 0; j < l; j++) {
    const [ni, k] = deserializeKindR(arr, i);
    ks[j] = k;
    i = ni;
  }
  const [ni, type] = deserializeTypeR(arr, i);
  const tdef = TDef(ks, type);
  if (ni < arr.length)
    return err(`deserialization failure (too many bytes): ${showTDef(tdef)}`);
  return tdef;
};

const deserializeTermR = (arr: Buffer, i: number): [number, Term] => {
  const c = arr[i];
  if (c === TERM_BYTES.Hash) {
    if (i + HASH_SIZE >= arr.length)
      return err(`not enough bytes for hash`);
    const hash = Array(HASH_SIZE);
    for (let j = 0; j < HASH_SIZE; j++)
      hash[j] = `00${arr[i + j + 1].toString(16)}`.slice(-2);
    return [i + HASH_SIZE + 1, Hash(hash.join(''))];
  }
  if (c === TERM_BYTES.Abs) {
    const [j, l] = deserializeTypeR(arr, i + 1);
    if (j >= arr.length) return err(`no body for abstraction`);
    const [k, r] = deserializeTermR(arr, j);
    return [k, Abs(l, r)];
  }
  if (c === TERM_BYTES.App) {
    const [j, l] = deserializeTermR(arr, i + 1);
    if (j >= arr.length) return err(`no right side for application`);
    const [k, r] = deserializeTermR(arr, j);
    return [k, App(l, r)];
  }
  if (c === TERM_BYTES.AbsT) {
    const [j, l] = deserializeKindR(arr, i + 1);
    if (j >= arr.length) return err(`no body for type abstraction`);
    const [k, r] = deserializeTermR(arr, j);
    return [k, AbsT(l, r)];
  }
  if (c === TERM_BYTES.AppT) {
    const [j, l] = deserializeTermR(arr, i + 1);
    if (j >= arr.length) return err(`no right side for type application`);
    const [k, r] = deserializeTypeR(arr, j);
    return [k, AppT(l, r)];
  }
  if (c === TERM_BYTES.Con) {
    if (i + HASH_SIZE >= arr.length)
    return err(`not enough bytes for hash`);
    const hash = Array(HASH_SIZE);
    for (let j = 0; j < HASH_SIZE; j++)
      hash[j] = `00${arr[i + j + 1].toString(16)}`.slice(-2);
    return [i + HASH_SIZE + 1, Con(hash.join(''))];
  }
  if (c === TERM_BYTES.Decon) {
    if (i + HASH_SIZE >= arr.length)
    return err(`not enough bytes for hash`);
    const hash = Array(HASH_SIZE);
    for (let j = 0; j < HASH_SIZE; j++)
      hash[j] = `00${arr[i + j + 1].toString(16)}`.slice(-2);
    return [i + HASH_SIZE + 1, Decon(hash.join(''))];
  }
  if (c === TERM_BYTES.Const) {
    const x = arr[i+1];
    if (x === CONST_BYTES.ReturnIO) return [i + 2, ReturnIO];
    if (x === CONST_BYTES.BindIO) return [i + 2, BindIO];
    if (x === CONST_BYTES.BeepIO) return [i + 2, BeepIO];
    return terr(`invalid const byte: ${x}`);
  }
  return [i + 1, Var(c - VAR_BYTE)];
};
export const deserializeTerm = (arr: Buffer): Term => {
  const [i, term] = deserializeTermR(arr, 0);
  if (i < arr.length)
    return err(`deserialization failure (too many bytes): ${showTerm(term)}`);
  return term;
};