(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const surface_1 = require("./surface");
exports.DLet = (name, term) => ({ tag: 'DLet', name, term });
exports.DOpaque = (name, oname, term) => ({ tag: 'DOpaque', name, oname, term });
exports.showDef = (d) => {
    if (d.tag === 'DLet')
        return `let ${d.name} = ${surface_1.showSTerm(d.term)}`;
    if (d.tag === 'DOpaque')
        return `opaque ${d.name} with ${d.oname} = ${surface_1.showSTerm(d.term)}`;
    return util_1.impossible('showDef');
};
exports.showDefs = (ds) => ds.map(exports.showDef).join('\n');

},{"./surface":9,"./util":13}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const list_1 = require("./list");
const terms_1 = require("./terms");
const nbe_1 = require("./nbe");
exports.showEnv = (e, k = 0) => list_1.toString(e, d => terms_1.showTerm(nbe_1.quote(d, k)));
exports.Clos = (body, env) => ({ body, env });
exports.DAbs = (type, clos) => ({ tag: 'DAbs', type, clos });
exports.DNeutral = (head, args = list_1.Nil) => ({ tag: 'DNeutral', head, args });
exports.DVar = (index) => exports.DNeutral(terms_1.Var(index));
exports.DConst = (name) => exports.DNeutral(terms_1.Const(name));
exports.DPi = (type, clos) => ({ tag: 'DPi', type, clos });
exports.DFix = (type, clos) => ({ tag: 'DFix', type, clos });

},{"./list":5,"./nbe":6,"./terms":10}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const surface_1 = require("./surface");
const terms_1 = require("./terms");
const nbe_1 = require("./nbe");
const list_1 = require("./list");
const domain_1 = require("./domain");
const util_1 = require("./util");
const unify_1 = require("./unify");
const typecheck_1 = require("./typecheck");
exports.checkSurface = (tenv, venv, k, t, ty) => {
    // console.log(`checkSurface ${k} ${showSTerm(t)} : ${showTerm(quote(ty, k))} | ${showEnv(tenv, k)} | ${showEnv(venv, k)}`);
    if (t.tag === 'SAbs' && !t.type && ty.tag === 'DPi') {
        const v = domain_1.DVar(k);
        const body = exports.checkSurface(list_1.Cons(ty.type, tenv), list_1.Cons(v, venv), k + 1, t.body, nbe_1.capp(ty.clos, v));
        return terms_1.Abs(nbe_1.quote(ty.type, k), body);
    }
    if (t.tag === 'SAbs' && !t.type && ty.tag === 'DFix')
        return exports.checkSurface(tenv, venv, k, t, nbe_1.capp(ty.clos, ty));
    if (t.tag === 'SLet') {
        const tya = exports.checkSurface(tenv, venv, k, t.type, terms_1.Type);
        const vty = nbe_1.evaluate(tya, venv);
        const val = exports.checkSurface(tenv, venv, k, t.value, vty);
        const body = exports.checkSurface(list_1.Cons(vty, tenv), list_1.Cons(nbe_1.evaluate(val, venv), venv), k + 1, t.body, ty);
        return terms_1.Let(tya, val, body);
    }
    if (t.tag === 'SHole')
        return unify_1.newMeta(k);
    const [term, ty2] = exports.synthSurface(tenv, venv, k, t);
    unify_1.unify(k, ty2, ty);
    return term;
};
exports.synthSurface = (tenv, venv, k, t) => {
    // console.log(`synthSurface ${k} ${showSTerm(t)} | ${showEnv(tenv, k)} | ${showEnv(venv, k)}`);
    if (t.tag === 'Type')
        return [t, t];
    if (t.tag === 'Var') {
        const ty = list_1.index(tenv, t.index) || util_1.terr(`var out of scope ${t.index}`);
        return [t, ty];
    }
    if (t.tag === 'SPi') {
        const ty = exports.checkSurface(tenv, venv, k, t.type, terms_1.Type);
        const body = exports.checkSurface(list_1.Cons(nbe_1.evaluate(ty, venv), tenv), list_1.Cons(domain_1.DVar(k), venv), k + 1, t.body, terms_1.Type);
        return [terms_1.Pi(ty, body), terms_1.Type];
    }
    if (t.tag === 'SApp') {
        const [l, ta] = exports.synthSurface(tenv, venv, k, t.left);
        const [b, tb] = exports.synthappSurface(tenv, venv, k, t, ta, t.right);
        return [terms_1.App(l, b), tb];
    }
    if (t.tag === 'SAnn') {
        const ety = exports.checkSurface(tenv, venv, k, t.type, terms_1.Type);
        const evty = nbe_1.evaluate(ety, venv);
        const term = exports.checkSurface(tenv, venv, k, t.term, evty);
        return [term, evty];
    }
    if (t.tag === 'SFix') {
        const ty = exports.checkSurface(tenv, venv, k, t.type, terms_1.Type);
        const vty = nbe_1.evaluate(ty, venv);
        const body = exports.checkSurface(list_1.Cons(vty, tenv), list_1.Cons(domain_1.DVar(k), venv), k + 1, t.body, vty);
        return [terms_1.Fix(ty, body), vty];
    }
    if (t.tag === 'SVar') {
        const ty = typecheck_1.constenv[t.name];
        if (!ty)
            return util_1.terr(`undefined const ${t.name}`);
        return [terms_1.Const(t.name), ty[0]];
    }
    if (t.tag === 'SAbs' && t.type) {
        const ty = exports.checkSurface(tenv, venv, k, t.type, terms_1.Type);
        const vty = nbe_1.evaluate(ty, venv);
        const v = domain_1.DVar(k);
        const [body, rty] = exports.synthSurface(list_1.Cons(vty, tenv), list_1.Cons(v, venv), k + 1, t.body);
        return [terms_1.Abs(ty, body), domain_1.DPi(vty, domain_1.Clos(nbe_1.quote(rty, k + 1), venv))];
    }
    if (t.tag === 'SAbs' && !t.type) {
        const a = unify_1.newMeta(k);
        const b = unify_1.newMeta(k + 1);
        const ty = nbe_1.evaluate(terms_1.Pi(a, b), venv);
        const term = exports.checkSurface(tenv, venv, k, t, ty);
        return [term, ty];
    }
    if (t.tag === 'SLet') {
        const ty = exports.checkSurface(tenv, venv, k, t.type, terms_1.Type);
        const vty = nbe_1.evaluate(ty, venv);
        const val = exports.checkSurface(tenv, venv, k, t.value, vty);
        const [body, rty] = exports.synthSurface(list_1.Cons(vty, tenv), list_1.Cons(nbe_1.evaluate(val, venv), venv), k + 1, t.body);
        return [terms_1.Let(ty, val, body), rty];
    }
    if (t.tag === 'SHole') {
        const t = unify_1.newMeta(k);
        const va = nbe_1.evaluate(unify_1.newMeta(k), venv);
        return [t, va];
    }
    return util_1.terr(`cannot synthSurface ${surface_1.showSTerm(t)}`);
};
exports.synthappSurface = (tenv, venv, k, t, ta, b) => {
    // console.log(`synthappSurface ${k} ${showSTerm(t)} => ${showTerm(quote(ta, k))} @ ${showSTerm(b)} | ${showEnv(tenv, k)} | ${showEnv(venv, k)}`);
    if (ta.tag === 'DPi') {
        const eb = exports.checkSurface(tenv, venv, k, b, ta.type);
        return [eb, nbe_1.capp(ta.clos, nbe_1.evaluate(eb, venv))];
    }
    if (ta.tag === 'DFix')
        return exports.synthappSurface(tenv, venv, k, t, nbe_1.capp(ta.clos, ta), b);
    return util_1.terr(`invalid type in synthappSurface ${surface_1.showSTerm(t)}: ${terms_1.showTerm(nbe_1.quote(ta, k))}`);
};
exports.elaborate = (t) => {
    terms_1.resetMetaId();
    const [term, ty] = exports.synthSurface(list_1.Nil, list_1.Nil, 0, t);
    const zterm = unify_1.zonk(list_1.Nil, 0, term);
    const zty = unify_1.zonk(list_1.Nil, 0, nbe_1.quote(ty));
    return [zterm, zty];
};
exports.elaborateDef = (d) => {
    if (d.tag === 'DLet') {
        const x = d.name;
        if (typecheck_1.constenv[x])
            return util_1.terr(`name already taken ${x}`);
        const t = surface_1.toNameless(d.term);
        const [term, type] = exports.elaborate(t);
        typecheck_1.constenv[x] = [nbe_1.evaluate(type), nbe_1.evaluate(term)];
        return [term, type];
    }
    if (d.tag === 'DOpaque') {
        const x = d.name;
        if (typecheck_1.constenv[x])
            return util_1.terr(`name already taken ${x}`);
        const o = d.oname;
        if (typecheck_1.constenv[o])
            return util_1.terr(`name already taken ${o}`);
        const t = surface_1.toNameless(d.term);
        const [term, type] = exports.elaborate(t);
        typecheck_1.constenv[x] = [nbe_1.evaluate(type), nbe_1.evaluate(terms_1.Const(x))];
        // (f : * -> *) -> f (Const x) -> f (term)
        typecheck_1.constenv[o] = [
            nbe_1.evaluate(terms_1.Pi(terms_1.fun(terms_1.Type, terms_1.Type), terms_1.fun(terms_1.App(terms_1.Var(0), terms_1.Const(x)), terms_1.App(terms_1.Var(1), term)))),
            nbe_1.evaluate(terms_1.Abs(terms_1.Type, terms_1.Var(0))),
        ];
        return [term, type];
    }
    return util_1.impossible('elaborateDef');
};
exports.elaborateDefs = (ds) => {
    let main = null;
    ds.forEach(d => {
        const r = exports.elaborateDef(d);
        if (d.name === 'main')
            main = r;
    });
    return main;
};

},{"./domain":2,"./list":5,"./nbe":6,"./surface":9,"./terms":10,"./typecheck":11,"./unify":12,"./util":13}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
exports.EAbs = (body) => ({ tag: 'EAbs', body });
exports.EApp = (left, right) => ({ tag: 'EApp', left, right });
exports.EFix = (body) => ({ tag: 'EFix', body });
exports.EPi = { tag: 'EPi' };
exports.ELet = (value, body) => ({ tag: 'ELet', value, body });
exports.showETerm = (t) => {
    if (t.tag === 'Var')
        return `${t.index}`;
    if (t.tag === 'Const')
        return t.name;
    if (t.tag === 'EAbs')
        return `(\\${exports.showETerm(t.body)})`;
    if (t.tag === 'EFix')
        return `(fix ${exports.showETerm(t.body)})`;
    if (t.tag === 'EApp')
        return `(${exports.showETerm(t.left)} ${exports.showETerm(t.right)})`;
    if (t.tag === 'Type')
        return '*';
    if (t.tag === 'EPi')
        return 'Pi';
    if (t.tag === 'ELet')
        return `(let ${exports.showETerm(t.value)} in ${exports.showETerm(t.body)})`;
    return util_1.impossible('showETerm');
};
exports.erase = (t) => {
    if (t.tag === 'Abs')
        return exports.EAbs(exports.erase(t.body));
    if (t.tag === 'App')
        return exports.EApp(exports.erase(t.left), exports.erase(t.right));
    if (t.tag === 'Fix')
        return exports.EFix(exports.erase(t.body));
    if (t.tag === 'Pi')
        return exports.EPi;
    if (t.tag === 'Let')
        return exports.ELet(exports.erase(t.value), exports.erase(t.body));
    if (t.tag === 'Meta')
        return util_1.impossible(`erase meta ${t.index}`);
    return t;
};

},{"./util":13}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Nil = { tag: 'Nil' };
exports.Cons = (head, tail) => ({ tag: 'Cons', head, tail });
exports.listFrom = (a) => a.reduceRight((x, y) => exports.Cons(y, x), exports.Nil);
exports.list = (...a) => exports.listFrom(a);
exports.toString = (l, fn = x => `${x}`) => {
    const r = [];
    let c = l;
    while (c.tag === 'Cons') {
        r.push(fn(c.head));
        c = c.tail;
    }
    return `[${r.join(', ')}]`;
};
exports.filter = (l, fn) => l.tag === 'Cons' ? (fn(l.head) ? exports.Cons(l.head, exports.filter(l.tail, fn)) : exports.filter(l.tail, fn)) : l;
exports.first = (l, fn) => {
    let c = l;
    while (c.tag === 'Cons') {
        if (fn(c.head))
            return c.head;
        c = c.tail;
    }
    return null;
};
exports.each = (l, fn) => {
    let c = l;
    while (c.tag === 'Cons') {
        fn(c.head);
        c = c.tail;
    }
};
exports.reverse = (l) => exports.listFrom(exports.toArray(l, x => x).reverse());
exports.toArray = (l, fn) => {
    let c = l;
    const r = [];
    while (c.tag === 'Cons') {
        r.push(fn(c.head));
        c = c.tail;
    }
    return r;
};
exports.append = (a, b) => a.tag === 'Cons' ? exports.Cons(a.head, exports.append(a.tail, b)) : b;
exports.map = (l, fn) => l.tag === 'Cons' ? exports.Cons(fn(l.head), exports.map(l.tail, fn)) : l;
exports.index = (l, i) => {
    while (l.tag === 'Cons') {
        if (i-- === 0)
            return l.head;
        l = l.tail;
    }
    return null;
};
exports.extend = (name, val, rest) => exports.Cons([name, val], rest);
exports.lookup = (l, name, eq = (x, y) => x === y) => {
    while (l.tag === 'Cons') {
        const h = l.head;
        if (eq(h[0], name))
            return h[1];
        l = l.tail;
    }
    return null;
};
exports.foldr = (f, i, l) => l.tag === 'Nil' ? i : f(l.head, exports.foldr(f, i, l.tail));
exports.foldl = (f, i, l) => l.tag === 'Nil' ? i : exports.foldl(f, f(i, l.head), l.tail);
exports.zipWith = (f, la, lb) => la.tag === 'Nil' || lb.tag === 'Nil' ? exports.Nil :
    exports.Cons(f(la.head, lb.head), exports.zipWith(f, la.tail, lb.tail));
