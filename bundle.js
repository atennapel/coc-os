(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./env");
const terms_1 = require("./terms");
const values_1 = require("./values");
const util_1 = require("./util");
const list_1 = require("./list");
const nbe_1 = require("./nbe");
const unify_1 = require("./unify");
;
const check = (env, tm, ty) => {
    if (tm.tag === 'Abs' && !tm.type && ty.tag === 'VPi') {
        const x = env_1.fresh(env.vals, tm.name);
        const v = values_1.VVar(x);
        return terms_1.Abs(x, check({
            vals: list_1.Cons(env_1.DefV(x, v), env.vals),
            types: list_1.Cons(env_1.BoundT(x, ty.type), env.types),
        }, tm.body, ty.body(v)), nbe_1.quote(ty.type, env.vals));
    }
    if (tm.tag === 'Let') {
        const [val, tty, vty] = synthLetValue(env, tm.value, tm.type);
        const body = check({
            vals: list_1.Cons(env_1.DefV(tm.name, nbe_1.evaluate(val, env.vals)), env.vals),
            types: list_1.Cons(env_1.DefT(tm.name, vty), env.types),
        }, tm.body, ty);
        return terms_1.Let(tm.name, val, body, tty);
    }
    const [etm, ity] = synth(env, tm);
    unify_1.unify(env.vals, ity, ty);
    return etm;
};
const synth = (env, tm) => {
    if (tm.tag === 'Type')
        return [terms_1.Type, terms_1.Type];
    if (tm.tag === 'Var') {
        if (tm.name === '_')
            return util_1.terr(`_ is not a valid name`);
        const ty = env_1.lookupT(env.types, tm.name);
        if (!ty)
            return util_1.terr(`undefined var ${tm.name}`);
        return [tm, ty.type];
    }
    if (tm.tag === 'Pi') {
        const ty = check(env, tm.type, terms_1.Type);
        const vty = nbe_1.evaluate(ty, env.vals);
        const term = check({
            vals: list_1.Cons(env_1.BoundV(tm.name), env.vals),
            types: list_1.Cons(env_1.BoundT(tm.name, vty), env.types),
        }, tm.body, terms_1.Type);
        return [terms_1.Pi(tm.name, ty, term), terms_1.Type];
    }
    if (tm.tag === 'Ann') {
        const ty = check(env, tm.type, terms_1.Type);
        const vty = nbe_1.evaluate(ty, env.vals);
        const term = check(env, tm.term, vty);
        return [term, vty];
    }
    if (tm.tag === 'App') {
        const [l, ty] = synth(env, tm.left);
        const [r, rty] = synthapp(env, ty, tm.right);
        return [terms_1.App(l, r), rty];
    }
    if (tm.tag === 'Abs' && tm.type) {
        const ty = check(env, tm.type, terms_1.Type);
        const vty = nbe_1.evaluate(ty, env.vals);
        const venv = list_1.Cons(env_1.BoundV(tm.name), env.vals);
        const [body, rty] = synth({
            vals: venv,
            types: list_1.Cons(env_1.BoundT(tm.name, vty), env.types),
        }, tm.body);
        return [
            terms_1.Abs(tm.name, body, ty),
            nbe_1.evaluate(terms_1.Pi(tm.name, ty, nbe_1.quote(rty, venv)), env.vals),
        ];
    }
    if (tm.tag === 'Let') {
        const [val, ty, vty] = synthLetValue(env, tm.value, tm.type);
        const [body, rty] = synth({
            vals: list_1.Cons(env_1.DefV(tm.name, nbe_1.evaluate(val, env.vals)), env.vals),
            types: list_1.Cons(env_1.DefT(tm.name, vty), env.types),
        }, tm.body);
        return [terms_1.Let(tm.name, val, body, ty), rty];
    }
    return util_1.terr(`cannot synth ${terms_1.showTerm(tm)}`);
};
const synthLetValue = (env, val, ty) => {
    if (ty) {
        const ety = check(env, ty, terms_1.Type);
        const vty = nbe_1.evaluate(ety, env.vals);
        const ev = check(env, val, vty);
        return [ev, ety, vty];
    }
    else {
        const [ev, vty] = synth(env, val);
        return [ev, nbe_1.quote(vty, env.vals), vty];
    }
};
const synthapp = (env, ty, tm) => {
    if (ty.tag === 'VPi') {
        const arg = check(env, tm, ty.type);
        const varg = nbe_1.evaluate(arg, env.vals);
        return [arg, ty.body(varg)];
    }
    return util_1.terr(`expected a function type but got ${nbe_1.quote(ty, env.vals)}`);
};
exports.elaborate = (tm, env = { vals: list_1.Nil, types: list_1.Nil }) => {
    const [etm, ty] = synth(env, tm);
    return [etm, nbe_1.quote(ty, env.vals)];
};

},{"./env":2,"./list":3,"./nbe":5,"./terms":8,"./unify":9,"./util":10,"./values":11}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const names_1 = require("./names");
const list_1 = require("./list");
exports.BoundV = (name) => ({ tag: 'BoundV', name });
exports.DefV = (name, value) => ({ tag: 'DefV', name, value });
exports.BoundT = (name, type) => ({ tag: 'BoundT', name, type });
exports.DefT = (name, type) => ({ tag: 'DefT', name, type });
exports.fresh = (e, x) => names_1.freshName(list_1.map(e, y => y.name), x);
exports.lookupV = (l, x) => list_1.first(l, e => e.name === x);
exports.lookupT = (l, x) => list_1.first(l, e => e.name === x);

},{"./list":3,"./names":4}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const list_1 = require("./list");
// TODO: improve
exports.freshName = (l, x) => {
    if (x === '_')
        return x;
    while (list_1.contains(l, x))
        x = `${x}'`;
    return x;
};

},{"./list":3}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const values_1 = require("./values");
const util_1 = require("./util");
const list_1 = require("./list");
const env_1 = require("./env");
const terms_1 = require("./terms");
exports.vapp = (a, b) => {
    if (a.tag === 'VAbs')
        return a.body(b);
    if (a.tag === 'VNe')
        return values_1.VNe(a.head, list_1.Cons(b, a.args));
    return util_1.impossible('vapp');
};
exports.evaluate = (t, vs = list_1.Nil) => {
    if (t.tag === 'Type')
        return t;
    if (t.tag === 'Var') {
        const v = env_1.lookupV(vs, t.name);
        return v ? (v.tag === 'DefV' ? v.value : values_1.VVar(t.name)) :
            util_1.impossible('evaluate var');
    }
    if (t.tag === 'App')
        return exports.vapp(exports.evaluate(t.left, vs), exports.evaluate(t.right, vs));
    if (t.tag === 'Abs' && t.type)
        return values_1.VAbs(t.name, exports.evaluate(t.type, vs), v => exports.evaluate(t.body, list_1.Cons(env_1.DefV(t.name, v), vs)));
    if (t.tag === 'Pi')
        return values_1.VPi(t.name, exports.evaluate(t.type, vs), v => exports.evaluate(t.body, list_1.Cons(env_1.DefV(t.name, v), vs)));
    if (t.tag === 'Let')
        return exports.evaluate(t.body, list_1.Cons(env_1.DefV(t.name, exports.evaluate(t.value, vs)), vs));
    return util_1.impossible('evaluate');
};
exports.quote = (v, vs = list_1.Nil) => {
    if (v.tag === 'Type')
        return v;
    if (v.tag === 'VNe')
        return list_1.foldr((v, a) => terms_1.App(a, exports.quote(v, vs)), terms_1.Var(v.head), v.args);
    if (v.tag === 'VAbs') {
        const x = env_1.fresh(vs, v.name);
        return terms_1.Abs(x, exports.quote(v.body(values_1.VVar(x)), list_1.Cons(env_1.BoundV(x), vs)), exports.quote(v.type, vs));
    }
    if (v.tag === 'VPi') {
        const x = env_1.fresh(vs, v.name);
        return terms_1.Pi(x, exports.quote(v.type, vs), exports.quote(v.body(values_1.VVar(x)), list_1.Cons(env_1.BoundV(x), vs)));
    }
    return util_1.impossible('quote');
};
exports.normalize = (t, vs = list_1.Nil) => exports.quote(exports.evaluate(t, vs), vs);

},{"./env":2,"./list":3,"./terms":8,"./util":10,"./values":11}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const terms_1 = require("./terms");
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
        return terms_1.Var('Unit');
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
                return terms_1.Abs(args.name, rest);
            return terms_1.abs(args.list.map(a => a.tag === 'Name' ? a.name : err(`nested list in args of abs`)), rest);
        }
        if (x === '/' || x === 'pi') {
            if (ts.length < 3)
                return err(`invalid use of / or pi`);
            const arg = ts[1];
            if (arg.tag !== 'Name')
                return err(`invalid arg for pi`);
            const rest = exprs(ts.slice(3));
            return terms_1.Pi(arg.name, expr(ts[2]), rest);
        }
        if (x === '\\:' || x === 'fnt') {
            if (ts.length < 3)
                return err(`invalid use of \\: or fnt`);
            const arg = ts[1];
            if (arg.tag !== 'Name')
                return err(`invalid arg for fnt`);
            const rest = exprs(ts.slice(3));
            return terms_1.Abs(arg.name, rest, expr(ts[2]));
        }
        if (x === ':') {
            if (ts.length !== 3)
                return err(`invalid annotation`);
            return terms_1.Ann(expr(ts[1]), expr(ts[2]));
        }
        if (x === '->') {
            return terms_1.funFrom(ts.slice(1).map(expr));
        }
        if (x === 'let') {
            if (ts.length < 4)
                return err(`invalid let`);
            const x = ts[1];
            if (x.tag !== 'Name')
                return err(`invalid let name`);
            const rest = exprs(ts.slice(4));
            return terms_1.Let(x.name, expr(ts[2]), expr(ts[3]), rest);
        }
    }
    return terms_1.appFrom(ts.map(expr));
};
const expr = (t) => {
    if (t.tag === 'List')
        return exprs(t.list);
    const x = t.name;
    if (x === '*')
        return terms_1.Type;
    return terms_1.Var(x);
};
exports.parse = (s) => {
    const ts = tokenize(s);
    return exprs(ts);
};

},{"./terms":8}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nbe_1 = require("./nbe");
const elaborate_1 = require("./elaborate");
const parser_1 = require("./parser");
const terms_1 = require("./terms");
exports.initREPL = () => { };
exports.runREPL = (_s, _cb) => {
    try {
        const tm = parser_1.parse(_s);
        console.log(`inpt: ${terms_1.showTerm(tm)}`);
        const [term, type] = elaborate_1.elaborate(tm);
        console.log(`term: ${terms_1.showTerm(term)}`);
        console.log(`type: ${terms_1.showTerm(type)}`);
        const nf = nbe_1.normalize(term);
        console.log(`nmfm: ${terms_1.showTerm(nf)}`);
        return _cb(`${terms_1.showTerm(term)} : ${terms_1.showTerm(type)} ~> ${terms_1.showTerm(nf)}`);
    }
    catch (err) {
        return _cb('' + err, true);
    }
};

},{"./elaborate":1,"./nbe":5,"./parser":6,"./terms":8}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
exports.Var = (name) => ({ tag: 'Var', name });
exports.Abs = (name, body, type) => ({ tag: 'Abs', name, body, type });
exports.abs = (ns, body) => ns.reduceRight((x, y) => exports.Abs(y, x), body);
exports.App = (left, right) => ({ tag: 'App', left, right });
exports.appFrom = (ts) => ts.reduce(exports.App);
exports.Let = (name, value, body, type) => ({ tag: 'Let', name, value, body, type });
exports.Ann = (term, type) => ({ tag: 'Ann', term, type });
exports.Pi = (name, type, body) => ({ tag: 'Pi', name, type, body });
exports.funFrom = (ts) => ts.reduceRight((x, y) => exports.Pi('_', y, x));
exports.Type = { tag: 'Type' };
exports.showTerm = (t) => {
    if (t.tag === 'Var')
        return t.name;
    if (t.tag === 'Abs')
        return `(\\${t.type ? `(${t.name} : ${exports.showTerm(t.type)})` : t.name}. ${exports.showTerm(t.body)})`;
    if (t.tag === 'App')
        return `(${exports.showTerm(t.left)} ${exports.showTerm(t.right)})`;
    if (t.tag === 'Let')
        return `(let ${t.name}${t.type ? ` : ${exports.showTerm(t.type)}` : ''} = ${exports.showTerm(t.value)} in ${exports.showTerm(t.body)})`;
    if (t.tag === 'Ann')
        return `(${exports.showTerm(t.term)} : ${exports.showTerm(t.type)})`;
    if (t.tag === 'Pi')
        return `(${t.name === '_' ? exports.showTerm(t.type) : `(${t.name} : ${exports.showTerm(t.type)})`} -> ${exports.showTerm(t.body)})`;
    if (t.tag === 'Type')
        return '*';
    return util_1.impossible('showTerm');
};

},{"./util":10}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./env");
const values_1 = require("./values");
const util_1 = require("./util");
const terms_1 = require("./terms");
const nbe_1 = require("./nbe");
const list_1 = require("./list");
exports.unify = (vs, a, b) => {
    if (a.tag === 'Type' && b.tag === 'Type')
        return;
    if (a.tag === 'VAbs' && b.tag === 'VAbs') {
        const x = env_1.fresh(vs, a.name);
        const v = values_1.VVar(x);
        exports.unify(vs, a.type, b.type);
        exports.unify(list_1.Cons(env_1.BoundV(x), vs), a.body(v), b.body(v));
        return;
    }
    if (a.tag === 'VPi' && b.tag === 'VPi') {
        const x = env_1.fresh(vs, a.name);
        const v = values_1.VVar(x);
        exports.unify(vs, a.type, b.type);
        exports.unify(list_1.Cons(env_1.BoundV(x), vs), a.body(v), b.body(v));
        return;
    }
    if (a.tag === 'VAbs') {
        const x = env_1.fresh(vs, a.name);
        const v = values_1.VVar(x);
        return exports.unify(list_1.Cons(env_1.BoundV(x), vs), a.body(v), nbe_1.vapp(b, v));
    }
    if (b.tag === 'VAbs') {
        const x = env_1.fresh(vs, b.name);
        const v = values_1.VVar(x);
        return exports.unify(list_1.Cons(env_1.BoundV(x), vs), nbe_1.vapp(a, v), b.body(v));
    }
    if (a.tag === 'VNe' && b.tag === 'VNe' && a.head === b.head)
        return list_1.zipWith_((x, y) => exports.unify(vs, x, y), a.args, b.args);
    return util_1.terr(`cannot unify ${terms_1.showTerm(nbe_1.quote(a, vs))} ~ ${terms_1.showTerm(nbe_1.quote(b, vs))}`);
};

},{"./env":2,"./list":3,"./nbe":5,"./terms":8,"./util":10,"./values":11}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const list_1 = require("./list");
exports.VNe = (head, args) => ({ tag: 'VNe', head, args });
exports.VVar = (name) => exports.VNe(name, list_1.Nil);
exports.VAbs = (name, type, body) => ({ tag: 'VAbs', name, type, body });
exports.VPi = (name, type, body) => ({ tag: 'VPi', name, type, body });

},{"./list":3}],12:[function(require,module,exports){
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

},{"./repl":7}]},{},[12]);
