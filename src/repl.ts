import { normalize, evaluate } from './language/nbe';
import { elaborate } from './language/elaborate';
import { parse } from './language/parser';
import { showTerm, Term, Type, Pi, Var, Hash, fun, absty, app } from './language/terms';
import { config } from './config';
import { showCore } from './core/terms';
import { toCore } from './language/translation';
import { typecheck } from './core/typecheck';
import { cnormalize, cevaluate } from './core/nbe';
import { CHashEnv } from './core/env';
import { HashEnv } from './language/env';
import { mapobj } from './util';

const v = Var;
export const replenv: { [key: string]: { value: Term, type: Term, opaque?: boolean } } = {
  Nat: {
    value: Pi('t', Type, fun(v('t'), fun(v('t'), v('t')), v('t'))),
    type: Type,
    opaque: true,
  },
  z: {
    value: absty([['t', Type], ['z', v('t')], ['s', fun(v('t'), v('t'))]], v('z')),
    type: Hash('Nat'),
  },
  s: {
    value: absty(
      [['n', Hash('Nat')], ['t', Type], ['z', v('t')], ['s', fun(v('t'), v('t'))]],
      app(v('s'), app(v('n'), v('t'), v('z'), v('s'))),
    ),
    type: fun(Hash('Nat'), Hash('Nat')),
  },
  unfoldNat: {
    value: absty([['x', Hash('Nat')]], v('x')),
    type: fun(Hash('Nat'), Pi('t', Type, fun(v('t'), fun(v('t'), v('t')), v('t')))),
  },

  List: {
    value: absty([['t', Type]], Pi('r', Type, fun(v('r'), fun(v('t'), v('r'), v('r')), v('r')))),
    type: fun(Type, Type),
    opaque: true,
  },
  Nil: {
    value: absty([['t', Type], ['r', Type], ['n', v('r')], ['c', fun(v('t'), v('r'), v('r'))]], v('n')),
    type: Pi('t', Type, app(Hash('List'), v('t'))),
  },
  Cons: {
    value: absty([
      ['t', Type],
      ['x', v('t')],
      ['xs', app(Hash('List'), v('t'))],
      ['r', Type], ['n', v('r')], ['c', fun(v('t'), v('r'), v('r'))]],
      app(v('c'), v('x'), app(v('xs'), v('r'), v('n'), v('c'))),
    ),
    type: Pi('t', Type, fun(v('t'), app(Hash('List'), v('t')), app(Hash('List'), v('t')))),
  },
  unfoldList: {
    value: absty([['t', Type], ['l', app(Hash('List'), v('t'))]], v('l')),
    type: Pi('t', Type, fun(app(Hash('List'), v('t')), Pi('r', Type, fun(v('r'), fun(v('t'), v('r'), v('r')), v('r'))))),
  },
};
export const henv: HashEnv = mapobj(replenv, ({ value, type, opaque }, e) => ({
  value: evaluate(value, e),
  type: evaluate(type, e),
  opaque,
}));
export const chenv: CHashEnv = mapobj(replenv, ({ value, type, opaque }, e) => ({
  value: cevaluate(toCore(value), e),
  type: cevaluate(toCore(type), e),
  opaque,
}));

export const initREPL = () => {};

export const runREPL = (_s: string, _cb: (msg: string, err?: boolean) => void) => {
  try {
    if (_s === ':debug') {
      config.debug = !config.debug;
      return _cb(`debug is now ${config.debug}`);
    }
    const tm = parse(_s);
    console.log(`inpt: ${showTerm(tm)}`);
    const [term, type] = elaborate(henv, tm);
    console.log(`term: ${showTerm(term)}`);
    console.log(`type: ${showTerm(type)}`);
    const nf = normalize(term, henv);
    console.log(`nmfm: ${showTerm(nf)}`);
    const core = toCore(term);
    const cty = typecheck(chenv, core);
    console.log(`core: ${showCore(core)} : ${showCore(cty)}`);
    const cnf = cnormalize(core, chenv);
    console.log(`conf: ${showCore(cnf)}`);
    return _cb(`${showTerm(term)} : ${showTerm(type)} ~>\n${showTerm(nf)} ~>\n${showCore(core)} : ${showCore(cty)} ~>\n${showCore(cnf)}`);
  } catch (err) {
    return _cb('' + err, true);
  }
};