exports.zipWith_ = (f, la, lb) => {
    if (la.tag === 'Cons' && lb.tag === 'Cons') {
        f(la.head, lb.head);
        exports.zipWith_(f, la.tail, lb.tail);
    }
};
exports.and = (l) => l.tag === 'Nil' ? true : l.head && exports.and(l.tail);
exports.range = (n) => n <= 0 ? exports.Nil : exports.Cons(n - 1, exports.range(n - 1));
exports.contains = (l, v) => l.tag === 'Cons' ? (l.head === v || exports.contains(l.tail, v)) : false;
exports.max = (l) => exports.foldl((a, b) => b > a ? b : a, Number.MIN_SAFE_INTEGER, l);

},{}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const domain_1 = require("./domain");
const list_1 = require("./list");
const terms_1 = require("./terms");
const util_1 = require("./util");
const typecheck_1 = require("./typecheck");
exports.capp = (c, d) => exports.evaluate(c.body, list_1.Cons(d, c.env));
exports.dapp = (a, b) => {
    if (a.tag === 'DAbs')
        return exports.capp(a.clos, b);
    if (a.tag === 'DFix')
        return exports.dapp(exports.capp(a.clos, a), b);
    if (a.tag === 'DNeutral')
        return domain_1.DNeutral(a.head, list_1.Cons(b, a.args));
    return util_1.impossible('vapp');
};
exports.force = (v) => {
    if (v.tag === 'DNeutral' && v.head.tag === 'Meta' && v.head.term)
        return exports.force(list_1.foldr((x, y) => exports.dapp(y, x), v.head.term, v.args));
    return v;
};
exports.evaluate = (t, env = list_1.Nil) => {
    if (t.tag === 'Var')
        return list_1.index(env, t.index) || util_1.impossible(`out of range var ${t.index} in evaluate`);
    if (t.tag === 'Const') {
        const v = typecheck_1.constenv[t.name];
        return v && v[1] ? v[1] : domain_1.DNeutral(t);
    }
    if (t.tag === 'Abs')
        return domain_1.DAbs(exports.evaluate(t.type, env), domain_1.Clos(t.body, env));
    if (t.tag === 'Pi')
        return domain_1.DPi(exports.evaluate(t.type, env), domain_1.Clos(t.body, env));
    if (t.tag === 'Fix')
        return domain_1.DFix(exports.evaluate(t.type, env), domain_1.Clos(t.body, env));
    if (t.tag === 'App')
        return exports.dapp(exports.evaluate(t.left, env), exports.evaluate(t.right, env));
    if (t.tag === 'Let')
        return exports.evaluate(t.body, list_1.Cons(exports.evaluate(t.value, env), env));
    if (t.tag === 'Meta')
        return t.term || domain_1.DNeutral(t);
    return t;
};
exports.quote = (d, k = 0) => {
    if (d.tag === 'DAbs')
        return terms_1.Abs(exports.quote(d.type, k), exports.quote(exports.capp(d.clos, domain_1.DVar(k)), k + 1));
    if (d.tag === 'DPi')
        return terms_1.Pi(exports.quote(d.type, k), exports.quote(exports.capp(d.clos, domain_1.DVar(k)), k + 1));
    if (d.tag === 'DFix')
        return terms_1.Fix(exports.quote(d.type, k), exports.quote(exports.capp(d.clos, domain_1.DVar(k)), k + 1));
    if (d.tag === 'DNeutral')
        return list_1.foldr((x, y) => terms_1.App(y, x), (d.head.tag === 'Const' || d.head.tag === 'Meta' ? d.head :
            terms_1.Var(k - (d.head.index + 1))), list_1.map(d.args, x => exports.quote(x, k)));
    return d;
};
exports.nf = (t, e = list_1.Nil, k = 0) => exports.quote(exports.evaluate(t, e), k);

},{"./domain":2,"./list":5,"./terms":10,"./typecheck":11,"./util":13}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const surface_1 = require("./surface");
const terms_1 = require("./terms");
const defs_1 = require("./defs");
const util_1 = require("./util");
const err = (msg) => { throw new SyntaxError(msg); };
const TName = (name) => ({ tag: 'Name', name });
const TList = (list) => ({ tag: 'List', list });
const matchingBracket = (c) => {
    if (c === '(')
        return ')';
    if (c === ')')
        return '(';
    return err(`invalid bracket: ${c}`);
};
const SYM1 = ['\\', ':', '/', '*'];
const SYM2 = ['\\:', '->'];
const START = 0;
const NAME = 1;
const COMMENT = 2;
const tokenize = (sc) => {
    let state = START;
    let r = [];
    let t = '';
    let esc = false;
    let p = [], b = [];
    for (let i = 0, l = sc.length; i <= l; i++) {
        const c = sc[i] || ' ';
        const next = sc[i + 1] || '';
        if (state === START) {
            if (SYM2.indexOf(c + next) >= 0)
                r.push(TName(c + next)), i++;
            else if (SYM1.indexOf(c) >= 0)
                r.push(TName(c));
            else if (c === ';')
                state = COMMENT;
            else if (/[\_a-z]/i.test(c))
                t += c, state = NAME;
            else if (c === '(')
                b.push(c), p.push(r), r = [];
            else if (c === ')') {
                if (b.length === 0)
                    return err(`unmatched bracket: ${c}`);
                const br = b.pop();
                if (matchingBracket(br) !== c)
                    return err(`unmatched bracket: ${br} and ${c}`);
                const a = p.pop();
                a.push(TList(r));
                r = a;
            }
            else if (/\s/.test(c))
                continue;
            else
                return err(`invalid char ${c} in tokenize`);
        }
        else if (state === NAME) {
            if (!/[a-z0-9\_]/i.test(c)) {
                r.push(TName(t));
                t = '', i--, state = START;
            }
            else
                t += c;
        }
        else if (state === COMMENT) {
            if (c === '\n')
                state = START;
        }
    }
    if (b.length > 0)
        return err(`unclosed brackets: ${b.join(' ')}`);
    if (state !== START && state !== COMMENT)
        return err('invalid tokenize end state');
    if (esc)
        return err(`escape is true after tokenize`);
    return r;
};
const exprs = (ts) => {
    if (ts.length === 0)
        return surface_1.SVar('Unit');
    if (ts.length === 1)
        return expr(ts[0]);
    const head = ts[0];
    if (head.tag === 'Name') {
        const x = head.name;
        if (x === '\\' || x === 'fn') {
            const args = ts[1];
            if (!args)
                return err(`abs missing args`);
            const rest = exprs(ts.slice(2));
            if (args.tag === 'Name')
                return surface_1.SAbs(args.name, rest);
            return surface_1.sabs(args.list.map(a => a.tag === 'Name' ? a.name : err(`nested list in args of abs`)), rest);
        }
        if (x === '/' || x === 'pi') {
            if (ts.length < 3)
                return err(`invalid use of / or pi`);
            const arg = ts[1];
            if (arg.tag !== 'Name')
                return err(`invalid arg for pi`);
            const rest = exprs(ts.slice(3));
            return surface_1.SPi(arg.name, expr(ts[2]), rest);
        }
        if (x === '\\:' || x === 'fnt') {
            if (ts.length < 3)
                return err(`invalid use of \\: or fnt`);
            const arg = ts[1];
            if (arg.tag !== 'Name')
                return err(`invalid arg for fnt`);
            const rest = exprs(ts.slice(3));
            return surface_1.SAbs(arg.name, rest, expr(ts[2]));
        }
        if (x === 'fix') {
            if (ts.length < 3)
                return err(`invalid use of fix`);
            const arg = ts[1];
            if (arg.tag !== 'Name')
                return err(`invalid arg for fix`);
            const rest = exprs(ts.slice(3));
            return surface_1.SFix(arg.name, expr(ts[2]), rest);
        }
        if (x === ':') {
            if (ts.length !== 3)
                return err(`invalid annotation`);
            return surface_1.SAnn(expr(ts[1]), expr(ts[2]));
        }
        if (x === '->') {
            return surface_1.sfunFrom(ts.slice(1).map(expr));
        }
        if (x === 'let') {
            if (ts.length < 4)
                return err(`invalid let`);
            const x = ts[1];
            if (x.tag !== 'Name')
                return err(`invalid let name`);
            const rest = exprs(ts.slice(4));
            return surface_1.SLet(x.name, expr(ts[2]), expr(ts[3]), rest);
        }
    }
    return surface_1.sappFrom(ts.map(expr));
};
const expr = (t) => {
    if (t.tag === 'List')
        return exprs(t.list);
    const x = t.name;
    if (x === '*')
        return terms_1.Type;
    if (x === '_')
        return surface_1.SHole;
    return surface_1.SVar(x);
};
const defs = (t) => {
    if (t.length === 0)
        return [];
    const head = t[0];
    if (head.tag === 'List')
        return util_1.terr('invalid def');
    if (head.name === 'let') {
        const x = t[1];
        if (!x || x.tag !== 'Name')
            return util_1.terr('invalid let name');
        const d = t[2];
        if (!d)
            return util_1.terr('invalid definition');
        const rest = defs(t.slice(3));
        return [defs_1.DLet(x.name, expr(d))].concat(rest);
    }
    if (head.name === 'opaque') {
        const x = t[1];
        if (!x || x.tag !== 'Name')
            return util_1.terr('invalid opaque name');
        const y = t[2];
        if (!y || y.tag !== 'Name')
            return util_1.terr('invalid opaque proof name');
        const d = t[3];
        if (!d)
            return util_1.terr('invalid definition');
        const rest = defs(t.slice(4));
        return [defs_1.DOpaque(x.name, y.name, expr(d))].concat(rest);
    }
    return util_1.terr('invalid def');
};
exports.parse = (s) => {
    const ts = tokenize(s);
    return exprs(ts);
};
exports.parseDefs = (s) => {
    const ts = tokenize(s);
    return defs(ts);
};

},{"./defs":1,"./surface":9,"./terms":10,"./util":13}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const typecheck_1 = require("./typecheck");
const terms_1 = require("./terms");
const nbe_1 = require("./nbe");
const elaboration_1 = require("./elaboration");
const surface_1 = require("./surface");
const parser_1 = require("./parser");
const erased_1 = require("./erased");
const defs_1 = require("./defs");
exports.initREPL = () => {
    const b = terms_1.Var;
    const IO = terms_1.Const('IO');
    Object.assign(typecheck_1.constenv, util_1.mapobj({
        IO: terms_1.fun(terms_1.Type, terms_1.Type),
        // (t:*) -> t -> IO t
        returnIO: terms_1.fun(terms_1.Type, b(0), terms_1.app(IO, b(1))),
        // (a:*) -> (b:*) -> (a -> IO b) -> IO a -> IO b
        // * -> * -> (1 -> IO 1) -> IO 2 -> IO 2
        bindIO: terms_1.fun(terms_1.Type, terms_1.Type, terms_1.fun(b(1), terms_1.app(IO, b(1))), terms_1.app(IO, b(2)), terms_1.app(IO, b(2))),
    }, t => [nbe_1.evaluate(t), null]));
};
exports.runREPL = (_s, _cb) => {
    try {
        if (_s[0] === ':') {
            const ds = parser_1.parseDefs(_s.slice(1));
            console.log(defs_1.showDefs(ds));
            elaboration_1.elaborateDefs(ds);
            return _cb(`done: ${defs_1.showDefs(ds)}`);
        }
        const ds = parser_1.parse(_s);
        const nm = surface_1.toNameless(ds);
        const [tm, ty] = elaboration_1.elaborate(nm);
        console.log(`${terms_1.showTerm(tm)}`);
        const normal = nbe_1.nf(tm);
        //console.log(showTerm(normal));
        //console.log(showETerm(erase(normal)));
        return _cb(`${terms_1.showTerm(normal)} : ${terms_1.showTerm(ty)} ~> ${erased_1.showETerm(erased_1.erase(normal))}`);
    }
    catch (err) {
        return _cb('' + err, true);
    }
};

},{"./defs":1,"./elaboration":3,"./erased":4,"./nbe":6,"./parser":7,"./surface":9,"./terms":10,"./typecheck":11,"./util":13}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const terms_1 = require("./terms");
const list_1 = require("./list");
exports.SVar = (name) => ({ tag: 'SVar', name });
exports.SAbs = (name, body, type = null) => ({ tag: 'SAbs', name, body, type });
exports.sabs = (ns, body) => ns.reduceRight((x, y) => exports.SAbs(y, x), body);
exports.SApp = (left, right) => ({ tag: 'SApp', left, right });
exports.sappFrom = (ts) => ts.reduce(exports.SApp);
exports.sapp = (...ts) => exports.sappFrom(ts);
exports.SPi = (name, type, body) => ({ tag: 'SPi', name, type, body });
exports.spi = (ts, body) => ts.reduceRight((x, [y, t]) => exports.SPi(y, t, x), body);
exports.sfunFrom = (ts) => ts.reduceRight((x, y) => exports.SPi('_', y, x));
exports.sfun = (...ts) => exports.sfunFrom(ts);
exports.SFix = (name, type, body) => ({ tag: 'SFix', name, type, body });
exports.SAnn = (term, type) => ({ tag: 'SAnn', term, type });
exports.SLet = (name, type, value, body) => ({ tag: 'SLet', name, type, value, body });
exports.SHole = { tag: 'SHole' };
exports.showSTerm = (t) => {
    if (t.tag === 'SVar')
        return t.name;
    if (t.tag === 'Var')
        return `${t.index}`;
    if (t.tag === 'SAbs')
        return `(\\${t.type ? `(${t.name}:${exports.showSTerm(t.type)})` : t.name}.${exports.showSTerm(t.body)})`;
    if (t.tag === 'SFix')
        return `(fix(${t.name}:${exports.showSTerm(t.type)}).${exports.showSTerm(t.body)})`;
    if (t.tag === 'SApp')
        return `(${exports.showSTerm(t.left)} ${exports.showSTerm(t.right)})`;
    if (t.tag === 'SAnn')
        return `(${exports.showSTerm(t.term)} : ${exports.showSTerm(t.type)})`;
    if (t.tag === 'SPi')
        return `((${t.name}:${exports.showSTerm(t.type)}) -> ${exports.showSTerm(t.body)})`;
    if (t.tag === 'Type')
        return '*';
    if (t.tag === 'SHole')
        return '_';
    if (t.tag === 'SLet')
        return `(let ${t.name} : ${exports.showSTerm(t.type)} = ${exports.showSTerm(t.value)} in ${exports.showSTerm(t.body)})`;
    return util_1.impossible('showTerm');
};
exports.toNameless = (t, k = 0, ns = list_1.Nil) => {
    if (t.tag === 'SVar') {
        const i = list_1.lookup(ns, t.name);
        return typeof i === 'number' ? terms_1.Var(k - i - 1) : t.name === '_' ? exports.SHole : t;
    }
    if (t.tag === 'SAbs')
        return exports.SAbs(t.name, exports.toNameless(t.body, k + 1, list_1.Cons([t.name, k], ns)), t.type && exports.toNameless(t.type, k, ns));
    if (t.tag === 'SFix')
        return exports.SFix(t.name, exports.toNameless(t.type, k, ns), exports.toNameless(t.body, k + 1, list_1.Cons([t.name, k], ns)));
    if (t.tag === 'SPi')
        return exports.SPi(t.name, exports.toNameless(t.type, k, ns), exports.toNameless(t.body, k + 1, list_1.Cons([t.name, k], ns)));
    if (t.tag === 'SApp')
        return exports.SApp(exports.toNameless(t.left, k, ns), exports.toNameless(t.right, k, ns));
    if (t.tag === 'SAnn')
        return exports.SAnn(exports.toNameless(t.term, k, ns), exports.toNameless(t.type, k, ns));
    if (t.tag === 'SLet')
        return exports.SLet(t.name, exports.toNameless(t.type, k, ns), exports.toNameless(t.value, k, ns), exports.toNameless(t.body, k + 1, list_1.Cons([t.name, k], ns)));
    return t;
};

},{"./list":5,"./terms":10,"./util":13}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
exports.Var = (index) => ({ tag: 'Var', index });
exports.Abs = (type, body) => ({ tag: 'Abs', type, body });
exports.abs = (ts, body) => ts.reduceRight((x, y) => exports.Abs(y, x), body);
exports.App = (left, right) => ({ tag: 'App', left, right });
exports.appFrom = (ts) => ts.reduce(exports.App);
exports.app = (...ts) => exports.appFrom(ts);
exports.Pi = (type, body) => ({ tag: 'Pi', type, body });
exports.pi = (ts, body) => ts.reduceRight((x, y) => exports.Pi(y, x), body);
exports.funFrom = (ts) => ts.reduceRight((x, y) => exports.Pi(y, x));
exports.fun = (...ts) => exports.funFrom(ts);
exports.Fix = (type, body) => ({ tag: 'Fix', type, body });
exports.Type = { tag: 'Type' };
exports.Const = (name) => ({ tag: 'Const', name });
exports.Let = (type, value, body) => ({ tag: 'Let', type, value, body });
exports.Meta = (index) => ({ tag: 'Meta', index, term: null });
let metaId = 0;
exports.resetMetaId = () => { metaId = 0; };
exports.freshMeta = () => exports.Meta(metaId++);
exports.showTerm = (t) => {
    if (t.tag === 'Var')
        return `${t.index}`;
    if (t.tag === 'Const')
        return t.name;
    if (t.tag === 'Meta')
        return `?${t.index}${t.term ? '!' : ''}`;
    if (t.tag === 'Abs')
        return `(\\${exports.showTerm(t.type)}.${exports.showTerm(t.body)})`;
    if (t.tag === 'Fix')
        return `(fix ${exports.showTerm(t.type)}.${exports.showTerm(t.body)})`;
    if (t.tag === 'App')
        return `(${exports.showTerm(t.left)} ${exports.showTerm(t.right)})`;
    if (t.tag === 'Pi')
        return `(${exports.showTerm(t.type)} -> ${exports.showTerm(t.body)})`;
    if (t.tag === 'Type')
        return '*';
    if (t.tag === 'Let')
        return `(let ${exports.showTerm(t.type)} = ${exports.showTerm(t.value)} in ${exports.showTerm(t.body)})`;
    return util_1.impossible('showTerm');
};

},{"./util":13}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const domain_1 = require("./domain");
const terms_1 = require("./terms");
const nbe_1 = require("./nbe");
const list_1 = require("./list");
const util_1 = require("./util");
const unify_1 = require("./unify");
exports.constenv = {};
exports.check = (tenv, venv, k, t, ty) => {
    if (t.tag === 'Let') {
        exports.check(tenv, venv, k, t.type, terms_1.Type);
        const vty = nbe_1.evaluate(t.type, venv);
        exports.check(tenv, venv, k, t.value, vty);
        exports.check(list_1.Cons(vty, tenv), list_1.Cons(nbe_1.evaluate(t.value, venv), venv), k + 1, t.body, ty);
        return;
    }
    const ty2 = exports.synth(tenv, venv, k, t);
    unify_1.unify(k, ty2, ty);
};
exports.synth = (tenv, venv, k, t) => {
    if (t.tag === 'Type')
        return terms_1.Type;
    if (t.tag === 'Var')
        return list_1.index(tenv, t.index) || util_1.terr(`var out of scope ${t.index}`);
    if (t.tag === 'Abs') {
        exports.check(tenv, venv, k, t.type, terms_1.Type);
        const type = nbe_1.evaluate(t.type, venv);
        const rt = exports.synth(list_1.Cons(type, tenv), list_1.Cons(domain_1.DVar(k), venv), k + 1, t.body);
        return domain_1.DPi(type, domain_1.Clos(nbe_1.quote(rt, k + 1), venv));
    }
    if (t.tag === 'Fix') {
        exports.check(tenv, venv, k, t.type, terms_1.Type);
        const type = nbe_1.evaluate(t.type, venv);
        exports.check(list_1.Cons(type, tenv), list_1.Cons(nbe_1.evaluate(t, venv), venv), k + 1, t.body, type);
        return type;
    }
    if (t.tag === 'Pi') {
        exports.check(tenv, venv, k, t.type, terms_1.Type);
        exports.check(list_1.Cons(nbe_1.evaluate(t.type, venv), tenv), list_1.Cons(domain_1.DVar(k), venv), k + 1, t.body, terms_1.Type);
        return terms_1.Type;
    }
    if (t.tag === 'App') {
        const ta = exports.synth(tenv, venv, k, t.left);
        return exports.synthapp(tenv, venv, k, t, ta, t.right);
    }
    if (t.tag === 'Const') {
        const ty = exports.constenv[t.name];
        if (!ty)
            return util_1.terr(`undefined const ${t.name}`);
        return ty[0];
    }
    if (t.tag === 'Let') {
        exports.check(tenv, venv, k, t.type, terms_1.Type);
        const vty = nbe_1.evaluate(t.type, venv);
        exports.check(tenv, venv, k, t.value, vty);
        return exports.synth(list_1.Cons(vty, tenv), list_1.Cons(nbe_1.evaluate(t.value, venv), venv), k + 1, t.body);
    }
    return util_1.terr(`cannot synth ${terms_1.showTerm(t)}`);
};
exports.synthapp = (tenv, venv, k, t, ta, b) => {
    if (ta.tag === 'DPi') {
        exports.check(tenv, venv, k, b, ta.type);
        return nbe_1.capp(ta.clos, nbe_1.evaluate(b, venv));
    }
    if (ta.tag === 'DFix')
        return exports.synthapp(tenv, venv, k, t, nbe_1.capp(ta.clos, ta), b);
    return util_1.terr(`invalid type in synthapp ${terms_1.showTerm(t)}: ${terms_1.showTerm(nbe_1.quote(ta, k))}`);
};
exports.typecheck = (t) => {
    const ty = exports.synth(list_1.Nil, list_1.Nil, 0, t);
    return nbe_1.quote(ty);
};

},{"./domain":2,"./list":5,"./nbe":6,"./terms":10,"./unify":12,"./util":13}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const list_1 = require("./list");
const util_1 = require("./util");
const nbe_1 = require("./nbe");
const domain_1 = require("./domain");
const terms_1 = require("./terms");
exports.headeq = (a, b) => a === b || (a.tag === 'Var' ? (b.tag === 'Var' && a.index === b.index) :
    (a.tag === 'Const' && b.tag === 'Const' && a.name === b.name));
