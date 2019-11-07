import { config, log } from './config';
import { parse } from './surface/parser';
import { showTerm, toCore } from './surface/terms';
import { typecheck, EnvT, Def } from './surface/typecheck';
import { normalize, EnvV, evaluate } from './surface/vals';
import * as C from './core/terms';
import * as CV from './core/vals';
import * as CT from './core/typecheck';
import { erase, showETerm } from './erased/terms';
import * as EV from './erased/vals';
import { Nil, Cons } from './list';

const env: {
  ts: EnvT,
  vs: EnvV,
  tsc: CV.EnvV,
  vsc: CV.EnvV,
  vse: EV.EnvV,
} = { ts: Nil, vs: Nil, tsc: Nil, vsc: Nil, vse: Nil };

export const initREPL = () => {
  env.ts = Nil;
  env.vs = Nil;
  env.tsc = Nil;
  env.vsc = Nil;
  env.vse = Nil;
};

export const runREPL = (_s: string, _cb: (msg: string, err?: boolean) => void) => {
  try {
    if (_s === ':debug') {
      config.debug = !config.debug;
      return _cb(`debug is now ${config.debug}`);
    }
    if (_s.startsWith(':let')) {
      const spl = _s.slice(4).split(/\s+/g);
      const name = spl[1];
      const body = spl.slice(2).join(' ');
      log(() => `${name} ; ${body}`);
      const tm = parse(body);
      log(() => `inpt: ${showTerm(tm)}`);
      const [type, term] = typecheck(tm, env.ts, env.vs);
      log(() => `type: ${showTerm(type)}`);
      log(() => `term: ${showTerm(term)}`);
      env.ts = Cons([name, Def(evaluate(type, env.vs))], env.ts);
      env.vs = Cons([name, evaluate(term, env.vs)], env.vs);
      const nf = normalize(term, env.vs);
      log(() => `nmfm: ${showTerm(nf)}`);
      const core = toCore(term);
      log(() => `core: ${C.showTerm(core)}`);
      const ctype = CT.typecheck(core, env.tsc, env.vsc);
      log(() => `tcor: ${C.showTerm(ctype)}`);
      const cnm = CV.normalize(core, env.vsc);
      log(() => `ncor: ${C.showTerm(cnm)}`);
      const er = erase(core);
      log(() => `eras: ${showETerm(er)}`);
      const ner = EV.normalize(er, env.vse);
      log(() => `nera: ${showETerm(ner)}`);
      return _cb(`defined ${name}\n${showTerm(type)}\n${showTerm(term)}\n${showTerm(nf)}\n${C.showTerm(core)}\n${C.showTerm(ctype)}\n${C.showTerm(cnm)}\n${showETerm(er)}\n${showETerm(ner)}`);
    }
    const tm = parse(_s);
    log(() => `inpt: ${showTerm(tm)}`);
    const [type, term] = typecheck(tm, env.ts, env.vs);
    log(() => `type: ${showTerm(type)}`);
    log(() => `term: ${showTerm(term)}`);
    const nf = normalize(term, env.vs);
    log(() => `nmfm: ${showTerm(nf)}`);
    const core = toCore(term);
    log(() => `core: ${C.showTerm(core)}`);
    const ctype = CT.typecheck(core, env.tsc, env.vsc);
    log(() => `tcor: ${C.showTerm(ctype)}`);
    const cnm = CV.normalize(core, env.vsc);
    log(() => `ncor: ${C.showTerm(cnm)}`);
    const er = erase(core);
    log(() => `eras: ${showETerm(er)}`);
    const ner = EV.normalize(er, env.vse);
    log(() => `nera: ${showETerm(ner)}`);
    return _cb(`${showTerm(type)}\n${showTerm(term)}\n${showTerm(nf)}\n${C.showTerm(core)}\n${C.showTerm(ctype)}\n${C.showTerm(cnm)}\n${showETerm(er)}\n${showETerm(ner)}`);
  } catch (err) {
    return _cb('' + err, true);
  }
};
