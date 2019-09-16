import { impossible } from '../util';
import { Name } from '../names';
import { Val } from './values';
import { HashStr } from '../hash';

export type Term = Var | Abs | App | Let | Ann | Pi | Type | Hash | Hole | Meta;

export interface Var {
  readonly tag: 'Var';
  readonly name: Name;
}
export const Var = (name: Name): Var => ({ tag: 'Var', name });

export interface Abs {
  readonly tag: 'Abs';
  readonly name: Name;
  readonly body: Term;
  readonly type?: Term;
}
export const Abs = (name: Name, body: Term, type?: Term): Abs =>
  ({ tag: 'Abs', name, body, type });
export const abs = (ns: Name[], body: Term): Term =>
  ns.reduceRight((b, x) => Abs(x, b), body);
export const absty = (ns: [Name, Term][], body: Term): Term =>
  ns.reduceRight((b, [x, t]) => Abs(x, b, t), body);

export interface App {
  readonly tag: 'App';
  readonly left: Term;
  readonly right: Term;
}
export const App = (left: Term, right: Term): App =>
  ({ tag: 'App', left, right });
export const appFrom = (ts: Term[]): Term =>
  ts.reduce(App);
export const app = (...ts: Term[]): Term => appFrom(ts);
export const app1 = (f: Term, as: Term[]): Term =>
  as.reduce(App, f);

export interface Let {
  readonly tag: 'Let';
  readonly name: Name;
  readonly value: Term;
  readonly body: Term;
  readonly type?: Term;
}
export const Let = (name: Name, value: Term, body: Term, type?: Term): Let =>
  ({ tag: 'Let', name, value, body, type });

export interface Ann {
  readonly tag: 'Ann';
  readonly term: Term;
  readonly type: Term;
}
export const Ann = (term: Term, type: Term): Ann =>
  ({ tag: 'Ann', term, type });

export interface Pi {
  readonly tag: 'Pi';
  readonly name: Name;
  readonly type: Term;
  readonly body: Term;
}
export const Pi = (name: Name, type: Term, body: Term): Pi =>
  ({ tag: 'Pi', name, type, body });
export const funFrom = (ts: Term[]): Term =>
  ts.reduceRight((x, y) => Pi('_', y, x));
export const fun = (...ts: Term[]): Term => funFrom(ts);

export interface Type {
  readonly tag: 'Type';
}
export const Type: Type = { tag: 'Type' };

export interface Hash {
  readonly tag: 'Hash';
  readonly hash: HashStr;
}
export const Hash = (hash: HashStr): Hash => ({ tag: 'Hash', hash });

export interface Hole {
  readonly tag: 'Hole';
}
export const Hole: Hole = { tag: 'Hole' };

export type MetaId = number;
export interface Meta {
  readonly tag: 'Meta';
  readonly id: MetaId;
  term: Val | null;
}
let metaId: MetaId = 0;
export const resetMetaId = () => { metaId = 0 };
export const freshMeta = (): Meta =>
  ({ tag: 'Meta', id: metaId++, term: null });

export const showTerm = (t: Term): string => {
  if (t.tag === 'Var') return t.name;
  if (t.tag === 'Abs')
    return `(\\${t.type ? `(${t.name} : ${showTerm(t.type)})` : t.name}. ${showTerm(t.body)})`;
  if (t.tag === 'App')
    return `(${showTerm(t.left)} ${showTerm(t.right)})`;
  if (t.tag === 'Let')
    return `(let ${t.name}${t.type ? ` : ${showTerm(t.type)}` : ''} = ${showTerm(t.value)} in ${showTerm(t.body)})`;
  if (t.tag === 'Ann')
    return `(${showTerm(t.term)} : ${showTerm(t.type)})`;
  if (t.tag === 'Pi')
    return `(${t.name === '_' ? showTerm(t.type) : `(${t.name} : ${showTerm(t.type)})`} -> ${showTerm(t.body)})`;
  if (t.tag === 'Type') return '*';
  if (t.tag === 'Hole') return '_';
  if (t.tag === 'Meta') return `?${t.term ? '!' : ''}${t.id}`;
  if (t.tag === 'Hash') return `#${t.hash}`;
  return impossible('showTerm');
};
