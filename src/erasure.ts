import { impossible } from './util';
import { Term } from './terms';
import { ETerm, EVar, EHash, EAbs, EApp } from './eterm';

const eid = EAbs(EVar(0));

export const erase = (t: Term): ETerm => {
  if (t.tag === 'Var') return EVar(t.id);
  if (t.tag === 'Hash') return EHash(t.hash);
  if (t.tag === 'Abs') return EAbs(erase(t.body));
  if (t.tag === 'App') return EApp(erase(t.left), erase(t.right));
  if (t.tag === 'AbsT') return erase(t.body);
  if (t.tag === 'AppT') return erase(t.left);
  if (t.tag === 'Con') return eid;
  if (t.tag === 'Decon') return eid;
  return impossible('erase');
};
