import { CVal } from './values';
import { List, toString } from '../list';
import { showCore } from './terms';
import { cquote } from './nbe';

export type CEnv = List<CVal>;

export const showCEnv = (l: CEnv, k: number = 0): string =>
  toString(l, e => showCore(cquote(e, k)));
