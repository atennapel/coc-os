(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = {
    debug: false,
};
exports.setConfig = (c) => {
    for (let k in c)
        exports.config[k] = c[k];
};
exports.log = (msg) => {
    if (exports.config.debug)
        console.log(msg());
};

},{}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Var = (index) => ({ tag: 'Var', index });
exports.App = (left, impl, right) => ({ tag: 'App', left, impl, right });
exports.Abs = (type, impl, body) => ({ tag: 'Abs', type, impl, body });
exports.Pi = (type, impl, body) => ({ tag: 'Pi', type, impl, body });
exports.Let = (val, impl, body) => ({ tag: 'Let', impl, val, body });
exports.Type = { tag: 'Type' };
exports.flattenApp = (t) => {
    const r = [];
    while (t.tag === 'App') {
        r.push([t.impl, t.right]);
        t = t.left;
    }
    return [t, r.reverse()];
};
exports.flattenAbs = (t) => {
    const r = [];
    while (t.tag === 'Abs') {
        r.push([t.impl, t.type]);
        t = t.body;
    }
    return [r, t];
};
exports.flattenPi = (t) => {
    const r = [];
    while (t.tag === 'Pi') {
        r.push([t.impl, t.type]);
        t = t.body;
    }
    return [r, t];
};
exports.showTermP = (b, t) => b ? `(${exports.showTerm(t)})` : exports.showTerm(t);
exports.showTerm = (t) => {
    if (t.tag === 'Type')
        return '*';
    if (t.tag === 'Var')
        return `${t.index}`;
    if (t.tag === 'App') {
        const [f, as] = exports.flattenApp(t);
        return `${exports.showTermP(f.tag === 'Abs' || f.tag === 'Pi' || f.tag === 'App' || f.tag === 'Let', f)} ${as.map(([im, t], i) => im ? `{${exports.showTerm(t)}}` :
            `${exports.showTermP(t.tag === 'App' || (t.tag === 'Let' && i < as.length - 1) || (t.tag === 'Abs' && i < as.length - 1) || (t.tag === 'Pi' && i < as.length - 1), t)}`).join(' ')}`;
    }
    if (t.tag === 'Abs') {
        const [as, b] = exports.flattenAbs(t);
        return `λ${as.map(([im, t]) => im ? `{${exports.showTerm(t)}}` : exports.showTermP(t.tag === 'Abs' || t.tag === 'Pi' || t.tag === 'App' || t.tag === 'Let', t)).join(' ')}. ${exports.showTerm(b)}`;
    }
    if (t.tag === 'Pi') {
        const [as, b] = exports.flattenPi(t);
        return `π${as.map(([im, t]) => im ? `{${exports.showTerm(t)}}` : exports.showTermP(t.tag === 'Abs' || t.tag === 'Pi' || t.tag === 'App' || t.tag === 'Let', t)).join(' ')}. ${exports.showTerm(b)}`;
    }
    if (t.tag === 'Let')
        return `let ${t.impl ? `implicitly ` : ''}${exports.showTerm(t.val)} in ${exports.showTerm(t.body)}`;
    return t;
};

},{}],3:[function(require,module,exports){
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
exports.length = (l) => {
    let n = 0;
    let c = l;
    while (c.tag === 'Cons') {
        n++;
        c = c.tail;
    }
    return n;
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
exports.toArrayFilter = (l, m, f) => {
    const a = [];
    while (l.tag === 'Cons') {
        if (f(l.head))
            a.push(m(l.head));
        l = l.tail;
    }
    return a;
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
const config_1 = require("./config");
const parser_1 = require("./surface/parser");
const terms_1 = require("./surface/terms");
const typecheck_1 = require("./surface/typecheck");
const vals_1 = require("./surface/vals");
exports.initREPL = () => { };
exports.runREPL = (_s, _cb) => {
    try {
        if (_s === ':debug') {
            config_1.config.debug = !config_1.config.debug;
            return _cb(`debug is now ${config_1.config.debug}`);
        }
        const tm = parser_1.parse(_s);
        config_1.log(() => `inpt: ${terms_1.showTerm(tm)}`);
        const [type, term] = typecheck_1.typecheck(tm);
        config_1.log(() => `term: ${terms_1.showTerm(term)}`);
        config_1.log(() => `type: ${terms_1.showTerm(type)}`);
        const nf = vals_1.normalize(term);
        config_1.log(() => `nmfm: ${terms_1.showTerm(nf)}`);
        return _cb(`${terms_1.showTerm(term)} : ${terms_1.showTerm(type)} ~>\n${terms_1.showTerm(nf)}`);
    }
    catch (err) {
        return _cb('' + err, true);
    }
};

},{"./config":1,"./surface/parser":5,"./surface/terms":6,"./surface/typecheck":7,"./surface/vals":9}],5:[function(require,module,exports){
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
const SYM1 = ['\\', ':', '/', '*', '@'];
const SYM2 = ['\\:', '->', '\\@', '\\@:', '/@', '-@'];
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
            else if (c === '#')
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
        if (x === '\\' || x === 'fn' || x === '\\@' || x === 'fni') {
            const args = ts[1];
            if (!args)
                return err(`abs missing args`);
            const rest = exprs(ts.slice(2));
            const impl = x === '\\@' || x === 'fni';
            if (args.tag === 'Name')
                return terms_1.Abs(args.name, null, impl, rest);
            return args.list.map(a => a.tag === 'Name' ? a.name : err(`nested list in args of abs`))
                .reduceRight((x, y) => terms_1.Abs(y, null, impl, x), rest);
        }
        if (x === '/' || x === 'pi' || x === '/@' || x === 'pii') {
            if (ts.length < 3)
                return err(`invalid use of / or pi`);
            const arg = ts[1];
            if (arg.tag !== 'Name')
                return err(`invalid arg for pi`);
            const rest = exprs(ts.slice(3));
            const impl = x === '/@' || x === 'pii';
            return terms_1.Pi(arg.name, expr(ts[2]), impl, rest);
        }
        if (x === '\\:' || x === 'fnt' || x === '\\@:' || x === 'fnit') {
            if (ts.length < 3)
                return err(`invalid use of \\: or fnt`);
            const arg = ts[1];
            if (arg.tag !== 'Name')
                return err(`invalid arg for fnt`);
            const rest = exprs(ts.slice(3));
            const impl = x === '\\@:' || x === 'fnit';
            return terms_1.Abs(arg.name, expr(ts[2]), impl, rest);
        }
        if (x === ':') {
            if (ts.length !== 3)
                return err(`invalid annotation`);
            return terms_1.Ann(expr(ts[1]), expr(ts[2]));
        }
        if (x === '->' || x === '-@') {
            const impl = x === '-@';
            return ts.slice(1).map(expr).reduceRight((x, y) => terms_1.Pi('_', y, impl, x));
        }
        if (x === 'let' || x === 'leti') {
            if (ts.length < 3)
                return err(`invalid let`);
            const xx = ts[1];
            if (xx.tag !== 'Name')
                return err(`invalid let name`);
            const rest = exprs(ts.slice(3));
            const impl = x === 'leti';
            return terms_1.Let(xx.name, null, impl, expr(ts[2]), rest);
        }
        if (x === 'lett' || x === 'letit') {
            if (ts.length < 4)
                return err(`invalid lett`);
            const xx = ts[1];
            if (xx.tag !== 'Name')
                return err(`invalid let name`);
            const rest = exprs(ts.slice(4));
            const impl = x === 'letit';
            return terms_1.Let(xx.name, expr(ts[3]), impl, rest, expr(ts[2]));
        }
        if (x === '@') {
            if (ts.length !== 3)
                return err(`invalid implicit application`);
            return terms_1.App(expr(ts[1]), true, expr(ts[2]));
        }
    }
    return ts.map(expr).reduce((x, y) => terms_1.App(x, false, y));
};
const expr = (t) => {
    if (t.tag === 'List')
        return exprs(t.list);
    const x = t.name;
    if (x === '*')
        return terms_1.Type;
    if (x === '_')
        return terms_1.Hole;
    return terms_1.Var(x);
};
exports.parse = (s) => {
    const ts = tokenize(s);
    return exprs(ts);
};

},{"./terms":6}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const C = require("../core/terms");
exports.Var = (name) => ({ tag: 'Var', name });
exports.App = (left, impl, right) => ({ tag: 'App', left, impl, right });
exports.Abs = (name, type, impl, body) => ({ tag: 'Abs', name, type, impl, body });
exports.Pi = (name, type, impl, body) => ({ tag: 'Pi', name, type, impl, body });
exports.Let = (name, type, impl, val, body) => ({ tag: 'Let', name, type, impl, val, body });
exports.Ann = (term, type) => ({ tag: 'Ann', term, type });
exports.Type = C.Type;
exports.Hole = { tag: 'Hole' };
let tmetaId = 0;
exports.Meta = () => ({ tag: 'Meta', id: tmetaId++, val: null });
exports.flattenApp = (t) => {
    const r = [];
    while (t.tag === 'App') {
        r.push([t.impl, t.right]);
        t = t.left;
    }
    return [t, r.reverse()];
};
exports.flattenAbs = (t) => {
    const r = [];
    while (t.tag === 'Abs') {
        r.push([t.name, t.impl, t.type]);
        t = t.body;
    }
    return [r, t];
};
exports.flattenPi = (t) => {
    const r = [];
    while (t.tag === 'Pi') {
        r.push([t.name, t.impl, t.type]);
        t = t.body;
    }
    return [r, t];
};
exports.showTermP = (b, t) => b ? `(${exports.showTerm(t)})` : exports.showTerm(t);
exports.showTerm = (t) => {
    if (t.tag === 'Type')
        return '*';
    if (t.tag === 'Hole')
        return '_';
    if (t.tag === 'Var')
        return `${t.name}`;
    if (t.tag === 'Meta')
        return `?${t.val ? '!' : ''}${t.id}`;
    if (t.tag === 'App') {
        const [f, as] = exports.flattenApp(t);
        return `${exports.showTermP(f.tag === 'Abs' || f.tag === 'Pi' || f.tag === 'App' || f.tag === 'Let' || f.tag === 'Ann', f)} ${as.map(([im, t], i) => im ? `{${exports.showTerm(t)}}` :
            `${exports.showTermP(t.tag === 'App' || t.tag === 'Ann' || (t.tag === 'Let' && i < as.length - 1) || (t.tag === 'Abs' && i < as.length - 1) || (t.tag === 'Pi' && i < as.length - 1), t)}`).join(' ')}`;
    }
    if (t.tag === 'Abs') {
        const [as, b] = exports.flattenAbs(t);
        return `\\${as.map(([x, im, t]) => im ? `{${x}${t ? ` : ${exports.showTermP(t.tag === 'Ann', t)}` : ''}}` : !t ? x : `(${x} : ${exports.showTermP(t.tag === 'Ann', t)})`).join(' ')}. ${exports.showTermP(b.tag === 'Ann', b)}`;
    }
    if (t.tag === 'Pi') {
        const [as, b] = exports.flattenPi(t);
        return `/${as.map(([x, im, t]) => im ? `{${x} : ${exports.showTermP(t.tag === 'Ann', t)}}` : `(${x} : ${exports.showTermP(t.tag === 'Ann', t)})`).join(' ')}. ${exports.showTermP(b.tag === 'Ann', b)}`;
    }
    if (t.tag === 'Let')
        return t.type ?
            `let ${t.impl ? `{${t.name} : ${exports.showTermP(t.type.tag === 'Ann', t.type)}}` : `${t.name} : ${exports.showTermP(t.type.tag === 'Ann', t.type)}`} = ${exports.showTerm(t.val)} in ${exports.showTermP(t.body.tag === 'Ann', t.body)}` :
            `let ${t.impl ? `{${t.name}}` : t.name} = ${exports.showTerm(t.val)} in ${exports.showTermP(t.body.tag === 'Ann', t.body)}`;
    if (t.tag === 'Ann')
        return `${exports.showTerm(t.term)} : ${exports.showTerm(t.type)}`;
    return t;
};
exports.containsAnyMetas = (t) => {
    if (t.tag === 'Meta')
        return true;
    if (t.tag === 'App')
        return exports.containsAnyMetas(t.left) || exports.containsAnyMetas(t.right);
    if (t.tag === 'Abs')
        return (t.type && exports.containsAnyMetas(t.type)) || exports.containsAnyMetas(t.body);
    if (t.tag === 'Pi')
        return exports.containsAnyMetas(t.type) || exports.containsAnyMetas(t.body);
    if (t.tag === 'Let')
        return (t.type && exports.containsAnyMetas(t.type)) || exports.containsAnyMetas(t.val) || exports.containsAnyMetas(t.body);
    if (t.tag === 'Ann')
        return exports.containsAnyMetas(t.term) || exports.containsAnyMetas(t.type);
    return false;
};
exports.containsAnyHoles = (t) => {
    if (t.tag === 'Hole')
        return true;
    if (t.tag === 'App')
        return exports.containsAnyMetas(t.left) || exports.containsAnyMetas(t.right);
    if (t.tag === 'Abs')
        return (t.type && exports.containsAnyMetas(t.type)) || exports.containsAnyMetas(t.body);
    if (t.tag === 'Pi')
        return exports.containsAnyMetas(t.type) || exports.containsAnyMetas(t.body);
    if (t.tag === 'Let')
        return (t.type && exports.containsAnyMetas(t.type)) || exports.containsAnyMetas(t.val) || exports.containsAnyMetas(t.body);
    if (t.tag === 'Ann')
        return exports.containsAnyMetas(t.term) || exports.containsAnyMetas(t.type);
    return false;
};

},{"../core/terms":2}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const list_1 = require("../list");
const terms_1 = require("./terms");
const vals_1 = require("./vals");
const unification_1 = require("./unification");
const util_1 = require("../util");
const config_1 = require("../config");
exports.Bound = (type) => ({ bound: true, type });
exports.Def = (type) => ({ bound: false, type });
exports.showEnvT = (l, vs) => list_1.toString(l, ([x, b]) => `${x} :${b.bound ? '' : '='} ${terms_1.showTerm(vals_1.quote(b.type, vs))}`);
const freshMeta = (ts) => {
    const spine = list_1.map(list_1.filter(ts, ([x, { bound }]) => bound), ([x, _]) => terms_1.Var(x));
    return list_1.foldr((x, y) => terms_1.App(y, false, x), terms_1.Meta(), spine);
};
const inst = (ts, vs, ty_) => {
    const ty = vals_1.force(ty_);
    if (ty.tag === 'VPi' && ty.impl) {
        const m = freshMeta(ts);
        const vm = vals_1.evaluate(m, vs);
        const [res, args] = inst(ts, vs, ty.body(vm));
        return [res, list_1.Cons(m, args)];
    }
    return [ty, list_1.Nil];
};
const check = (ts, vs, tm, ty_) => {
    const ty = vals_1.force(ty_);
    config_1.log(() => `check ${terms_1.showTerm(tm)} : ${terms_1.showTerm(vals_1.quote(ty, vs))} in ${exports.showEnvT(ts, vs)} and ${vals_1.showEnvV(vs)}`);
    if (ty.tag === 'Type' && tm.tag === 'Type')
        return terms_1.Type;
    if (tm.tag === 'Abs' && !tm.type && ty.tag === 'VPi' && tm.impl === ty.impl) {
        const x = vals_1.fresh(vs, ty.name);
        const vx = vals_1.VVar(x);
        const body = check(list_1.Cons([tm.name, exports.Bound(ty.type)], ts), list_1.Cons([tm.name, vx], vs), tm.body, ty.body(vx));
        return terms_1.Abs(tm.name, vals_1.quote(ty.type, vs), tm.impl, body);
    }
    if (ty.tag === 'VPi' && ty.impl && !(tm.tag === 'Abs' && tm.type && tm.impl)) {
        const x = vals_1.fresh(vs, ty.name);
        const vx = vals_1.VVar(x);
        const term = check(list_1.Cons([x, exports.Bound(ty.type)], ts), list_1.Cons([x, true], vs), tm, ty.body(vx));
        return terms_1.Abs(x, vals_1.quote(ty.type, vs), true, term);
    }
    /*
    if (tm.tag === 'App') {
      const [fn, args] = flattenApp(tm);
      const [vty, fntm] = synth(ts, vs, fn);
      const [rt, rem, targs] = collect(ts, vs, vty, args);
      const [rtinst, ms] = inst(ts, vs, rt);
      unify(vs, rtinst, vty);
      const tms = handleArgs(ts, vs, targs);
      return;
    }
    */
    if (tm.tag === 'Hole')
        return freshMeta(ts);
    if (tm.tag === 'Let') {
        if (tm.type) {
            const type = check(ts, vs, tm.type, vals_1.VType);
            const vt = vals_1.evaluate(type, vs);
            const val = check(ts, vs, tm.val, vt);
            const vv = vals_1.evaluate(val, vs);
            const body = check(list_1.Cons([tm.name, exports.Def(vt)], ts), list_1.Cons([tm.name, vv], vs), tm.body, ty);
            return terms_1.Let(tm.name, type, tm.impl, val, body);
        }
        else {
            const [vt, val] = synth(ts, vs, tm.val);
            const vv = vals_1.evaluate(val, vs);
            const body = check(list_1.Cons([tm.name, exports.Def(vt)], ts), list_1.Cons([tm.name, vv], vs), tm.body, ty);
            return terms_1.Let(tm.name, vals_1.quote(vt, vs), tm.impl, val, body);
        }
    }
    const [ty2, term] = synth(ts, vs, tm);
    const [ty2inst, targs] = inst(ts, vs, ty2);
    unification_1.unify(vs, ty2inst, ty);
    return list_1.foldl((a, m) => terms_1.App(a, true, m), term, targs);
};
const freshPi = (ts, vs, x, impl) => {
    const a = freshMeta(ts);
    const va = vals_1.evaluate(a, vs);
    const b = freshMeta(list_1.Cons([x, exports.Bound(va)], ts));
    return vals_1.VPi(x, va, impl, v => vals_1.evaluate(b, list_1.Cons([x, v], vs)));
};
const synth = (ts, vs, tm) => {
    config_1.log(() => `synth ${terms_1.showTerm(tm)} in ${exports.showEnvT(ts, vs)} and ${vals_1.showEnvV(vs)}`);
    if (tm.tag === 'Type')
        return [vals_1.VType, tm];
    if (tm.tag === 'Var') {
        const ty = list_1.lookup(ts, tm.name);
        if (!ty)
            return util_1.terr(`undefined var ${tm.name}`);
        return [ty.type, tm];
    }
    if (tm.tag === 'Ann') {
        const type = check(ts, vs, tm.type, vals_1.VType);
        const vt = vals_1.evaluate(type, vs);
        const term = check(ts, vs, tm.term, vt);
        return [vt, term];
    }
    if (tm.tag === 'App') {
        /*
        const [fn, args] = flattenApp(tm);
        const [ty, fntm] = synth(ts, vs, fn);
        const [rt, rem, targs] = collect(ts, vs, ty, args);
        const tms = handleArgs(ts, vs, targs);
        const res = foldl((acc, x) => x[0] ? App(acc, true, x[1]) : App(acc, false, ), fntm, targs);
        return [rt, res];
        */
        const [fn, fntm] = synth(ts, vs, tm.left);
        const [rt, res, ms] = synthapp(ts, vs, fn, tm.impl, tm.right);
        return [rt, terms_1.App(list_1.foldl((f, a) => terms_1.App(f, true, a), fntm, ms), tm.impl, res)];
    }
    if (tm.tag === 'Abs') {
        if (tm.type) {
            const type = check(ts, vs, tm.type, vals_1.VType);
            const vt = vals_1.evaluate(type, vs);
            const [rt, body] = synth(list_1.Cons([tm.name, exports.Bound(vt)], ts), list_1.Cons([tm.name, true], vs), tm.body);
            return [
                vals_1.evaluate(terms_1.Pi(tm.name, tm.type, tm.impl, vals_1.quote(rt, list_1.Cons([tm.name, true], vs))), vs),
                terms_1.Abs(tm.name, type, tm.impl, body),
            ];
        }
        else {
            const pi = freshPi(ts, vs, tm.name, tm.impl);
            const term = check(ts, vs, tm, pi);
            return [pi, term];
        }
    }
    if (tm.tag === 'Hole') {
        const t = freshMeta(ts);
        const vt = vals_1.evaluate(freshMeta(ts), vs);
        return [vt, t];
    }
    if (tm.tag === 'Let') {
        if (tm.type) {
            const type = check(ts, vs, tm.type, vals_1.VType);
            const vt = vals_1.evaluate(type, vs);
            const val = check(ts, vs, tm.val, vt);
            const vv = vals_1.evaluate(val, vs);
            const [tr, body] = synth(list_1.Cons([tm.name, exports.Def(vt)], ts), list_1.Cons([tm.name, vv], vs), tm.body);
            return [tr, terms_1.Let(tm.name, type, tm.impl, val, body)];
        }
        else {
            const [vt, val] = synth(ts, vs, tm.val);
            const vv = vals_1.evaluate(val, vs);
            const [tr, body] = synth(list_1.Cons([tm.name, exports.Def(vt)], ts), list_1.Cons([tm.name, vv], vs), tm.body);
            return [tr, terms_1.Let(tm.name, vals_1.quote(vt, vs), tm.impl, val, body)];
        }
    }
    if (tm.tag === 'Pi') {
        const type = check(ts, vs, tm.type, vals_1.VType);
        const vt = vals_1.evaluate(type, vs);
        const body = check(list_1.Cons([tm.name, exports.Bound(vt)], ts), list_1.Cons([tm.name, true], vs), tm.body, vals_1.VType);
        return [vals_1.VType, terms_1.Pi(tm.name, type, tm.impl, body)];
    }
    return util_1.terr(`cannot synth ${terms_1.showTerm(tm)}`);
};
/*
const collect = (ts: EnvT, vs: EnvV, ty_: Val, args: [boolean, Term][]): [Val, [boolean, Term][], List<[false, Term, Val] | [true, Term]>] => {
  const ty = force(ty_);
  if (args.length === 0) return [ty, [], Nil];
  const impl = args[0][0];
  const tm = args[0][1];
  if (ty.tag === 'VPi' && ty.name === '_' && ty.impl === impl) {
    // (_:a) -> b @ c (pair up)
    const [rt, rem, rargs] = collect(ts, vs, ty.body(VType), args.slice(1));
    return [rt, rem, Cons([false, tm, ty.type], rargs)];
  }
  if (ty.tag === 'VPi' && ty.impl && !impl) {
    // {a} -> b @ c (instantiate with meta then b @ c)
    const m = freshMeta(ts);
    const vm = evaluate(m, vs);
    const [rt, rem, rargs] = collect(ts, vs, ty.body(vm), args);
    return [rt, rem, Cons([true, m], rargs)];
  }
  if (ty.tag === 'VNe' && ty.head.tag === 'Meta') {
    const x = fresh(vs, 'x');
    const pi = freshPi(ts, vs, x, impl);
    unify(Cons([x, true], vs), ty, pi);
    return collect(ts, vs, ty, args);
  }
  return [ty, args, Nil];
};

const isMeta = (ty: Val) => ty.tag === 'VNe' && ty.head.tag === 'Meta';
const APP_CHECK_ORDER: ((tm: Term, ty: Val) => boolean)[] = [
  (tm, ty) => tm.tag === 'Var' && !isMeta(ty),
  (tm, ty) => tm.tag === 'Ann' && !isMeta(ty),
  (_, ty) => !isMeta(ty),
  (tm, _) => tm.tag === 'Var',
  (tm, _) => tm.tag === 'Ann',
];
const checkOnly = (ts: EnvT, vs: EnvV, a: [Term, Val][], f: (tm: Term, ty: Val) => boolean, b: [Term, Term | null][]) => {
  for (let i = 0; i < a.length; i++) {
    const [tm, ty] = a[i];
    const fty = force(ty);
    if (f(tm, fty)) {
      const rtm = check(ts, vs, tm, fty);
      const j = b.findIndex(([t]) => t === tm);
      b[j][1] = rtm;
      a.splice(i--, 1);
    }
  }
};
const handleArgs = (ts: EnvT, vs: EnvV, args: List<[false, Term, Val] | [true, Term]>): Term[] => {
  const a = toArrayFilter(args, x => !x[0] ? [x[1], x[2]] as [Term, Val] : impossible('handleArgs'), ([b]) => !b);
  console.log('handleApp', a.map(([t, ty]) => `${showTerm(t)} : ${showTerm(quote(ty, vs))}`).join(' | '));
  const b = a.map(([t]) => [t, null] as [Term, Term | null]);
  APP_CHECK_ORDER.forEach(f => checkOnly(ts, vs, a, f, b));
  checkOnly(ts, vs, a, () => true, b);
  return b.map(([_, ty]) => ty as Term);
};
*/
const synthapp = (ts, vs, ty, impl, arg) => {
    config_1.log(() => `synthapp ${terms_1.showTerm(vals_1.quote(ty, vs))} @ ${impl ? '{' : ''}${terms_1.showTerm(arg)}${impl ? '}' : ''} in ${exports.showEnvT(ts, vs)} and ${vals_1.showEnvV(vs)}`);
    if (ty.tag === 'VPi' && ty.impl && !impl) {
        // {a} -> b @ c (instantiate with meta then b @ c)
        const m = freshMeta(ts);
        const vm = vals_1.evaluate(m, vs);
        const [rt, ft, l] = synthapp(ts, vs, ty.body(vm), impl, arg);
        return [rt, ft, list_1.Cons(m, l)];
    }
    if (ty.tag === 'VPi' && ty.impl === impl) {
        const tm = check(ts, vs, arg, ty.type);
        const vm = vals_1.evaluate(tm, vs);
        return [ty.body(vm), tm, list_1.Nil];
    }
    return util_1.terr(`unable to syntapp: ${terms_1.showTerm(vals_1.quote(ty, vs))} @ ${impl ? '{' : ''}${terms_1.showTerm(arg)}${impl ? '}' : ''}`);
};
exports.typecheck = (tm, ts = list_1.Nil, vs = list_1.Nil) => {
    const [ty, term] = synth(ts, vs, tm);
    const zty = vals_1.zonk(vs, vals_1.quote(ty, vs));
    config_1.log(() => terms_1.showTerm(term));
    const zterm = vals_1.zonk(vs, term);
    config_1.log(() => terms_1.showTerm(zterm));
    if (terms_1.containsAnyMetas(zty) || terms_1.containsAnyHoles(zty) || terms_1.containsAnyMetas(zterm) || terms_1.containsAnyHoles(zterm))
        return util_1.terr(`unsolved metas or holes: ${terms_1.showTerm(zterm)} : ${terms_1.showTerm(zty)}`);
    return [zty, zterm];
};

},{"../config":1,"../list":3,"../util":10,"./terms":6,"./unification":8,"./vals":9}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const list_1 = require("../list");
const vals_1 = require("./vals");
const terms_1 = require("./terms");
const util_1 = require("../util");
const config_1 = require("../config");
const checkSpine = (spine) => list_1.map(spine, v_ => {
    const v = vals_1.force(v_);
    if (v.tag === 'VNe' && v.head.tag === 'Var')
        return v.head.name;
    return util_1.terr(`not a var in spine`);
});
const checkSolution = (m, spine, tm) => {
    if (tm.tag === 'Var') {
        if (!list_1.contains(spine, tm.name))
            return util_1.terr(`scope error ${tm.name}`);
        return;
    }
    if (tm.tag === 'App') {
        checkSolution(m, spine, tm.left);
        checkSolution(m, spine, tm.right);
        return;
    }
    if (tm.tag === 'Type')
        return;
    if (tm.tag === 'Meta') {
        if (m === tm)
            return util_1.terr(`occurs check failed: ${terms_1.showTerm(m)}`);
        return;
    }
    if (tm.tag === 'Abs' && tm.type) {
        checkSolution(m, spine, tm.type);
        checkSolution(m, list_1.Cons(tm.name, spine), tm.body);
        return;
    }
    if (tm.tag === 'Pi') {
        checkSolution(m, spine, tm.type);
        checkSolution(m, list_1.Cons(tm.name, spine), tm.body);
        return;
    }
    return util_1.impossible(`checkSolution (${terms_1.showTerm(m)}): non-normal term: ${terms_1.showTerm(tm)}`);
};
const solve = (vs, m, spine, val) => {
    const spinex = checkSpine(spine);
    const rhs = vals_1.quote(val, vs);
    checkSolution(m, spinex, rhs);
    // TODO: solve with correct type for the parameters
    // although I don't think it matters at all
    m.val = vals_1.evaluate(list_1.foldl((x, y) => terms_1.Abs(y, terms_1.Type, false, x), rhs, spinex), list_1.Nil);
};
const eqHead = (a, b) => a === b || (a.tag === 'Var' && b.tag === 'Var' && a.name === b.name);
exports.unify = (vs, a_, b_) => {
    const a = vals_1.force(a_);
    const b = vals_1.force(b_);
    config_1.log(() => `unify ${terms_1.showTerm(vals_1.quote(a, vs))} ~ ${terms_1.showTerm(vals_1.quote(b, vs))} in ${vals_1.showEnvV(vs)}`);
    if (a.tag === 'Type' && b.tag === 'Type')
        return;
    if (a.tag === 'VAbs' && b.tag === 'VAbs' && a.impl === b.impl) {
        exports.unify(vs, a.type, b.type);
        const x = vals_1.fresh(vs, a.name);
        const vx = vals_1.VVar(x);
        exports.unify(list_1.Cons([x, true], vs), a.body(vx), b.body(vx));
        return;
    }
    if (a.tag === 'VPi' && b.tag === 'VPi' && a.impl === b.impl) {
        exports.unify(vs, a.type, b.type);
        const x = vals_1.fresh(vs, a.name);
        const vx = vals_1.VVar(x);
        exports.unify(list_1.Cons([x, true], vs), a.body(vx), b.body(vx));
        return;
    }
    if (a.tag === 'VAbs') {
        const x = vals_1.fresh(vs, a.name);
        const vx = vals_1.VVar(x);
        exports.unify(list_1.Cons([x, true], vs), a.body(vx), vals_1.vapp(b, a.impl, vx));
        return;
    }
    if (b.tag === 'VAbs') {
        const x = vals_1.fresh(vs, b.name);
        const vx = vals_1.VVar(x);
        exports.unify(list_1.Cons([x, true], vs), vals_1.vapp(a, b.impl, vx), b.body(vx));
        return;
    }
    if (a.tag === 'VNe' && b.tag === 'VNe' && a.head.tag === 'Var' && b.head.tag === 'Var' && eqHead(a.head, b.head))
        return list_1.zipWith_(([i, x], [j, y]) => exports.unify(vs, x, y), a.args, b.args);
    if (a.tag === 'VNe' && b.tag === 'VNe' && a.head.tag === 'Meta' && b.head.tag === 'Meta')
        return list_1.length(a.args) > list_1.length(b.args) ?
            solve(vs, a.head, list_1.map(a.args, ([_, v]) => v), b) :
            solve(vs, b.head, list_1.map(b.args, ([_, v]) => v), a);
    if (a.tag === 'VNe' && a.head.tag === 'Meta')
        return solve(vs, a.head, list_1.map(a.args, ([_, v]) => v), b);
    if (b.tag === 'VNe' && b.head.tag === 'Meta')
        return solve(vs, b.head, list_1.map(b.args, ([_, v]) => v), a);
    const ta = vals_1.quote(a, vs);
    const tb = vals_1.quote(b, vs);
    return util_1.terr(`cannot unify: ${terms_1.showTerm(ta)} ~ ${terms_1.showTerm(tb)}`);
};

},{"../config":1,"../list":3,"../util":10,"./terms":6,"./vals":9}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const terms_1 = require("./terms");
const list_1 = require("../list");
const util_1 = require("../util");
exports.showEnvV = (l) => list_1.toString(l, ([x, b]) => b === true ? x : `${x} = ${terms_1.showTerm(exports.quote(b, l))}`);
exports.VType = terms_1.Type;
exports.VNe = (head, args = list_1.Nil) => ({ tag: 'VNe', head, args });
exports.VAbs = (name, type, impl, body) => ({ tag: 'VAbs', name, type, impl, body });
exports.VPi = (name, type, impl, body) => ({ tag: 'VPi', name, type, impl, body });
exports.VVar = (name) => exports.VNe(terms_1.Var(name));
exports.nextName = (name) => {
    const ps = name.split('$');
    if (ps.length === 2) {
        const a = ps[0];
        const b = +ps[1];
        if (!isNaN(b))
            return `${a}\$${b + 1}`;
        return a;
    }
    return `${name}\$${0}`;
};
exports.fresh = (vs, name) => {
    if (name === '_')
        return '_';
    while (list_1.lookup(vs, name) !== null)
        name = exports.nextName(name);
    return name;
};
exports.force = (v) => {
    if (v.tag === 'VNe' && v.head.tag === 'Meta' && v.head.val)
        return exports.force(list_1.foldr(([i, x], y) => exports.vapp(y, i, x), v.head.val, v.args));
    return v;
};
exports.vapp = (a, impl, b) => {
    if (a.tag === 'VAbs')
        return a.body(b);
    if (a.tag === 'VNe')
        return exports.VNe(a.head, list_1.Cons([impl, b], a.args));
    return util_1.impossible('vapp');
};
exports.evaluate = (t, vs = list_1.Nil) => {
    if (t.tag === 'Type')
        return t;
    if (t.tag === 'Var') {
        const v = list_1.lookup(vs, t.name);
        return v === true ? exports.VVar(t.name) : v !== null ? v : util_1.impossible(`evaluate ${t.name}`);
    }
    if (t.tag === 'App')
        return exports.vapp(exports.evaluate(t.left, vs), t.impl, exports.evaluate(t.right, vs));
    if (t.tag === 'Abs' && t.type)
        return exports.VAbs(t.name, exports.evaluate(t.type, vs), t.impl, v => exports.evaluate(t.body, list_1.Cons([t.name, v], vs)));
    if (t.tag === 'Pi')
        return exports.VPi(t.name, exports.evaluate(t.type, vs), t.impl, v => exports.evaluate(t.body, list_1.Cons([t.name, v], vs)));
    if (t.tag === 'Let')
        return exports.evaluate(t.body, list_1.Cons([t.name, exports.evaluate(t.val)], vs));
    if (t.tag === 'Meta')
        return t.val || exports.VNe(t);
    return util_1.impossible('evaluate');
};
exports.quote = (v_, vs = list_1.Nil) => {
    const v = exports.force(v_);
    if (v.tag === 'Type')
        return v;
    if (v.tag === 'VNe')
        return list_1.foldr(([impl, x], y) => terms_1.App(y, impl, exports.quote(x, vs)), v.head, v.args);
    if (v.tag === 'VAbs') {
        const x = exports.fresh(vs, v.name);
        return terms_1.Abs(x, exports.quote(v.type, vs), v.impl, exports.quote(v.body(exports.VVar(x)), list_1.Cons([x, true], vs)));
    }
    if (v.tag === 'VPi') {
        const x = exports.fresh(vs, v.name);
        return terms_1.Pi(x, exports.quote(v.type, vs), v.impl, exports.quote(v.body(exports.VVar(x)), list_1.Cons([x, true], vs)));
    }
    return v;
};
const zonkSpine = (vs, tm) => {
    if (tm.tag === 'Meta' && tm.val)
        return [false, tm.val];
    if (tm.tag === 'App') {
        const spine = zonkSpine(vs, tm.left);
        return spine[0] ?
            [true, terms_1.App(spine[1], tm.impl, exports.zonk(vs, tm.right))] :
            [false, exports.vapp(spine[1], tm.impl, exports.evaluate(tm.right, vs))];
    }
    return [true, exports.zonk(vs, tm)];
};
exports.zonk = (vs, tm) => {
    if (tm.tag === 'Meta')
        return tm.val ? exports.quote(tm.val, vs) : tm;
    if (tm.tag === 'Pi')
        return terms_1.Pi(tm.name, exports.zonk(vs, tm.type), tm.impl, exports.zonk(list_1.Cons([tm.name, true], vs), tm.body));
    if (tm.tag === 'Abs')
        return terms_1.Abs(tm.name, tm.type ? exports.zonk(vs, tm.type) : null, tm.impl, exports.zonk(list_1.Cons([tm.name, true], vs), tm.body));
    if (tm.tag === 'Let')
        return terms_1.Let(tm.name, tm.type ? exports.zonk(vs, tm.type) : null, tm.impl, exports.zonk(vs, tm.val), exports.zonk(list_1.Cons([tm.name, true], vs), tm.body));
    if (tm.tag === 'Ann')
        return terms_1.Ann(exports.zonk(vs, tm.term), tm.type);
    if (tm.tag === 'App') {
        const spine = zonkSpine(vs, tm.left);
        return spine[0] ?
            terms_1.App(spine[1], tm.impl, exports.zonk(vs, tm.right)) :
            exports.quote(exports.vapp(spine[1], tm.impl, exports.evaluate(tm.right, vs)), vs);
    }
    return tm;
};
// only use this with elaborated terms
exports.normalize = (t, vs = list_1.Nil) => exports.quote(exports.evaluate(t, vs), vs);

},{"../list":3,"../util":10,"./terms":6}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.impossible = (msg) => {
    throw new Error(`impossible: ${msg}`);
};
exports.terr = (msg) => {
    throw new TypeError(msg);
};

},{}],11:[function(require,module,exports){
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

},{"./repl":4}]},{},[11]);
