import { mapobj } from './util';
import { ConstEnv } from './typecheck';
import { Const, Var, Type, fun, app, showTerm } from './terms';
import { evaluate, nf } from './nbe';
import { elaborate } from './elaboration';
import { toNameless } from './surface';
import { parse } from './parser';
import { showETerm, erase } from './erased';

const b = Var;
const IO = Const('IO');
export const cenv: ConstEnv = mapobj({
  IO: fun(Type, Type),
  // (t:*) -> t -> IO t
  returnIO: fun(Type, b(0), app(IO, b(1))),
  // (a:*) -> (b:*) -> (a -> IO b) -> IO a -> IO b
  // * -> * -> (1 -> IO 1) -> IO 2 -> IO 2
  bindIO: fun(Type, Type, fun(b(1), app(IO, b(1))), app(IO, b(2)), app(IO, b(2))),
}, evaluate);

export const runREPL = (_s: string, _cb: (msg: string, err?: boolean) => void) => {
  try {
    const ds = parse(_s);
    const nm = toNameless(ds);
    const [tm, ty] = elaborate(nm, cenv);
    //console.log(`${showTerm(tm)} : ${showTerm(ty)}`);
    const normal = nf(tm);
    //console.log(showTerm(normal));
    //console.log(showETerm(erase(normal)));
    return _cb(`${showTerm(normal)} : ${showTerm(ty)} ~> ${showETerm(erase(normal))}`);
  } catch (err) {
    return _cb('' + err, true);
  }
};
