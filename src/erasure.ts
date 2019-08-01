import { impossible, terr } from './util';
import { Term } from './terms';
import { ETerm, EVar, EAbs, EApp, EConst } from './eterm';
import { HashEnv } from './typecheck';

const eid = EAbs(EVar(0));

export const erase = (henv: HashEnv, t: Term): ETerm => {
  if (t.tag === 'Var') return EVar(t.id);
  if (t.tag === 'Hash') {
    if (!henv[t.hash]) return terr(`undefined hash ${t.hash}`);
    return erase(henv, henv[t.hash].term);
  }
  if (t.tag === 'Abs') return EAbs(erase(henv, t.body));
  if (t.tag === 'App')
    return EApp(erase(henv, t.left), erase(henv, t.right));
  if (t.tag === 'AbsT') return erase(henv, t.body);
  if (t.tag === 'AppT') return erase(henv, t.left);
  if (t.tag === 'Con') return eid;
  if (t.tag === 'Decon') return eid;
  if (t.tag === 'Const') return EConst(t.name);
  return impossible('erase');
};