exports.unify = (k, a_, b_) => {
    const a = nbe_1.force(a_);
    const b = nbe_1.force(b_);
    if (a.tag === 'Type' && b.tag === 'Type')
        return;
    if (a.tag === 'DAbs' && b.tag === 'DAbs') {
        exports.unify(k, a.type, b.type);
        const v = domain_1.DVar(k);
        return exports.unify(k + 1, nbe_1.capp(a.clos, v), nbe_1.capp(b.clos, v));
    }
    if (a.tag === 'DFix' && b.tag === 'DFix') {
        exports.unify(k, a.type, b.type);
        const v = domain_1.DVar(k);
        return exports.unify(k + 1, nbe_1.capp(a.clos, v), nbe_1.capp(b.clos, v));
    }
    if (a.tag === 'DAbs') {
        const v = domain_1.DVar(k);
        return exports.unify(k + 1, nbe_1.capp(a.clos, v), nbe_1.dapp(b, v));
    }
    if (b.tag === 'DAbs') {
        const v = domain_1.DVar(k);
        return exports.unify(k + 1, nbe_1.dapp(a, v), nbe_1.capp(b.clos, v));
    }
    if (a.tag === 'DFix')
        return exports.unify(k, nbe_1.capp(a.clos, a), b);
    if (b.tag === 'DFix')
        return exports.unify(k, a, nbe_1.capp(b.clos, b));
    if (a.tag === 'DPi' && b.tag === 'DPi') {
        exports.unify(k, a.type, b.type);
        const v = domain_1.DVar(k);
        return exports.unify(k + 1, nbe_1.capp(a.clos, v), nbe_1.capp(b.clos, v));
    }
    if (a.tag === 'DNeutral' && b.tag === 'DNeutral' && exports.headeq(a.head, b.head))
        return list_1.zipWith_((x, y) => exports.unify(k, x, y), a.args, b.args);
    if (a.tag === 'DNeutral' && a.head.tag === 'Meta')
        return solve(k, a.head, a.args, b);
    if (b.tag === 'DNeutral' && b.head.tag === 'Meta')
        return solve(k, b.head, b.args, a);
    return util_1.terr(`typecheck failed: ${terms_1.showTerm(nbe_1.quote(b, k))} expected, got ${terms_1.showTerm(nbe_1.quote(a, k))}`);
};
const checkSpine = (sp) => list_1.map(sp, x => {
    const v = nbe_1.force(x);
    return v.tag === 'DNeutral' && v.head.tag === 'Var' && v.args.tag === 'Nil' ?
        v.head.index :
        util_1.terr(`non-variable in meta spine`);
});
const checkSolution = (m, sp, t) => {
    if (t === m)
        return util_1.terr(`occurs check failed`);
    if (t.tag === 'Var') {
        if (!list_1.contains(sp, t.index))
            return util_1.terr(`scope error`);
        return;
    }
    if (t.tag === 'Const')
        return;
    if (t.tag === 'Meta')
        return;
    if (t.tag === 'App') {
        checkSolution(m, sp, t.left);
        checkSolution(m, sp, t.right);
        return;
    }
    if (t.tag === 'Abs') {
        checkSolution(m, sp, t.type);
        checkSolution(m, list_1.Cons(0, list_1.map(sp, x => x + 1)), t.body);
        return;
    }
    if (t.tag === 'Fix') {
        checkSolution(m, sp, t.type);
        checkSolution(m, list_1.Cons(0, list_1.map(sp, x => x + 1)), t.body);
        return;
    }
    if (t.tag === 'Pi') {
        checkSolution(m, sp, t.type);
        checkSolution(m, list_1.Cons(0, list_1.map(sp, x => x + 1)), t.body);
        return;
    }
    if (t.tag === 'Type')
        return;
    return util_1.impossible('checkSolution');
};
const solve = (k, m, sp_, t) => {
    const sp = checkSpine(sp_);
    const rhs = nbe_1.quote(t, k);
    checkSolution(m, sp, rhs);
    //console.log(showTerm(m), toString(sp), showTerm(rhs));
    // const mx = max(sp);
    //console.log(mx);
    const qterm = list_1.foldl((x, y) => terms_1.Abs(terms_1.Type, x), rhs, sp);
    //console.log(showTerm(qterm));
    m.term = nbe_1.evaluate(qterm);
};
exports.newMeta = (k) => list_1.foldr((x, y) => terms_1.App(y, x), terms_1.freshMeta(), list_1.reverse(list_1.map(list_1.range(k), terms_1.Var)));
const L = (v) => [false, v];
const R = (v) => [true, v];
const either = (e, l, r) => e[0] ? r(e[1]) : l(e[1]);
const zonkApp = (venv, k, t) => {
    if (t.tag === 'Meta')
        return t.term ? L(t.term) : R(t);
    if (t.tag === 'App')
        return either(zonkApp(venv, k, t.left), x => L(nbe_1.dapp(x, nbe_1.evaluate(t.right, venv))), x => R(terms_1.App(x, exports.zonk(venv, k, t.right))));
    return R(exports.zonk(venv, k, t));
};
exports.zonk = (venv, k, t) => {
    if (t.tag === 'Meta') {
        if (!t.term)
            return t;
        return exports.zonk(venv, k, nbe_1.quote(t.term, k));
    }
    if (t.tag === 'Abs')
        return terms_1.Abs(exports.zonk(venv, k, t.type), exports.zonk(list_1.Cons(domain_1.DVar(k), venv), k + 1, t.body));
    if (t.tag === 'Fix')
        return terms_1.Fix(exports.zonk(venv, k, t.type), exports.zonk(list_1.Cons(domain_1.DVar(k), venv), k + 1, t.body));
    if (t.tag === 'Pi')
        return terms_1.Pi(exports.zonk(venv, k, t.type), exports.zonk(list_1.Cons(domain_1.DVar(k), venv), k + 1, t.body));
    if (t.tag === 'Let')
        return terms_1.Let(exports.zonk(venv, k, t.type), exports.zonk(venv, k, t.value), exports.zonk(list_1.Cons(domain_1.DVar(k), venv), k + 1, t.body));
    if (t.tag === 'App')
        return either(zonkApp(venv, k, t.left), x => nbe_1.quote(nbe_1.dapp(x, nbe_1.evaluate(t.right, venv)), k), x => terms_1.App(x, exports.zonk(venv, k, t.right)));
    return t;
};

},{"./domain":2,"./list":5,"./nbe":6,"./terms":10,"./util":13}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.impossible = (msg) => {
    throw new Error(`impossible: ${msg}`);
};
exports.terr = (msg) => {
    throw new TypeError(msg);
};
exports.mapobj = (o, f) => {
    const n = {};
    for (let k in o)
        n[k] = f(o[k]);
    return n;
};

},{}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const repl_1 = require("./repl");
var hist = [], index = -1;
var input = document.getElementById('input');
var content = document.getElementById('content');
function onresize() {
    content.style.height = window.innerHeight;
}
window.addEventListener('resize', onresize);
onresize();
addResult("REPL");
// getOutput(':i', addResult);
repl_1.initREPL();
input.focus();
input.onkeydown = function (keyEvent) {
    var val = input.value;
    var txt = (val || '').trim();
    if (keyEvent.keyCode === 13) {
        keyEvent.preventDefault();
        if (txt) {
            hist.push(val);
            index = hist.length;
            input.value = '';
            var div = document.createElement('div');
            div.innerHTML = val;
            div.className = 'line input';
            content.insertBefore(div, input);
            repl_1.runREPL(txt, addResult);
        }
    }
    else if (keyEvent.keyCode === 38 && index > 0) {
        keyEvent.preventDefault();
        input.value = hist[--index];
    }
    else if (keyEvent.keyCode === 40 && index < hist.length - 1) {
        keyEvent.preventDefault();
        input.value = hist[++index];
    }
    else if (keyEvent.keyCode === 40 && keyEvent.ctrlKey && index >= hist.length - 1) {
        index = hist.length;
        input.value = '';
    }
};
function addResult(msg, err) {
    var divout = document.createElement('pre');
    divout.className = 'line output';
    if (err)
        divout.className += ' error';
    divout.innerHTML = '' + msg;
    content.insertBefore(divout, input);
    input.focus();
    content.scrollTop = content.scrollHeight;
    return divout;
}

},{"./repl":8}]},{},[14]);
