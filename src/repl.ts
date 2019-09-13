import { mapobj } from './util';
import { constenv } from './typecheck';
import { Const, Var, Type, fun, app, showTerm } from './terms';
import { evaluate, nf } from './nbe';
import { elaborate, elaborateDefs } from './elaboration';
import { toNameless } from './surface';
import { parse, parseDefs } from './parser';
import { showETerm, erase } from './erased';
import { Domain } from './domain';
import { showDefs } from './defs';

export const initREPL = () => {
  const b = Var;
  const IO = Const('IO');
  Object.assign(constenv, mapobj({
    IO: fun(Type, Type),
    // (t:*) -> t -> IO t
    returnIO: fun(Type, b(0), app(IO, b(1))),
    // (a:*) -> (b:*) -> (a -> IO b) -> IO a -> IO b
    // * -> * -> (1 -> IO 1) -> IO 2 -> IO 2
    bindIO: fun(Type, Type, fun(b(1), app(IO, b(1))), app(IO, b(2)), app(IO, b(2))),
  }, t => [evaluate(t), null] as [Domain, Domain | null]));
};

export const runREPL = (_s: string, _cb: (msg: string, err?: boolean) => void) => {
  try {
    if (_s[0] === ':') {
      const ds = parseDefs(_s.slice(1));
      console.log(showDefs(ds));
      elaborateDefs(ds);
      return _cb(`done: ${showDefs(ds)}`);
    } 
    const ds = parse(_s);
    const nm = toNameless(ds);
    const [tm, ty] = elaborate(nm);
    console.log(`${showTerm(tm)}`);
    const normal = nf(tm);
    //console.log(showTerm(normal));
    //console.log(showETerm(erase(normal)));
    return _cb(`${showTerm(normal)} : ${showTerm(ty)} ~> ${showETerm(erase(normal))}`);
  } catch (err) {
    return _cb('' + err, true);
  }
};
