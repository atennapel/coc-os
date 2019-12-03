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

},{}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Nothing = { tag: 'Nothing' };
exports.Just = (val) => ({ tag: 'Just', val });
exports.caseMaybe = (m, f, d) => m.tag === 'Just' ? f(m.val) : d();

},{}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const list_1 = require("./list");
const nextName = (x) => {
    const s = x.split('$');
    if (s.length === 2)
        return `${s[0]}\$${+s[1] + 1}`;
    return `${x}\$0`;
};
exports.freshName = (vs, name) => {
    if (name === '_')
        return '_';
    while (list_1.lookup(vs, name) !== null)
        name = nextName(name);
    return name;
};

},{"./list":2}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./surface/parser");
const config_1 = require("./config");
const syntax_1 = require("./surface/syntax");
const elaborate_1 = require("./surface/elaborate");
const vals_1 = require("./surface/vals");
exports.initREPL = () => {
};
exports.runREPL = (_s, _cb) => {
    if (_s === ':debug' || _s === ':d') {
        config_1.setConfig({ debug: !config_1.config.debug });
        return _cb(`debug: ${config_1.config.debug}`);
    }
    let msg = '';
    let tm_;
    try {
        const t = parser_1.parse(_s);
        config_1.log(() => syntax_1.showTerm(t));
        const [tm, ty] = elaborate_1.elaborate(t);
        tm_ = tm;
        config_1.log(() => syntax_1.showTerm(ty));
        config_1.log(() => syntax_1.showTerm(tm));
        msg += `type: ${syntax_1.showTerm(ty)}\nterm: ${syntax_1.showTerm(tm)}`;
    }
    catch (err) {
        config_1.log(() => '' + err);
        return _cb('' + err, true);
    }
    try {
        const n = vals_1.normalize(tm_);
        config_1.log(() => syntax_1.showTerm(n));
        msg += '\nnorm: ' + syntax_1.showTerm(n);
        return _cb(msg);
    }
    catch (err) {
        config_1.log(() => '' + err);
        msg += '\n' + err;
        return _cb(msg);
    }
};

},{"./config":1,"./surface/elaborate":6,"./surface/parser":8,"./surface/syntax":9,"./surface/vals":11}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const list_1 = require("../list");
const names_1 = require("../names");
const vals_1 = require("./vals");
const syntax_1 = require("./syntax");
const metas_1 = require("./metas");
const config_1 = require("../config");
const maybe_1 = require("../maybe");
const util_1 = require("../util");
const unify_1 = require("./unify");
exports.Bound = (type) => ({ bound: true, type });
exports.Def = (type) => ({ bound: false, type });
exports.showEnvT = (l, vs) => list_1.toString(l, ([x, b]) => `${x} :${b.bound ? '' : '='} ${syntax_1.showTerm(vals_1.quote(b.type, vs))}`);
const newMeta = (ts) => {
    const spine = list_1.map(list_1.filter(ts, ([x, { bound }]) => bound), ([x, _]) => syntax_1.Var(x));
    return list_1.foldr((x, y) => syntax_1.App(y, x), metas_1.freshMeta(), spine);
};
const check = (ts, vs, tm, ty_) => {
    const ty = vals_1.force(ty_);
    config_1.log(() => `check ${syntax_1.showTerm(tm)} : ${syntax_1.showTerm(vals_1.quote(ty, vs))} in ${exports.showEnvT(ts, vs)} and ${vals_1.showEnvV(vs)}`);
    if (ty.tag === 'VType' && tm.tag === 'Type')
        return syntax_1.Type;
    if (tm.tag === 'Abs' && !tm.type && ty.tag === 'VPi') {
        const x = names_1.freshName(vs, ty.name);
        const vx = vals_1.VVar(x);
        const body = check(list_1.Cons([tm.name, exports.Bound(ty.type)], ts), list_1.Cons([tm.name, maybe_1.Just(vx)], vs), tm.body, ty.body(vx));
        return syntax_1.Abs(tm.name, vals_1.quote(ty.type, vs), body);
    }
    if (tm.tag === 'Hole')
        return newMeta(ts);
    if (tm.tag === 'Let') {
        const [vt, val] = synth(ts, vs, tm.val);
        const vv = vals_1.evaluate(val, vs);
        const body = check(list_1.Cons([tm.name, exports.Def(vt)], ts), list_1.Cons([tm.name, maybe_1.Just(vv)], vs), tm.body, ty);
        return syntax_1.Let(tm.name, val, body);
    }
    const [ty2, term] = synth(ts, vs, tm);
    unify_1.unify(vs, ty2, ty);
    return term;
};
const freshPi = (ts, vs, x) => {
    const a = newMeta(ts);
    const va = vals_1.evaluate(a, vs);
    const b = newMeta(list_1.Cons([x, exports.Bound(va)], ts));
    return vals_1.VPi(x, va, v => vals_1.evaluate(b, list_1.Cons([x, maybe_1.Just(v)], vs)));
};
const synth = (ts, vs, tm) => {
    config_1.log(() => `synth ${syntax_1.showTerm(tm)} in ${exports.showEnvT(ts, vs)} and ${vals_1.showEnvV(vs)}`);
    if (tm.tag === 'Type')
        return [vals_1.VType, tm];
    if (tm.tag === 'Var') {
        if (tm.name === '_')
            return util_1.terr(`invalid name _`);
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
        const [fn, fntm] = synth(ts, vs, tm.left);
        const [rt, res] = synthapp(ts, vs, fn, tm.right);
        return [rt, syntax_1.App(fntm, res)];
    }
    if (tm.tag === 'Abs') {
        if (tm.type) {
            const type = check(ts, vs, tm.type, vals_1.VType);
            const vt = vals_1.evaluate(type, vs);
            const [rt, body] = synth(list_1.Cons([tm.name, exports.Bound(vt)], ts), list_1.Cons([tm.name, maybe_1.Nothing], vs), tm.body);
            return [
                vals_1.evaluate(syntax_1.Pi(tm.name, tm.type, vals_1.quote(rt, list_1.Cons([tm.name, maybe_1.Nothing], vs))), vs),
                syntax_1.Abs(tm.name, type, body),
            ];
        }
        else {
            const pi = freshPi(ts, vs, tm.name);
            const term = check(ts, vs, tm, pi);
            return [pi, term];
        }
    }
    if (tm.tag === 'Hole') {
        const t = newMeta(ts);
        const vt = vals_1.evaluate(newMeta(ts), vs);
        return [vt, t];
    }
    if (tm.tag === 'Let') {
        const [vt, val] = synth(ts, vs, tm.val);
        const vv = vals_1.evaluate(val, vs);
        const [tr, body] = synth(list_1.Cons([tm.name, exports.Def(vt)], ts), list_1.Cons([tm.name, maybe_1.Just(vv)], vs), tm.body);
        return [tr, syntax_1.Let(tm.name, val, body)];
    }
    if (tm.tag === 'Pi') {
        const type = check(ts, vs, tm.type, vals_1.VType);
        const vt = vals_1.evaluate(type, vs);
        const body = check(list_1.Cons([tm.name, exports.Bound(vt)], ts), list_1.Cons([tm.name, maybe_1.Nothing], vs), tm.body, vals_1.VType);
        return [vals_1.VType, syntax_1.Pi(tm.name, type, body)];
    }
    return util_1.terr(`cannot synth ${syntax_1.showTerm(tm)}`);
};
const synthapp = (ts, vs, ty_, arg) => {
    const ty = vals_1.force(ty_);
    config_1.log(() => `synthapp ${syntax_1.showTerm(vals_1.quote(ty, vs))} @ ${syntax_1.showTerm(arg)} in ${exports.showEnvT(ts, vs)} and ${vals_1.showEnvV(vs)}`);
    if (ty.tag === 'VPi') {
        const tm = check(ts, vs, arg, ty.type);
        const vm = vals_1.evaluate(tm, vs);
        return [ty.body(vm), tm];
    }
    if (ty.tag === 'VNe' && ty.head.tag === 'HMeta') {
        const pi = freshPi(ts, vs, 'x'); // x or fresh??
        unify_1.unify(vs, ty, pi);
        return synthapp(ts, vs, pi, arg);
    }
    return util_1.terr(`unable to syntapp: ${syntax_1.showTerm(vals_1.quote(ty, vs))} @ ${syntax_1.showTerm(arg)}`);
};
exports.elaborate = (tm, ts = list_1.Nil, vs = list_1.Nil) => {
    metas_1.resetMetas();
    const [ty, term] = synth(ts, vs, tm);
    const zty = vals_1.zonk(vs, vals_1.quote(ty, vs));
    config_1.log(() => syntax_1.showTerm(term));
    const zterm = vals_1.zonk(vs, term);
    config_1.log(() => syntax_1.showTerm(zterm));
    return [zty, zterm];
};

},{"../config":1,"../list":2,"../maybe":3,"../names":4,"../util":12,"./metas":7,"./syntax":9,"./unify":10,"./vals":11}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const syntax_1 = require("./syntax");
const util_1 = require("../util");
let metas = [];
exports.resetMetas = () => { metas = []; };
exports.getMeta = (id) => {
    const s = metas[id] || null;
    if (!s)
        return util_1.impossible(`undefined meta ?${id} in getSolvedMeta`);
    return s;
};
exports.setMeta = (id, val) => {
    metas[id] = { tag: 'Solved', val };
};
exports.freshMetaId = () => {
    const id = metas.length;
    metas[id] = { tag: 'Unsolved' };
    return id;
};
exports.freshMeta = () => syntax_1.Meta(exports.freshMetaId());

},{"../util":12,"./syntax":9}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util");
const syntax_1 = require("./syntax");
const config_1 = require("../config");
const TName = (name) => ({ tag: 'Name', name });
const TList = (list) => ({ tag: 'List', list });
const matchingBracket = (c) => {
    if (c === '(')
        return ')';
    if (c === ')')
        return '(';
    return util_1.serr(`invalid bracket: ${c}`);
};
const SYM1 = ['\\', ':', '/', '.', '*'];
const SYM2 = ['->'];
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
                    return util_1.serr(`unmatched bracket: ${c}`);
                const br = b.pop();
                if (matchingBracket(br) !== c)
                    return util_1.serr(`unmatched bracket: ${br} and ${c}`);
                const a = p.pop();
                a.push(TList(r));
                r = a;
            }
            else if (/\s/.test(c))
                continue;
            else
                return util_1.serr(`invalid char ${c} in tokenize`);
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
        return util_1.serr(`unclosed brackets: ${b.join(' ')}`);
    if (state !== START && state !== COMMENT)
        return util_1.serr('invalid tokenize end state');
    if (esc)
        return util_1.serr(`escape is true after tokenize`);
    return r;
};
/*
TODO:
{ tag: 'App', left: Term, right: Term }
{ tag: 'Abs', name: Name, type: Term | null, body: Term }
{ tag: 'Pi', name: Name, type: Term, body: Term }
{ tag: 'Let', name: Name, val: Term, body: Term }
{ tag: 'Ann', term: Term, type: Term }
*/
const expr = (t) => {
    if (t.tag === 'List')
        return exprs(t.list);
    if (t.tag === 'Name') {
        const x = t.name;
        if (x === '*')
            return syntax_1.Type;
        if (x === '_')
            return syntax_1.Hole;
        if (/[a-z]/i.test(x[0]))
            return syntax_1.Var(x);
        return util_1.serr(`invalid name: ${x}`);
    }
    return t;
};
const exprs = (ts) => {
    if (ts.length === 0)
        return syntax_1.Var('Unit');
    if (ts.length === 1)
        return expr(ts[0]);
    if (ts[0].tag === 'Name' && ts[0].name === '\\') {
        const args = [];
        let found = false;
        let i = 1;
        for (; i < ts.length; i++) {
            const c = ts[i];
            if (c.tag === 'Name' && c.name === '.') {
                found = true;
                break;
            }
            if (c.tag === 'Name')
                args.push(c.name);
            return util_1.serr('invalid lambda arg');
        }
        if (!found)
            return util_1.serr(`. not found after \\`);
        const body = exprs(ts.slice(i));
        return args.reduceRight((x, y) => syntax_1.Abs(y, null, x), body);
    }
    return ts.map(expr).reduce(syntax_1.App);
};
exports.parse = (s) => {
    const ts = tokenize(s);
    config_1.log(() => ts);
    return exprs(ts);
};

},{"../config":1,"../util":12,"./syntax":9}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Var = (name) => ({ tag: 'Var', name });
exports.App = (left, right) => ({ tag: 'App', left, right });
exports.Abs = (name, type, body) => ({ tag: 'Abs', name, type, body });
exports.Pi = (name, type, body) => ({ tag: 'Pi', name, type, body });
exports.Let = (name, val, body) => ({ tag: 'Let', name, val, body });
exports.Ann = (term, type) => ({ tag: 'Ann', term, type });
exports.Type = { tag: 'Type' };
exports.Hole = { tag: 'Hole' };
exports.Meta = (id) => ({ tag: 'Meta', id });
exports.showTerm = (t) => {
    if (t.tag === 'Var')
        return t.name;
    if (t.tag === 'App')
        return `(${exports.showTerm(t.left)} ${exports.showTerm(t.right)})`;
    if (t.tag === 'Abs')
        return t.type ?
            `(\\(${t.name} : ${exports.showTerm(t.type)}). ${exports.showTerm(t.body)})` :
            `(\\${t.name}. ${exports.showTerm(t.body)})`;
    if (t.tag === 'Pi')
        return `((${t.name} : ${exports.showTerm(t.type)}) -> ${exports.showTerm(t.body)})`;
    if (t.tag === 'Let')
        return `(let ${t.name} = ${exports.showTerm(t.val)} in ${exports.showTerm(t.body)})`;
    if (t.tag === 'Ann')
        return `(${exports.showTerm(t.term)} : ${exports.showTerm(t.type)})`;
    if (t.tag === 'Type')
        return `*`;
    if (t.tag === 'Hole')
        return `_`;
    if (t.tag === 'Meta')
        return `?${t.id}`;
    return t;
};

},{}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const names_1 = require("../names");
const list_1 = require("../list");
const vals_1 = require("./vals");
const util_1 = require("../util");
const syntax_1 = require("./syntax");
const config_1 = require("../config");
const maybe_1 = require("../maybe");
const metas_1 = require("./metas");
const checkSpine = (spine) => list_1.map(spine, v_ => {
    const v = vals_1.force(v_);
    if (v.tag === 'VNe' && v.head.tag === 'HVar')
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
        if (m === tm.id)
            return util_1.terr(`occurs check failed: ${syntax_1.showTerm(tm)}`);
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
    return util_1.impossible(`checkSolution (?${m}): non-normal term: ${syntax_1.showTerm(tm)}`);
};
const solve = (vs, m, spine, val) => {
    const spinex = checkSpine(spine);
    const rhs = vals_1.quote(val, vs);
    checkSolution(m, spinex, rhs);
    const solution = vals_1.evaluate(list_1.foldl((x, y) => syntax_1.Abs(y, syntax_1.Type, x), rhs, spinex), list_1.Nil);
    metas_1.setMeta(m, solution);
};
exports.unify = (vs, a_, b_) => {
    const a = vals_1.force(a_);
    const b = vals_1.force(b_);
    config_1.log(() => `unify ${syntax_1.showTerm(vals_1.quote(a, vs))} ~ ${syntax_1.showTerm(vals_1.quote(b, vs))} in ${vals_1.showEnvV(vs)}`);
    if (a.tag === 'VType' && b.tag === 'VType')
        return;
    if (a.tag === 'VAbs' && b.tag === 'VAbs') {
        exports.unify(vs, a.type, b.type);
        const x = names_1.freshName(vs, a.name);
        const vx = vals_1.VVar(x);
        exports.unify(list_1.Cons([x, maybe_1.Nothing], vs), a.body(vx), b.body(vx));
        return;
    }
    if (a.tag === 'VPi' && b.tag === 'VPi') {
        exports.unify(vs, a.type, b.type);
        const x = names_1.freshName(vs, a.name);
        const vx = vals_1.VVar(x);
        exports.unify(list_1.Cons([x, maybe_1.Nothing], vs), a.body(vx), b.body(vx));
        return;
    }
    if (a.tag === 'VAbs') {
        const x = names_1.freshName(vs, a.name);
        const vx = vals_1.VVar(x);
        exports.unify(list_1.Cons([x, maybe_1.Nothing], vs), a.body(vx), vals_1.vapp(b, vx));
        return;
    }
    if (b.tag === 'VAbs') {
        const x = names_1.freshName(vs, b.name);
        const vx = vals_1.VVar(x);
        exports.unify(list_1.Cons([x, maybe_1.Nothing], vs), vals_1.vapp(a, vx), b.body(vx));
        return;
    }
    if (a.tag === 'VNe' && b.tag === 'VNe' && a.head.tag === 'HVar' && b.head.tag === 'HVar' && a.head.name === b.head.name)
        return list_1.zipWith_((x, y) => exports.unify(vs, x, y), a.args, b.args);
    if (a.tag === 'VNe' && b.tag === 'VNe' && a.head.tag === 'HMeta' && b.head.tag === 'HMeta')
        return list_1.length(a.args) > list_1.length(b.args) ?
            solve(vs, a.head.id, a.args, b) :
            solve(vs, b.head.id, b.args, a);
    if (a.tag === 'VNe' && a.head.tag === 'HMeta')
        return solve(vs, a.head.id, a.args, b);
    if (b.tag === 'VNe' && b.head.tag === 'HMeta')
        return solve(vs, b.head.id, b.args, a);
    const ta = vals_1.quote(a, vs);
    const tb = vals_1.quote(b, vs);
    return util_1.terr(`cannot unify: ${syntax_1.showTerm(ta)} ~ ${syntax_1.showTerm(tb)}`);
};

},{"../config":1,"../list":2,"../maybe":3,"../names":4,"../util":12,"./metas":7,"./syntax":9,"./vals":11}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const list_1 = require("../list");
const names_1 = require("../names");
const metas_1 = require("./metas");
const maybe_1 = require("../maybe");
const syntax_1 = require("./syntax");
const util_1 = require("../util");
exports.showEnvV = (l) => list_1.toString(l, ([x, b]) => maybe_1.caseMaybe(b, val => `${x} = ${syntax_1.showTerm(exports.quote(val, l))}`, () => x));
exports.HVar = (name) => ({ tag: 'HVar', name });
exports.HMeta = (id) => ({ tag: 'HMeta', id });
exports.VNe = (head, args = list_1.Nil) => ({ tag: 'VNe', head, args });
exports.VAbs = (name, type, body) => ({ tag: 'VAbs', name, type, body });
exports.VPi = (name, type, body) => ({ tag: 'VPi', name, type, body });
exports.VType = { tag: 'VType' };
exports.VVar = (name) => exports.VNe(exports.HVar(name));
exports.VMeta = (id) => exports.VNe(exports.HMeta(id));
exports.force = (v) => {
    if (v.tag === 'VNe' && v.head.tag === 'HMeta') {
        const val = metas_1.getMeta(v.head.id);
        if (val.tag === 'Unsolved')
            return v;
        return exports.force(list_1.foldr((x, y) => exports.vapp(y, x), val.val, v.args));
    }
    return v;
};
exports.vapp = (a, b) => {
    if (a.tag === 'VAbs')
        return a.body(b);
    if (a.tag === 'VNe')
        return exports.VNe(a.head, list_1.Cons(b, a.args));
    return util_1.impossible('vapp');
};
exports.evaluate = (t, vs = list_1.Nil) => {
    if (t.tag === 'Type')
        return exports.VType;
    if (t.tag === 'Var') {
        const v = list_1.lookup(vs, t.name);
        if (!v)
            return util_1.impossible(`evaluate ${t.name}`);
        return maybe_1.caseMaybe(v, v => v, () => exports.VVar(t.name));
    }
    if (t.tag === 'App')
        return exports.vapp(exports.evaluate(t.left, vs), exports.evaluate(t.right, vs));
    if (t.tag === 'Abs' && t.type)
        return exports.VAbs(t.name, exports.evaluate(t.type, vs), v => exports.evaluate(t.body, list_1.Cons([t.name, maybe_1.Just(v)], vs)));
    if (t.tag === 'Pi')
        return exports.VPi(t.name, exports.evaluate(t.type, vs), v => exports.evaluate(t.body, list_1.Cons([t.name, maybe_1.Just(v)], vs)));
    if (t.tag === 'Let')
        return exports.evaluate(t.body, list_1.Cons([t.name, maybe_1.Just(exports.evaluate(t.val, vs))], vs));
    if (t.tag === 'Meta') {
        const s = metas_1.getMeta(t.id);
        return s.tag === 'Solved' ? s.val : exports.VMeta(t.id);
    }
    return util_1.impossible('evaluate');
};
exports.quote = (v_, vs) => {
    const v = exports.force(v_);
    if (v.tag === 'VType')
        return syntax_1.Type;
    if (v.tag === 'VNe') {
        const h = v.head;
        return list_1.foldr((x, y) => syntax_1.App(y, exports.quote(x, vs)), h.tag === 'HVar' ? syntax_1.Var(h.name) : syntax_1.Meta(h.id), v.args);
    }
    if (v.tag === 'VAbs') {
        const x = names_1.freshName(vs, v.name);
        return syntax_1.Abs(x, exports.quote(v.type, vs), exports.quote(v.body(exports.VVar(x)), list_1.Cons([x, maybe_1.Nothing], vs)));
    }
    if (v.tag === 'VPi') {
        const x = names_1.freshName(vs, v.name);
        return syntax_1.Pi(x, exports.quote(v.type, vs), exports.quote(v.body(exports.VVar(x)), list_1.Cons([x, maybe_1.Nothing], vs)));
    }
    return v;
};
const zonkSpine = (vs, tm) => {
    if (tm.tag === 'Meta') {
        const s = metas_1.getMeta(tm.id);
        if (s.tag === 'Unsolved')
            return [true, exports.zonk(vs, tm)];
        return [false, s.val];
    }
    if (tm.tag === 'App') {
        const spine = zonkSpine(vs, tm.left);
        return spine[0] ?
            [true, syntax_1.App(spine[1], exports.zonk(vs, tm.right))] :
            [false, exports.vapp(spine[1], exports.evaluate(tm.right, vs))];
    }
    return [true, exports.zonk(vs, tm)];
};
exports.zonk = (vs, tm) => {
    if (tm.tag === 'Meta') {
        const s = metas_1.getMeta(tm.id);
        return s.tag === 'Solved' ? exports.quote(s.val, vs) : tm;
    }
    if (tm.tag === 'Pi')
        return syntax_1.Pi(tm.name, exports.zonk(vs, tm.type), exports.zonk(list_1.Cons([tm.name, maybe_1.Nothing], vs), tm.body));
    if (tm.tag === 'Abs')
        return syntax_1.Abs(tm.name, tm.type ? exports.zonk(vs, tm.type) : null, exports.zonk(list_1.Cons([tm.name, maybe_1.Nothing], vs), tm.body));
    if (tm.tag === 'Let')
        return syntax_1.Let(tm.name, exports.zonk(vs, tm.val), exports.zonk(list_1.Cons([tm.name, maybe_1.Nothing], vs), tm.body));
    if (tm.tag === 'Ann')
        return syntax_1.Ann(exports.zonk(vs, tm.term), tm.type);
    if (tm.tag === 'App') {
        const spine = zonkSpine(vs, tm.left);
        return spine[0] ?
            syntax_1.App(spine[1], exports.zonk(vs, tm.right)) :
            exports.quote(exports.vapp(spine[1], exports.evaluate(tm.right, vs)), vs);
    }
    return tm;
};
// only use this with elaborated terms
exports.normalize = (t, vs = list_1.Nil) => exports.quote(exports.evaluate(t, vs), vs);

},{"../list":2,"../maybe":3,"../names":4,"../util":12,"./metas":7,"./syntax":9}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.impossible = (msg) => {
    throw new Error(`impossible: ${msg}`);
};
exports.terr = (msg) => {
    throw new TypeError(msg);
};
exports.serr = (msg) => {
    throw new SyntaxError(msg);
};

},{}],13:[function(require,module,exports){
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

},{"./repl":5}]},{},[13]);
