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
const S = require("../surface/syntax");
const util_1 = require("../util");
exports.Var = (index) => ({ tag: 'Var', index });
exports.Global = (name) => ({ tag: 'Global', name });
exports.App = (left, plicity, right) => ({ tag: 'App', left, plicity, right });
exports.Abs = (plicity, type, body) => ({ tag: 'Abs', plicity, type, body });
exports.Let = (plicity, val, body) => ({ tag: 'Let', plicity, val, body });
exports.Roll = (type, term) => ({ tag: 'Roll', type, term });
exports.Unroll = (term) => ({ tag: 'Unroll', term });
exports.Pi = (plicity, type, body) => ({ tag: 'Pi', plicity, type, body });
exports.Fix = (type, body) => ({ tag: 'Fix', type, body });
exports.Type = { tag: 'Type' };
exports.Assert = (type, term) => ({ tag: 'Assert', type, term });
exports.showTerm = (t) => {
    if (t.tag === 'Var')
        return `${t.index}`;
    if (t.tag === 'Global')
        return t.name;
    if (t.tag === 'App')
        return `(${exports.showTerm(t.left)} ${t.plicity.erased ? '-' : ''}${exports.showTerm(t.right)})`;
    if (t.tag === 'Abs')
        return `(\\${t.plicity.erased ? '-' : ''}${exports.showTerm(t.type)}. ${exports.showTerm(t.body)})`;
    if (t.tag === 'Let')
        return `(let ${t.plicity.erased ? '-' : ''}${exports.showTerm(t.val)} in ${exports.showTerm(t.body)})`;
    if (t.tag === 'Roll')
        return `(roll ${exports.showTerm(t.type)} ${exports.showTerm(t.term)})`;
    if (t.tag === 'Unroll')
        return `(unroll ${exports.showTerm(t.term)})`;
    if (t.tag === 'Pi')
        return `(/${t.plicity.erased ? '-' : ''}${exports.showTerm(t.type)}. ${exports.showTerm(t.body)})`;
    if (t.tag === 'Fix')
        return `(fix ${exports.showTerm(t.type)}. ${exports.showTerm(t.body)})`;
    if (t.tag === 'Type')
        return '*';
    if (t.tag === 'Assert')
        return `(assert ${exports.showTerm(t.type)} ${exports.showTerm(t.term)})`;
    return t;
};
exports.toCore = (t) => {
    if (t.tag === 'Var')
        return exports.Var(t.index);
    if (t.tag === 'Global')
        return exports.Global(t.name);
    if (t.tag === 'App')
        return exports.App(exports.toCore(t.left), t.plicity, exports.toCore(t.right));
    if (t.tag === 'Abs' && t.type)
        return exports.Abs(t.plicity, exports.toCore(t.type), exports.toCore(t.body));
    if (t.tag === 'Let')
        return exports.Let(t.plicity, exports.toCore(t.val), exports.toCore(t.body));
    if (t.tag === 'Roll' && t.type)
        return exports.Roll(exports.toCore(t.type), exports.toCore(t.term));
    if (t.tag === 'Unroll')
        return exports.Unroll(exports.toCore(t.term));
    if (t.tag === 'Pi')
        return exports.Pi(t.plicity, exports.toCore(t.type), exports.toCore(t.body));
    if (t.tag === 'Fix')
        return exports.Fix(exports.toCore(t.type), exports.toCore(t.body));
    if (t.tag === 'Type')
        return exports.Type;
    return util_1.impossible(`toCore failed on ${S.showTerm(t)}`);
};

},{"../surface/syntax":13,"../util":18}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const syntax_1 = require("./syntax");
exports.DDef = (name, value) => ({ tag: 'DDef', name, value });
exports.showDef = (d) => {
    if (d.tag === 'DDef')
        return `def ${d.name} = ${syntax_1.showTerm(d.value)}`;
    return d.tag;
};

},{"./syntax":16}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lazy = (fn) => ({ fn, val: null, forced: false });
exports.forceLazy = (lazy) => {
    if (lazy.forced)
        return lazy.val;
    const v = lazy.fn();
    lazy.val = v;
    lazy.forced = true;
    return v;
};
exports.mapLazy = (lazy, fn) => exports.Lazy(() => fn(exports.forceLazy(lazy)));

},{}],5:[function(require,module,exports){
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
exports.consAll = (hs, b) => exports.append(exports.listFrom(hs), b);
exports.map = (l, fn) => l.tag === 'Cons' ? exports.Cons(fn(l.head), exports.map(l.tail, fn)) : l;
exports.mapIndex = (l, fn, i = 0) => l.tag === 'Cons' ? exports.Cons(fn(i, l.head), exports.mapIndex(l.tail, fn, i + 1)) : l;
exports.index = (l, i) => {
    while (l.tag === 'Cons') {
        if (i-- === 0)
            return l.head;
        l = l.tail;
    }
    return null;
};
exports.indexOf = (l, x) => {
    let i = 0;
    while (l.tag === 'Cons') {
        if (l.head === x)
            return i;
        l = l.tail;
        i++;
    }
    return -1;
};
exports.indecesOf = (l, val) => {
    const a = [];
    let i = 0;
    while (l.tag === 'Cons') {
        if (l.head === val)
            a.push(i);
        l = l.tail;
        i++;
    }
    return a;
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
exports.zipWithR_ = (f, la, lb) => {
    if (la.tag === 'Cons' && lb.tag === 'Cons') {
        exports.zipWith_(f, la.tail, lb.tail);
        f(la.head, lb.head);
    }
};
exports.and = (l) => l.tag === 'Nil' ? true : l.head && exports.and(l.tail);
exports.range = (n) => n <= 0 ? exports.Nil : exports.Cons(n - 1, exports.range(n - 1));
exports.contains = (l, v) => l.tag === 'Cons' ? (l.head === v || exports.contains(l.tail, v)) : false;
exports.max = (l) => exports.foldl((a, b) => b > a ? b : a, Number.MIN_SAFE_INTEGER, l);

},{}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextName = (x) => {
    if (x === '_')
        return x;
    const s = x.split('$');
    if (s.length === 2)
        return `${s[0]}\$${+s[1] + 1}`;
    return `${x}\$0`;
};

},{}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const syntax_1 = require("./syntax");
const definitions_1 = require("./definitions");
const matchingBracket = (c) => {
    if (c === '(')
        return ')';
    if (c === ')')
        return '(';
    if (c === '{')
        return '}';
    if (c === '}')
        return '{';
    return util_1.serr(`invalid bracket: ${c}`);
};
const TName = (name) => ({ tag: 'Name', name });
const TNum = (num) => ({ tag: 'Num', num });
const TList = (list, bracket) => ({ tag: 'List', list, bracket });
const SYM1 = ['\\', ':', '/', '.', '*', '='];
const SYM2 = ['->'];
const START = 0;
const NAME = 1;
const COMMENT = 2;
const NUMBER = 3;
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
            else if (c + next === '--')
                i++, state = COMMENT;
            else if (/[\_a-z]/i.test(c))
                t += c, state = NAME;
            else if (/[0-9]/.test(c))
                t += c, state = NUMBER;
            else if (c === '(' || c === '{')
                b.push(c), p.push(r), r = [];
            else if (c === ')' || c === '}') {
                if (b.length === 0)
                    return util_1.serr(`unmatched bracket: ${c}`);
                const br = b.pop();
                if (matchingBracket(br) !== c)
                    return util_1.serr(`unmatched bracket: ${br} and ${c}`);
                const a = p.pop();
                a.push(TList(r, br));
                r = a;
            }
            else if (/\s/.test(c))
                continue;
            else
                return util_1.serr(`invalid char ${c} in tokenize`);
        }
        else if (state === NAME) {
            if (!/[\@a-z0-9\_]/i.test(c)) {
                r.push(TName(t));
                t = '', i--, state = START;
            }
            else
                t += c;
        }
        else if (state === NUMBER) {
            if (!/[0-9a-z]/i.test(c)) {
                r.push(TNum(t));
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
const tunit = syntax_1.Var('UnitType');
const unit = syntax_1.Var('Unit');
const isName = (t, x) => t.tag === 'Name' && t.name === x;
const isNames = (t) => t.map(x => {
    if (x.tag !== 'Name')
        return util_1.serr(`expected name`);
    return x.name;
});
const splitTokens = (a, fn) => {
    const r = [];
    let t = [];
    for (let i = 0, l = a.length; i < l; i++) {
        const c = a[i];
        if (fn(c)) {
            r.push(t);
            t = [];
        }
        else
            t.push(c);
    }
    r.push(t);
    return r;
};
const lambdaParams = (t) => {
    if (t.tag === 'Name')
        return [[t.name, false, null]];
    if (t.tag === 'List') {
        const impl = t.bracket === '{';
        const a = t.list;
        if (a.length === 0)
            return [['_', impl, tunit]];
        const i = a.findIndex(v => v.tag === 'Name' && v.name === ':');
        if (i === -1)
            return isNames(a).map(x => [x, impl, null]);
        const ns = a.slice(0, i);
        const rest = a.slice(i + 1);
        const ty = exprs(rest, '(');
        return isNames(ns).map(x => [x, impl, ty]);
    }
    return util_1.serr(`invalid lambda param`);
};
const piParams = (t) => {
    if (t.tag === 'Name')
        return [['_', false, expr(t)[0]]];
    if (t.tag === 'List') {
        const impl = t.bracket === '{';
        const a = t.list;
        if (a.length === 0)
            return [['_', impl, tunit]];
        const i = a.findIndex(v => v.tag === 'Name' && v.name === ':');
        if (i === -1)
            return [['_', impl, expr(t)[0]]];
        const ns = a.slice(0, i);
        const rest = a.slice(i + 1);
        const ty = exprs(rest, '(');
        return isNames(ns).map(x => [x, impl, ty]);
    }
    return util_1.serr(`invalid pi param`);
};
const expr = (t) => {
    if (t.tag === 'List')
        return [exprs(t.list, '('), t.bracket === '{'];
    if (t.tag === 'Name') {
        const x = t.name;
        if (x === '*')
            return [syntax_1.Type, false];
        if (x === '_')
            return [syntax_1.Hole, false];
        if (x.includes('@'))
            return util_1.serr(`invalid name: ${x}`);
        if (/[a-z]/i.test(x[0]))
            return [syntax_1.Var(x), false];
        return util_1.serr(`invalid name: ${x}`);
    }
    if (t.tag === 'Num') {
        if (t.num.endsWith('b')) {
            const n = +t.num.slice(0, -1);
            if (isNaN(n))
                return util_1.serr(`invalid number: ${t.num}`);
            const s0 = syntax_1.Var('B0');
            const s1 = syntax_1.Var('B1');
            let c = syntax_1.Var('BE');
            const s = n.toString(2);
            for (let i = 0; i < s.length; i++)
                c = syntax_1.App(s[i] === '0' ? s0 : s1, syntax_1.PlicityR, c);
            return [c, false];
        }
        else {
            const n = +t.num;
            if (isNaN(n))
                return util_1.serr(`invalid number: ${t.num}`);
            const s = syntax_1.Var('S');
            let c = syntax_1.Var('Z');
            for (let i = 0; i < n; i++)
                c = syntax_1.App(s, syntax_1.PlicityR, c);
            return [c, false];
        }
    }
    return t;
};
const exprs = (ts, br) => {
    if (br === '{')
        return util_1.serr(`{} cannot be used here`);
    if (ts.length === 0)
        return unit;
    if (ts.length === 1)
        return expr(ts[0])[0];
    const i = ts.findIndex(x => isName(x, ':'));
    if (i >= 0) {
        const a = ts.slice(0, i);
        const b = ts.slice(i + 1);
        return syntax_1.Ann(exprs(a, '('), exprs(b, '('));
    }
    if (isName(ts[0], '\\')) {
        const args = [];
        let found = false;
        let i = 1;
        for (; i < ts.length; i++) {
            const c = ts[i];
            if (isName(c, '.')) {
                found = true;
                break;
            }
            lambdaParams(c).forEach(x => args.push(x));
        }
        if (!found)
            return util_1.serr(`. not found after \\`);
        const body = exprs(ts.slice(i + 1), '(');
        return args.reduceRight((x, [name, impl, ty]) => syntax_1.Abs(impl ? syntax_1.PlicityE : syntax_1.PlicityR, name, ty, x), body);
    }
    if (isName(ts[0], 'unroll')) {
        const body = exprs(ts.slice(1), '(');
        if (body.tag !== 'App')
            return syntax_1.Unroll(body);
        const fl = syntax_1.flattenApp(body);
        return fl[1].reduce((x, [m, y]) => syntax_1.App(x, m, y), syntax_1.Unroll(fl[0]));
    }
    if (isName(ts[0], 'roll')) {
        if (ts[1].tag === 'List' && ts[1].bracket === '{') {
            const [ty, b] = expr(ts[1]);
            if (!b)
                return util_1.serr(`something went wrong when parsing roll`);
            const body = exprs(ts.slice(2), '(');
            return syntax_1.Roll(ty, body);
        }
        else {
            const body = exprs(ts.slice(1), '(');
            return syntax_1.Roll(null, body);
        }
    }
    if (isName(ts[0], 'assert')) {
        if (ts[1].tag === 'List' && ts[1].bracket === '{') {
            const [ty, b] = expr(ts[1]);
            if (!b)
                return util_1.serr(`something went wrong when parsing assert`);
            const body = exprs(ts.slice(2), '(');
            return syntax_1.Assert(ty, body);
        }
        else {
            const body = exprs(ts.slice(1), '(');
            return syntax_1.Assert(null, body);
        }
    }
    if (isName(ts[0], 'fix')) {
        const args = [];
        let found = false;
        let i = 1;
        for (; i < ts.length; i++) {
            const c = ts[i];
            if (isName(c, '.')) {
                found = true;
                break;
            }
            lambdaParams(c).forEach(x => args.push(x));
        }
        if (!found)
            return util_1.serr(`. not found after fix`);
        const rargs = [];
        args.forEach(([x, i, t]) => {
            if (i)
                return util_1.serr(`fix arg cannot be implicit`);
            if (!t)
                return util_1.serr(`fix arg must have a type annotation`);
            return rargs.push([x, t]);
        });
        const body = exprs(ts.slice(i + 1), '(');
        return rargs.reduceRight((x, [name, ty]) => syntax_1.Fix(name, ty, x), body);
    }
    if (isName(ts[0], 'let')) {
        const x = ts[1];
        let impl = false;
        let name = 'ERROR';
        if (x.tag === 'Name') {
            name = x.name;
        }
        else if (x.tag === 'List' && x.bracket === '{') {
            const a = x.list;
            if (a.length !== 1)
                return util_1.serr(`invalid name for let`);
            const h = a[0];
            if (h.tag !== 'Name')
                return util_1.serr(`invalid name for let`);
            name = h.name;
            impl = true;
        }
        else
            return util_1.serr(`invalid name for let`);
        if (!isName(ts[2], '='))
            return util_1.serr(`no = after name in let`);
        const vals = [];
        let found = false;
        let i = 3;
        for (; i < ts.length; i++) {
            const c = ts[i];
            if (c.tag === 'Name' && c.name === 'in') {
                found = true;
                break;
            }
            vals.push(c);
        }
        if (!found)
            return util_1.serr(`no in after let`);
        if (vals.length === 0)
            return util_1.serr(`empty val in let`);
        const val = exprs(vals, '(');
        const body = exprs(ts.slice(i + 1), '(');
        return syntax_1.Let(impl ? syntax_1.PlicityE : syntax_1.PlicityR, name, val, body);
    }
    const j = ts.findIndex(x => isName(x, '->'));
    if (j >= 0) {
        const s = splitTokens(ts, x => isName(x, '->'));
        if (s.length < 2)
            return util_1.serr(`parsing failed with ->`);
        const args = s.slice(0, -1)
            .map(p => p.length === 1 ? piParams(p[0]) : [['_', false, exprs(p, '(')]])
            .reduce((x, y) => x.concat(y), []);
        const body = exprs(s[s.length - 1], '(');
        return args.reduceRight((x, [name, impl, ty]) => syntax_1.Pi(impl ? syntax_1.PlicityE : syntax_1.PlicityR, name, ty, x), body);
    }
    const l = ts.findIndex(x => isName(x, '\\'));
    let all = [];
    if (l >= 0) {
        const first = ts.slice(0, l).map(expr);
        const rest = exprs(ts.slice(l), '(');
        all = first.concat([[rest, false]]);
    }
    else {
        all = ts.map(expr);
    }
    if (all.length === 0)
        return util_1.serr(`empty application`);
    if (all[0] && all[0][1])
        return util_1.serr(`in application function cannot be between {}`);
    return all.slice(1).reduce((x, [y, impl]) => syntax_1.App(x, impl ? syntax_1.PlicityE : syntax_1.PlicityR, y), all[0][0]);
};
exports.parse = (s) => {
    const ts = tokenize(s);
    const ex = exprs(ts, '(');
    return ex;
};
exports.parseDefs = (s) => {
    const ts = tokenize(s);
    if (ts[0].tag !== 'Name' || ts[0].name !== 'def')
        return util_1.serr(`def should start with "def"`);
    const spl = splitTokens(ts, t => t.tag === 'Name' && t.name === 'def');
    const ds = [];
    for (let i = 0; i < spl.length; i++) {
        const c = spl[i];
        if (c.length === 0)
            continue;
        if (c[0].tag === 'Name') {
            const name = c[0].name;
            const fst = 1;
            const sym = c[fst];
            if (sym.tag !== 'Name')
                return util_1.serr(`def: after name should be : or =`);
            if (sym.name === '=') {
                ds.push(definitions_1.DDef(name, exprs(c.slice(fst + 1), '(')));
                continue;
            }
            else if (sym.name === ':') {
                const tyts = [];
                let j = fst + 1;
                for (; j < c.length; j++) {
                    const v = c[j];
                    if (v.tag === 'Name' && v.name === '=')
                        break;
                    else
                        tyts.push(v);
                }
                const ety = exprs(tyts, '(');
                const body = exprs(c.slice(j + 1), '(');
                ds.push(definitions_1.DDef(name, syntax_1.Ann(body, ety)));
                continue;
            }
            else
                return util_1.serr(`def: : or = expected but got ${sym.name}`);
        }
        else
            return util_1.serr(`def should start with a name`);
    }
    return ds;
};

},{"./definitions":3,"./syntax":16,"./util":18}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const globalenv_1 = require("./surface/globalenv");
const syntax_1 = require("./syntax");
const domain_1 = require("./surface/domain");
const syntax_2 = require("./surface/syntax");
const parser_1 = require("./parser");
const typecheck_1 = require("./surface/typecheck");
const definitions_1 = require("./surface/definitions");
const syntax_3 = require("./untyped/syntax");
const list_1 = require("./list");
const syntax_4 = require("./core/syntax");
const help = `
EXAMPLES
identity = \\{t : *} (x : t). x
zero = \\t z s. z : {t : *} -> t -> (t -> t) -> t

COMMANDS
[:help or :h] this help message
[:debug or :d] toggle debug log messages
[:def definitions] define names
[:defs] show all defs
[:import files] import a file
[:view files] view a file
[:t term] or [:type term] show the type of an expressions
[:del name] delete a name
[:gtype name] view the fully normalized type of a name
[:gelab name] view the elaborated term of a name
[:gterm name] view the term of a name
[:gnorm name] view the fully normalized term of a name
[:gterme name] view the term of a name with erased types
[:gnorme name] view the fully normalized term of a name with erased types
`.trim();
const loadFile = (fn) => {
    if (typeof window === 'undefined') {
        return new Promise((resolve, reject) => {
            require('fs').readFile(fn, 'utf8', (err, data) => {
                if (err)
                    return reject(err);
                return resolve(data);
            });
        });
    }
    else {
        return fetch(fn).then(r => r.text());
    }
};
exports.initREPL = () => {
    globalenv_1.globalReset();
};
exports.runREPL = (_s, _cb) => {
    try {
        _s = _s.trim();
        if (_s === ':help' || _s === ':h')
            return _cb(help);
        if (_s === ':debug' || _s === ':d') {
            config_1.setConfig({ debug: !config_1.config.debug });
            return _cb(`debug: ${config_1.config.debug}`);
        }
        if (_s === ':defs') {
            const e = globalenv_1.globalMap();
            const msg = Object.keys(e).map(k => `def ${k} : ${syntax_1.showTerm(syntax_2.fromSurface(domain_1.quoteZ(e[k].type, list_1.Nil, 0, false)))} = ${syntax_1.showTerm(syntax_2.fromSurface(domain_1.quoteZ(e[k].val, list_1.Nil, 0, false)))}`).join('\n');
            return _cb(msg || 'no definitions');
        }
        if (_s.startsWith(':del')) {
            const name = _s.slice(4).trim();
            globalenv_1.globalDelete(name);
            return _cb(`deleted ${name}`);
        }
        if (_s.startsWith(':def')) {
            const rest = _s.slice(1);
            const ds = parser_1.parseDefs(rest);
            const dsc = definitions_1.toSurfaceDefs(ds);
            const xs = typecheck_1.typecheckDefs(dsc, true);
            return _cb(`defined ${xs.join(' ')}`);
        }
        if (_s.startsWith(':gtype')) {
            const name = _s.slice(6).trim();
            const res = globalenv_1.globalGet(name);
            if (!res)
                return _cb(`undefined global: ${name}`, true);
            const type = domain_1.quoteZ(res.type, list_1.Nil, 0, true);
            return _cb(syntax_1.showTerm(syntax_2.fromSurface(type)));
        }
        if (_s.startsWith(':gelab')) {
            const name = _s.slice(6).trim();
            const res = globalenv_1.globalGet(name);
            if (!res)
                return _cb(`undefined global: ${name}`, true);
            return _cb(syntax_1.showTerm(syntax_2.fromSurface(res.term)));
        }
        if (_s.startsWith(':gterme')) {
            const name = _s.slice(7).trim();
            const res = globalenv_1.globalGet(name);
            if (!res)
                return _cb(`undefined global: ${name}`, true);
            const term = domain_1.quoteZ(res.val, list_1.Nil, 0, false);
            return _cb(syntax_1.showTerm(syntax_1.eraseTypes(syntax_2.fromSurface(term))));
        }
        if (_s.startsWith(':gnorme')) {
            const name = _s.slice(7).trim();
            const res = globalenv_1.globalGet(name);
            if (!res)
                return _cb(`undefined global: ${name}`, true);
            const term = domain_1.quoteZ(res.val, list_1.Nil, 0, true);
            return _cb(syntax_1.showTerm(syntax_1.eraseTypes(syntax_2.fromSurface(term))));
        }
        if (_s.startsWith(':gterm')) {
            const name = _s.slice(6).trim();
            const res = globalenv_1.globalGet(name);
            if (!res)
                return _cb(`undefined global: ${name}`, true);
            const term = domain_1.quoteZ(res.val, list_1.Nil, 0, false);
            return _cb(syntax_1.showTerm(syntax_2.fromSurface(term)));
        }
        if (_s.startsWith(':gnorm')) {
            const name = _s.slice(6).trim();
            const res = globalenv_1.globalGet(name);
            if (!res)
                return _cb(`undefined global: ${name}`, true);
            const term = domain_1.quoteZ(res.val, list_1.Nil, 0, true);
            return _cb(syntax_1.showTerm(syntax_2.fromSurface(term)));
        }
        if (_s.startsWith(':import')) {
            const files = _s.slice(7).trim().split(/\s+/g);
            Promise.all(files.map(loadFile)).then(defs => {
                const xs = [];
                defs.forEach(rest => {
                    const ds = parser_1.parseDefs(rest);
                    const dsc = definitions_1.toSurfaceDefs(ds);
                    const lxs = typecheck_1.typecheckDefs(dsc, true);
                    lxs.forEach(x => xs.push(x));
                });
                return _cb(`imported ${files.join(' ')}; defined ${xs.join(' ')}`);
            }).catch(err => _cb('' + err, true));
            return;
        }
        if (_s.startsWith(':view')) {
            const files = _s.slice(5).trim().split(/\s+/g);
            Promise.all(files.map(loadFile)).then(ds => {
                return _cb(ds.join('\n\n'));
            }).catch(err => _cb('' + err, true));
            return;
        }
        let typeOnly = false;
        if (_s.startsWith(':t')) {
            _s = _s.slice(_s.startsWith(':type') ? 5 : 2);
            typeOnly = true;
        }
        else if (_s.startsWith(':'))
            return _cb('invalid command', true);
        let msg = '';
        let tm_;
        try {
            const t = parser_1.parse(_s);
            config_1.log(() => syntax_1.showTerm(t));
            const tt = syntax_2.toSurface(t);
            const [etm, vty] = typecheck_1.typecheck(tt);
            const ty = domain_1.quoteZ(vty, list_1.Nil, 0, false);
            tm_ = etm;
            config_1.log(() => syntax_1.showTerm(syntax_2.fromSurface(ty)));
            config_1.log(() => syntax_1.showTerm(syntax_2.fromSurface(etm)));
            const eras = syntax_3.erase(syntax_4.toCore(domain_1.normalize(etm, list_1.Nil, 0, true)));
            config_1.log(() => syntax_3.showTerm(eras));
            msg += `type: ${syntax_1.showTerm(syntax_2.fromSurface(ty))}\nterm: ${syntax_1.showTerm(syntax_2.fromSurface(etm))}`;
            if (typeOnly)
                return _cb(msg);
        }
        catch (err) {
            config_1.log(() => '' + err);
            return _cb('' + err, true);
        }
        try {
            const n = domain_1.normalize(tm_, list_1.Nil, 0, false);
            config_1.log(() => syntax_1.showTerm(syntax_2.fromSurface(n)));
            const er = syntax_3.erase(syntax_4.toCore(domain_1.normalize(n, list_1.Nil, 0, true)));
            config_1.log(() => syntax_3.showTerm(er));
            msg += `\neras: ${syntax_3.showTerm(er)}`;
            return _cb(msg);
        }
        catch (err) {
            config_1.log(() => '' + err);
            msg += '\n' + err;
            return _cb(msg, true);
        }
    }
    catch (err) {
        config_1.log(() => '' + err);
        return _cb(err, true);
    }
};

},{"./config":1,"./core/syntax":2,"./list":5,"./parser":7,"./surface/definitions":9,"./surface/domain":10,"./surface/globalenv":11,"./surface/syntax":13,"./surface/typecheck":14,"./syntax":16,"./untyped/syntax":17,"fs":20}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const syntax_1 = require("./syntax");
exports.DDef = (name, value) => ({ tag: 'DDef', name, value });
exports.showDef = (d) => {
    if (d.tag === 'DDef')
        return `def ${d.name} = ${syntax_1.showTerm(d.value)}`;
    return d.tag;
};
exports.toSurfaceDef = (d) => {
    if (d.tag === 'DDef')
        return exports.DDef(d.name, syntax_1.toSurface(d.value));
    return d.tag;
};
exports.toSurfaceDefs = (d) => d.map(exports.toSurfaceDef);

},{"./syntax":13}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const list_1 = require("../list");
const syntax_1 = require("./syntax");
const util_1 = require("../util");
const globalenv_1 = require("./globalenv");
const lazy_1 = require("../lazy");
const syntax_2 = require("../syntax");
const syntax_3 = require("../syntax");
const metas_1 = require("./metas");
exports.HVar = (index) => ({ tag: 'HVar', index });
exports.HGlobal = (name) => ({ tag: 'HGlobal', name });
exports.HMeta = (index) => ({ tag: 'HMeta', index });
exports.EApp = (plicity, arg) => ({ tag: 'EApp', plicity, arg });
exports.EUnroll = { tag: 'EUnroll' };
exports.VNe = (head, args) => ({ tag: 'VNe', head, args });
exports.VGlued = (head, args, val) => ({ tag: 'VGlued', head, args, val });
exports.VAbs = (plicity, name, type, body) => ({ tag: 'VAbs', name, plicity, type, body });
exports.VRoll = (type, term) => ({ tag: 'VRoll', type, term });
exports.VPi = (plicity, name, type, body) => ({ tag: 'VPi', name, plicity, type, body });
exports.VFix = (name, type, body) => ({ tag: 'VFix', name, type, body });
exports.VType = { tag: 'VType' };
exports.VVar = (index) => exports.VNe(exports.HVar(index), list_1.Nil);
exports.VGlobal = (name) => exports.VNe(exports.HGlobal(name), list_1.Nil);
exports.VMeta = (index) => exports.VNe(exports.HMeta(index), list_1.Nil);
exports.extendV = (vs, val) => list_1.Cons(val, vs);
exports.showEnvV = (l, k = 0, full = false) => list_1.toString(l, v => syntax_1.showTerm(exports.quote(v, k, full)));
exports.force = (v) => {
    if (v.tag === 'VGlued')
        return exports.force(lazy_1.forceLazy(v.val));
    if (v.tag === 'VNe' && v.head.tag === 'HMeta') {
        const val = metas_1.metaGet(v.head.index);
        if (val.tag === 'Unsolved')
            return v;
        return exports.force(list_1.foldr((elim, y) => elim.tag === 'EUnroll' ? exports.vunroll(y) : exports.vapp(y, elim.plicity, elim.arg), val.val, v.args));
    }
    return v;
};
exports.forceGlue = (v) => {
    if (v.tag === 'VGlued')
        return exports.VGlued(v.head, v.args, lazy_1.mapLazy(v.val, exports.forceGlue));
    if (v.tag === 'VNe' && v.head.tag === 'HMeta') {
        const val = metas_1.metaGet(v.head.index);
        if (val.tag === 'Unsolved')
            return v;
        const delayed = lazy_1.Lazy(() => exports.forceGlue(list_1.foldr((elim, y) => elim.tag === 'EUnroll' ? exports.vunroll(y) : exports.vapp(y, elim.plicity, elim.arg), val.val, v.args)));
        return exports.VGlued(v.head, v.args, delayed);
    }
    return v;
};
exports.vapp = (a, plicity, b) => {
    if (a.tag === 'VAbs') {
        if (!syntax_2.eqPlicity(a.plicity, plicity))
            return util_1.impossible(`vapp VAbs plicity mismatch: ${exports.showTermQ(a, 0, false)} ${plicity.erased ? '-' : ''}@ ${exports.showTermQ(b, 0, false)}`);
        return a.body(b);
    }
    if (a.tag === 'VNe')
        return exports.VNe(a.head, list_1.Cons(exports.EApp(plicity, b), a.args));
    if (a.tag === 'VGlued')
        return exports.VGlued(a.head, list_1.Cons(exports.EApp(plicity, b), a.args), lazy_1.mapLazy(a.val, v => exports.vapp(v, plicity, b)));
    return util_1.impossible(`vapp: ${a.tag}`);
};
exports.vunroll = (v) => {
    if (v.tag === 'VRoll')
        return v.term;
    if (v.tag === 'VNe')
        return exports.VNe(v.head, list_1.Cons(exports.EUnroll, v.args));
    if (v.tag === 'VGlued')
        return exports.VGlued(v.head, list_1.Cons(exports.EUnroll, v.args), lazy_1.mapLazy(v.val, v => exports.vunroll(v)));
    return util_1.impossible(`vunroll: ${v.tag}`);
};
exports.evaluate = (t, vs = list_1.Nil) => {
    if (t.tag === 'Type')
        return exports.VType;
    if (t.tag === 'Var')
        return list_1.index(vs, t.index) || util_1.impossible(`evaluate: var ${t.index} has no value`);
    if (t.tag === 'Global') {
        const entry = globalenv_1.globalGet(t.name) || util_1.impossible(`evaluate: global ${t.name} has no value`);
        return exports.VGlued(exports.HGlobal(t.name), list_1.Nil, lazy_1.Lazy(() => entry.val));
    }
    if (t.tag === 'Meta') {
        const s = metas_1.metaGet(t.index);
        return s.tag === 'Solved' ? s.val : exports.VMeta(t.index);
    }
    if (t.tag === 'App')
        return exports.vapp(exports.evaluate(t.left, vs), t.plicity, exports.evaluate(t.right, vs));
    if (t.tag === 'Abs' && t.type)
        return exports.VAbs(t.plicity, t.name, exports.evaluate(t.type, vs), v => exports.evaluate(t.body, exports.extendV(vs, v)));
    if (t.tag === 'Let')
        return exports.evaluate(t.body, exports.extendV(vs, exports.evaluate(t.val, vs)));
    if (t.tag === 'Roll' && t.type)
        return exports.VRoll(exports.evaluate(t.type, vs), exports.evaluate(t.term, vs));
    if (t.tag === 'Unroll')
        return exports.vunroll(exports.evaluate(t.term, vs));
    if (t.tag === 'Pi')
        return exports.VPi(t.plicity, t.name, exports.evaluate(t.type, vs), v => exports.evaluate(t.body, exports.extendV(vs, v)));
    if (t.tag === 'Fix')
        return exports.VFix(t.name, exports.evaluate(t.type, vs), v => exports.evaluate(t.body, exports.extendV(vs, v)));
    if (t.tag === 'Ann')
        return exports.evaluate(t.term, vs);
    if (t.tag === 'Assert' && t.type)
        return exports.evaluate(t.term, vs);
    return util_1.impossible(`cannot evaluate: ${syntax_1.showTerm(t)}`);
};
const quoteHead = (h, k) => {
    if (h.tag === 'HVar')
        return syntax_1.Var(k - (h.index + 1));
    if (h.tag === 'HGlobal')
        return syntax_1.Global(h.name);
    if (h.tag === 'HMeta')
        return syntax_1.Meta(h.index);
    return h;
};
const quoteElim = (t, e, k, full) => {
    if (e.tag === 'EApp')
        return syntax_1.App(t, e.plicity, exports.quote(e.arg, k, full));
    if (e.tag === 'EUnroll')
        return syntax_1.Unroll(t);
    return e;
};
exports.quote = (v_, k, full) => {
    const v = exports.forceGlue(v_);
    if (v.tag === 'VType')
        return syntax_1.Type;
    if (v.tag === 'VNe')
        return list_1.foldr((x, y) => quoteElim(y, x, k, full), quoteHead(v.head, k), v.args);
    if (v.tag === 'VGlued')
        return full ? exports.quote(lazy_1.forceLazy(v.val), k, full) : list_1.foldr((x, y) => quoteElim(y, x, k, full), quoteHead(v.head, k), v.args);
    if (v.tag === 'VAbs')
        return syntax_1.Abs(v.plicity, v.name, exports.quote(v.type, k, full), exports.quote(v.body(exports.VVar(k)), k + 1, full));
    if (v.tag === 'VPi')
        return syntax_1.Pi(v.plicity, v.name, exports.quote(v.type, k, full), exports.quote(v.body(exports.VVar(k)), k + 1, full));
    if (v.tag === 'VFix')
        return syntax_1.Fix(v.name, exports.quote(v.type, k, full), exports.quote(v.body(exports.VVar(k)), k + 1, full));
    if (v.tag === 'VRoll')
        return syntax_1.Roll(exports.quote(v.type, k, full), exports.quote(v.term, k, full));
    return v;
};
exports.quoteZ = (v, vs = list_1.Nil, k = 0, full = false) => exports.zonk(exports.quote(v, k, full), vs, k, full);
exports.normalize = (t, vs, k, full) => exports.quote(exports.evaluate(t, vs), k, full);
exports.showTermQ = (v, k = 0, full = false) => syntax_1.showTerm(exports.quote(v, k, full));
exports.showTermU = (v, ns = list_1.Nil, k = 0, full = false) => syntax_3.showTerm(syntax_1.fromSurface(exports.quote(v, k, full), ns));
exports.showElimU = (e, ns = list_1.Nil, k = 0, full = false) => {
    if (e.tag === 'EUnroll')
        return 'unroll';
    if (e.tag === 'EApp')
        return `${e.plicity.erased ? '{' : ''}${exports.showTermU(e.arg, ns, k, full)}${e.plicity.erased ? '}' : ''}`;
    return e;
};
const zonkSpine = (tm, vs, k, full) => {
    if (tm.tag === 'Meta') {
        const s = metas_1.metaGet(tm.index);
        if (s.tag === 'Unsolved')
            return [true, exports.zonk(tm, vs, k, full)];
        return [false, s.val];
    }
    if (tm.tag === 'App') {
        const spine = zonkSpine(tm.left, vs, k, full);
        return spine[0] ?
            [true, syntax_1.App(spine[1], tm.plicity, exports.zonk(tm.right, vs, k, full))] :
            [false, exports.vapp(spine[1], tm.plicity, exports.evaluate(tm.right, vs))];
    }
    return [true, exports.zonk(tm, vs, k, full)];
};
exports.zonk = (tm, vs = list_1.Nil, k = 0, full = false) => {
    if (tm.tag === 'Meta') {
        const s = metas_1.metaGet(tm.index);
        return s.tag === 'Solved' ? exports.quote(s.val, k, full) : tm;
    }
    if (tm.tag === 'Pi')
        return syntax_1.Pi(tm.plicity, tm.name, exports.zonk(tm.type, vs, k, full), exports.zonk(tm.body, exports.extendV(vs, exports.VVar(k)), k + 1, full));
    if (tm.tag === 'Fix')
        return syntax_1.Fix(tm.name, exports.zonk(tm.type, vs, k, full), exports.zonk(tm.body, exports.extendV(vs, exports.VVar(k)), k + 1, full));
    if (tm.tag === 'Let')
        return syntax_1.Let(tm.plicity, tm.name, exports.zonk(tm.val, vs, k, full), exports.zonk(tm.body, exports.extendV(vs, exports.VVar(k)), k + 1, full));
    if (tm.tag === 'Ann')
        return syntax_1.Ann(exports.zonk(tm.term, vs, k, full), exports.zonk(tm.type, vs, k, full));
    if (tm.tag === 'Unroll')
        return syntax_1.Unroll(exports.zonk(tm.term, vs, k, full));
    if (tm.tag === 'Roll')
        return syntax_1.Roll(tm.type && exports.zonk(tm.type, vs, k, full), exports.zonk(tm.term, vs, k, full));
    if (tm.tag === 'Assert')
        return syntax_1.Assert(tm.type && exports.zonk(tm.type, vs, k, full), exports.zonk(tm.term, vs, k, full));
    if (tm.tag === 'Abs')
        return syntax_1.Abs(tm.plicity, tm.name, tm.type && exports.zonk(tm.type, vs, k, full), exports.zonk(tm.body, exports.extendV(vs, exports.VVar(k)), k + 1, full));
    if (tm.tag === 'App') {
        const spine = zonkSpine(tm.left, vs, k, full);
        return spine[0] ?
            syntax_1.App(spine[1], tm.plicity, exports.zonk(tm.right, vs, k, full)) :
            exports.quote(exports.vapp(spine[1], tm.plicity, exports.evaluate(tm.right, vs)), k, full);
    }
    return tm;
};

},{"../lazy":4,"../list":5,"../syntax":16,"../util":18,"./globalenv":11,"./metas":12,"./syntax":13}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let env = {};
exports.globalReset = () => {
    env = {};
};
exports.globalMap = () => env;
exports.globalGet = (name) => env[name] || null;
exports.globalSet = (name, term, val, type) => {
    env[name] = { term, val, type };
};
exports.globalDelete = (name) => {
    delete env[name];
};

},{}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const syntax_1 = require("./syntax");
const util_1 = require("../util");
const Unsolved = { tag: 'Unsolved' };
const Solved = (val) => ({ tag: 'Solved', val });
let metas = [];
const stack = [];
exports.metaReset = () => { metas = []; };
exports.metaGet = (id) => {
    const s = metas[id] || null;
    if (!s)
        return util_1.impossible(`undefined meta ?${id} in metaGet`);
    return s;
};
exports.metaSet = (id, val) => {
    metas[id] = Solved(val);
};
exports.freshMetaId = () => {
    const id = metas.length;
    metas[id] = Unsolved;
    return id;
};
exports.freshMeta = () => syntax_1.Meta(exports.freshMetaId());
exports.metaPush = () => {
    stack.push(metas);
    metas = metas.slice();
};
exports.metaPop = () => {
    const x = stack.pop();
    if (!x)
        return;
    metas = x;
};
exports.metaDiscard = () => { stack.pop(); };

},{"../util":18,"./syntax":13}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const names_1 = require("../names");
const S = require("../syntax");
const list_1 = require("../list");
const util_1 = require("../util");
exports.Var = (index) => ({ tag: 'Var', index });
exports.Global = (name) => ({ tag: 'Global', name });
exports.App = (left, plicity, right) => ({ tag: 'App', left, plicity, right });
exports.Abs = (plicity, name, type, body) => ({ tag: 'Abs', plicity, name, type, body });
exports.Let = (plicity, name, val, body) => ({ tag: 'Let', plicity, name, val, body });
exports.Roll = (type, term) => ({ tag: 'Roll', type, term });
exports.Unroll = (term) => ({ tag: 'Unroll', term });
exports.Pi = (plicity, name, type, body) => ({ tag: 'Pi', plicity, name, type, body });
exports.Fix = (name, type, body) => ({ tag: 'Fix', name, type, body });
exports.Type = { tag: 'Type' };
exports.Ann = (term, type) => ({ tag: 'Ann', term, type });
exports.Hole = { tag: 'Hole' };
exports.Meta = (index) => ({ tag: 'Meta', index });
exports.Assert = (type, term) => ({ tag: 'Assert', type, term });
exports.showTerm = (t) => {
    if (t.tag === 'Var')
        return `${t.index}`;
    if (t.tag === 'Meta')
        return `?${t.index}`;
    if (t.tag === 'Global')
        return t.name;
    if (t.tag === 'Hole')
        return '_';
    if (t.tag === 'App')
        return `(${exports.showTerm(t.left)} ${t.plicity.erased ? '-' : ''}${exports.showTerm(t.right)})`;
    if (t.tag === 'Abs')
        return t.type ? `(\\(${t.plicity.erased ? '-' : ''}${t.name} : ${exports.showTerm(t.type)}). ${exports.showTerm(t.body)})` : `(\\${t.plicity.erased ? '-' : ''}${t.name}. ${exports.showTerm(t.body)})`;
    if (t.tag === 'Let')
        return `(let ${t.plicity.erased ? '-' : ''}${t.name} = ${exports.showTerm(t.val)} in ${exports.showTerm(t.body)})`;
    if (t.tag === 'Roll')
        return t.type ? `(roll {${exports.showTerm(t.type)}} ${exports.showTerm(t.term)})` : `(roll ${exports.showTerm(t.term)})`;
    if (t.tag === 'Unroll')
        return `(unroll ${exports.showTerm(t.term)})`;
    if (t.tag === 'Pi')
        return `(/(${t.plicity.erased ? '-' : ''}${t.name} : ${exports.showTerm(t.type)}). ${exports.showTerm(t.body)})`;
    if (t.tag === 'Fix')
        return `(fix (${t.name} : ${exports.showTerm(t.type)}). ${exports.showTerm(t.body)})`;
    if (t.tag === 'Type')
        return '*';
    if (t.tag === 'Ann')
        return `(${exports.showTerm(t.term)} : ${exports.showTerm(t.type)})`;
    if (t.tag === 'Assert')
        return t.type ? `(assert {${exports.showTerm(t.type)}} ${exports.showTerm(t.term)})` : `(assert ${exports.showTerm(t.term)})`;
    return t;
};
exports.toSurface = (t, ns = list_1.Nil, k = 0) => {
    if (t.tag === 'Var') {
        const l = list_1.lookup(ns, t.name);
        return l === null ? exports.Global(t.name) : exports.Var(k - l - 1);
    }
    if (t.tag === 'Hole')
        return exports.Hole;
    if (t.tag === 'Meta')
        return exports.Meta(t.index);
    if (t.tag === 'App')
        return exports.App(exports.toSurface(t.left, ns, k), t.plicity, exports.toSurface(t.right, ns, k));
    if (t.tag === 'Abs')
        return exports.Abs(t.plicity, t.name, t.type && exports.toSurface(t.type, ns, k), exports.toSurface(t.body, list_1.Cons([t.name, k], ns), k + 1));
    if (t.tag === 'Let')
        return exports.Let(t.plicity, t.name, exports.toSurface(t.val, ns, k), exports.toSurface(t.body, list_1.Cons([t.name, k], ns), k + 1));
    if (t.tag === 'Roll')
        return exports.Roll(t.type && exports.toSurface(t.type, ns, k), exports.toSurface(t.term, ns, k));
    if (t.tag === 'Unroll')
        return exports.Unroll(exports.toSurface(t.term, ns, k));
    if (t.tag === 'Pi')
        return exports.Pi(t.plicity, t.name, exports.toSurface(t.type, ns, k), exports.toSurface(t.body, list_1.Cons([t.name, k], ns), k + 1));
    if (t.tag === 'Fix')
        return exports.Fix(t.name, exports.toSurface(t.type, ns, k), exports.toSurface(t.body, list_1.Cons([t.name, k], ns), k + 1));
    if (t.tag === 'Type')
        return exports.Type;
    if (t.tag === 'Ann')
        return exports.Ann(exports.toSurface(t.term, ns, k), exports.toSurface(t.type, ns, k));
    if (t.tag === 'Assert')
        return exports.Assert(t.type && exports.toSurface(t.type, ns, k), exports.toSurface(t.term, ns, k));
    return t;
};
const globalUsed = (k, t) => {
    if (t.tag === 'App')
        return globalUsed(k, t.left) || globalUsed(k, t.right);
    if (t.tag === 'Abs')
        return (t.type && globalUsed(k, t.type)) || globalUsed(k, t.body);
    if (t.tag === 'Let')
        return globalUsed(k, t.val) || globalUsed(k, t.body);
    if (t.tag === 'Roll')
        return (t.type && globalUsed(k, t.type)) || globalUsed(k, t.term);
    if (t.tag === 'Unroll')
        return globalUsed(k, t.term);
    if (t.tag === 'Assert')
        return (t.type && globalUsed(k, t.type)) || globalUsed(k, t.term);
    if (t.tag === 'Pi')
        return globalUsed(k, t.type) || globalUsed(k, t.body);
    if (t.tag === 'Fix')
        return globalUsed(k, t.type) || globalUsed(k, t.body);
    if (t.tag === 'Ann')
        return globalUsed(k, t.term) || globalUsed(k, t.type);
    if (t.tag === 'Global')
        return t.name === k;
    if (t.tag === 'Var')
        return false;
    if (t.tag === 'Type')
        return false;
    if (t.tag === 'Hole')
        return false;
    if (t.tag === 'Meta')
        return false;
    return t;
};
const indexUsed = (k, t) => {
    if (t.tag === 'Var')
        return t.index === k;
    if (t.tag === 'App')
        return indexUsed(k, t.left) || indexUsed(k, t.right);
    if (t.tag === 'Abs')
        return (t.type && indexUsed(k, t.type)) || indexUsed(k + 1, t.body);
    if (t.tag === 'Let')
        return indexUsed(k, t.val) || indexUsed(k + 1, t.body);
    if (t.tag === 'Roll')
        return (t.type && indexUsed(k, t.type)) || indexUsed(k, t.term);
    if (t.tag === 'Unroll')
        return indexUsed(k, t.term);
    if (t.tag === 'Assert')
        return (t.type && indexUsed(k, t.type)) || indexUsed(k, t.term);
    if (t.tag === 'Pi')
        return indexUsed(k, t.type) || indexUsed(k + 1, t.body);
    if (t.tag === 'Fix')
        return indexUsed(k, t.type) || indexUsed(k + 1, t.body);
    if (t.tag === 'Ann')
        return indexUsed(k, t.term) || indexUsed(k, t.type);
    if (t.tag === 'Global')
        return false;
    if (t.tag === 'Type')
        return false;
    if (t.tag === 'Hole')
        return false;
    if (t.tag === 'Meta')
        return false;
    return t;
};
exports.isUnsolved = (t) => {
    if (t.tag === 'Hole')
        return true;
    if (t.tag === 'Meta')
        return true;
    if (t.tag === 'App')
        return exports.isUnsolved(t.left) || exports.isUnsolved(t.right);
    if (t.tag === 'Abs')
        return (t.type && exports.isUnsolved(t.type)) || exports.isUnsolved(t.body);
    if (t.tag === 'Let')
        return exports.isUnsolved(t.val) || exports.isUnsolved(t.body);
    if (t.tag === 'Roll')
        return (t.type && exports.isUnsolved(t.type)) || exports.isUnsolved(t.term);
    if (t.tag === 'Unroll')
        return exports.isUnsolved(t.term);
    if (t.tag === 'Assert')
        return (t.type && exports.isUnsolved(t.type)) || exports.isUnsolved(t.term);
    if (t.tag === 'Pi')
        return exports.isUnsolved(t.type) || exports.isUnsolved(t.body);
    if (t.tag === 'Fix')
        return exports.isUnsolved(t.type) || exports.isUnsolved(t.body);
    if (t.tag === 'Ann')
        return exports.isUnsolved(t.term) || exports.isUnsolved(t.type);
    if (t.tag === 'Global')
        return false;
    if (t.tag === 'Type')
        return false;
    if (t.tag === 'Var')
        return false;
    return t;
};
const decideName = (x, t, ns) => {
    if (x === '_')
        return x;
    const a = list_1.indecesOf(ns, x).map(i => indexUsed(i + 1, t)).reduce((x, y) => x || y, false);
    const g = globalUsed(x, t);
    return a || g ? decideName(names_1.nextName(x), t, ns) : x;
};
exports.fromSurface = (t, ns = list_1.Nil) => {
    if (t.tag === 'Var') {
        const l = list_1.index(ns, t.index);
        return l ? S.Var(l) : util_1.impossible(`var index out of range in fromSurface: ${t.index}`);
    }
    if (t.tag === 'Meta')
        return S.Meta(t.index);
    if (t.tag === 'Type')
        return S.Type;
    if (t.tag === 'Hole')
        return S.Hole;
    if (t.tag === 'Global')
        return S.Var(t.name);
    if (t.tag === 'App')
        return S.App(exports.fromSurface(t.left, ns), t.plicity, exports.fromSurface(t.right, ns));
    if (t.tag === 'Roll')
        return S.Roll(t.type && exports.fromSurface(t.type, ns), exports.fromSurface(t.term, ns));
    if (t.tag === 'Unroll')
        return S.Unroll(exports.fromSurface(t.term, ns));
    if (t.tag === 'Assert')
        return S.Assert(t.type && exports.fromSurface(t.type, ns), exports.fromSurface(t.term, ns));
    if (t.tag === 'Ann')
        return S.Ann(exports.fromSurface(t.term, ns), exports.fromSurface(t.type, ns));
    if (t.tag === 'Abs') {
        const x = decideName(t.name, t.body, ns);
        return S.Abs(t.plicity, x, t.type && exports.fromSurface(t.type, ns), exports.fromSurface(t.body, list_1.Cons(x, ns)));
    }
    if (t.tag === 'Let') {
        const x = decideName(t.name, t.body, ns);
        return S.Let(t.plicity, x, exports.fromSurface(t.val, ns), exports.fromSurface(t.body, list_1.Cons(x, ns)));
    }
    if (t.tag === 'Pi') {
        const x = decideName(t.name, t.body, ns);
        return S.Pi(t.plicity, x, exports.fromSurface(t.type, ns), exports.fromSurface(t.body, list_1.Cons(x, ns)));
    }
    if (t.tag === 'Fix') {
        const x = decideName(t.name, t.body, ns);
        return S.Fix(x, exports.fromSurface(t.type, ns), exports.fromSurface(t.body, list_1.Cons(x, ns)));
    }
    return t;
};
exports.showFromSurface = (t, ns = list_1.Nil) => S.showTerm(exports.fromSurface(t, ns));
exports.shift = (d, c, t) => {
    if (t.tag === 'Var')
        return t.index < c ? t : exports.Var(t.index + d);
    if (t.tag === 'Abs')
        return exports.Abs(t.plicity, t.name, t.type && exports.shift(d, c, t.type), exports.shift(d, c + 1, t.body));
    if (t.tag === 'App')
        return exports.App(exports.shift(d, c, t.left), t.plicity, exports.shift(d, c, t.right));
    if (t.tag === 'Let')
        return exports.Let(t.plicity, t.name, exports.shift(d, c, t.val), exports.shift(d, c + 1, t.body));
    if (t.tag === 'Roll')
        return exports.Roll(t.type && exports.shift(d, c, t.type), exports.shift(d, c, t.term));
    if (t.tag === 'Unroll')
        return exports.Unroll(exports.shift(d, c, t.term));
    if (t.tag === 'Assert')
        return exports.Assert(t.type && exports.shift(d, c, t.type), exports.shift(d, c, t.term));
    if (t.tag === 'Pi')
        return exports.Pi(t.plicity, t.name, exports.shift(d, c, t.type), exports.shift(d, c + 1, t.body));
    if (t.tag === 'Fix')
        return exports.Fix(t.name, exports.shift(d, c, t.type), exports.shift(d, c + 1, t.body));
    if (t.tag === 'Ann')
        return exports.Ann(exports.shift(d, c, t.term), exports.shift(d, c, t.type));
    return t;
};

},{"../list":5,"../names":6,"../syntax":16,"../util":18}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const domain_1 = require("./domain");
const syntax_1 = require("./syntax");
const util_1 = require("../util");
const list_1 = require("../list");
const globalenv_1 = require("./globalenv");
const syntax_2 = require("../syntax");
const unify_1 = require("./unify");
const definitions_1 = require("./definitions");
const config_1 = require("../config");
const metas_1 = require("./metas");
const extendT = (ts, val, bound) => list_1.Cons([bound, val], ts);
const showEnvT = (ts, k = 0, full = false) => list_1.toString(ts, ([b, v]) => `${b ? '' : 'def '}${syntax_1.showTerm(domain_1.quote(v, k, full))}`);
const erasedUsed = (k, t) => {
    if (t.tag === 'Var')
        return t.index === k;
    if (t.tag === 'Global')
        return false;
    if (t.tag === 'App')
        return erasedUsed(k, t.left) || (!t.plicity.erased && erasedUsed(k, t.right));
    if (t.tag === 'Abs')
        return erasedUsed(k + 1, t.body);
    if (t.tag === 'Let')
        return erasedUsed(k + 1, t.body) || (!t.plicity.erased && erasedUsed(k, t.val));
    if (t.tag === 'Roll')
        return erasedUsed(k, t.term);
    if (t.tag === 'Unroll')
        return erasedUsed(k, t.term);
    if (t.tag === 'Assert')
        return erasedUsed(k, t.term);
    if (t.tag === 'Ann')
        return erasedUsed(k, t.term);
    if (t.tag === 'Pi')
        return false;
    if (t.tag === 'Fix')
        return false;
    if (t.tag === 'Type')
        return false;
    if (t.tag === 'Hole')
        return false;
    if (t.tag === 'Meta')
        return false;
    return t;
};
const newMeta = (ts) => {
    const spine = list_1.filter(list_1.mapIndex(ts, (i, [bound, _]) => bound ? syntax_1.Var(i) : null), x => x !== null);
    return list_1.foldr((x, y) => syntax_1.App(y, syntax_2.PlicityR, x), metas_1.freshMeta(), spine);
};
const inst = (ts, vs, ty_) => {
    const ty = domain_1.force(ty_);
    if (ty.tag === 'VPi' && ty.plicity.erased) {
        const m = newMeta(ts);
        const vm = domain_1.evaluate(m, vs);
        const [res, args] = inst(ts, vs, ty.body(vm));
        return [res, list_1.Cons(m, args)];
    }
    return [ty, list_1.Nil];
};
const check = (ns, ts, vs, k, tm, ty) => {
    config_1.log(() => `check ${syntax_1.showFromSurface(tm, ns)} : ${domain_1.showTermU(ty, ns, k)} in ${showEnvT(ts, k, false)} and ${domain_1.showEnvV(vs, k, false)}`);
    if (ty.tag === 'VType' && tm.tag === 'Type')
        return syntax_1.Type;
    if (tm.tag === 'Var' || tm.tag === 'Global') {
        try {
            metas_1.metaPush();
            const [term, ty2] = synth(ns, ts, vs, k, tm);
            unify_1.unify(ns, k, ty2, ty);
            metas_1.metaDiscard();
            return term;
        }
        catch (err) {
            if (!(err instanceof TypeError))
                throw err;
            metas_1.metaPop();
        }
    }
    if (tm.tag === 'Assert' && !tm.type) {
        const [term] = synth(ns, ts, vs, k, tm.term);
        return syntax_1.Assert(domain_1.quote(ty, k, false), term);
    }
    const tyf = domain_1.force(ty);
    config_1.log(() => `check after ${domain_1.showTermU(tyf, ns, k)}`);
    if (tm.tag === 'Abs' && !tm.type && tyf.tag === 'VPi' && syntax_2.eqPlicity(tm.plicity, tyf.plicity)) {
        const v = domain_1.VVar(k);
        const body = check(list_1.Cons(tm.name, ns), extendT(ts, tyf.type, true), domain_1.extendV(vs, v), k + 1, tm.body, tyf.body(v));
        if (tm.plicity.erased && erasedUsed(0, tm.body))
            return util_1.terr(`erased argument used in ${syntax_1.showFromSurface(tm, ns)}`);
        return syntax_1.Abs(tm.plicity, tm.name === '_' ? tyf.name : tm.name, domain_1.quote(tyf.type, k, false), body);
    }
    if (tyf.tag === 'VPi' && tyf.plicity.erased && !(tm.tag === 'Abs' && tm.type && tm.plicity.erased)) {
        const v = domain_1.VVar(k);
        const body = check(list_1.Cons(tyf.name, ns), extendT(ts, tyf.type, true), domain_1.extendV(vs, v), k + 1, syntax_1.shift(1, 0, tm), tyf.body(v));
        return syntax_1.Abs(tyf.plicity, tyf.name, domain_1.quote(tyf.type, k, false), body);
    }
    if (tm.tag === 'Roll' && !tm.type && tyf.tag === 'VFix') {
        const term = check(ns, ts, vs, k, tm.term, tyf.body(ty));
        return syntax_1.Roll(domain_1.quote(ty, k, false), term);
    }
    if (tm.tag === 'Let') {
        const [val, vty] = synth(ns, ts, vs, k, tm.val);
        const body = check(list_1.Cons(tm.name, ns), extendT(ts, vty, false), domain_1.extendV(vs, domain_1.evaluate(val, vs)), k + 1, tm.body, ty);
        if (tm.plicity.erased && erasedUsed(0, tm.body))
            return util_1.terr(`erased argument used in ${syntax_1.showFromSurface(tm, ns)}`);
        return syntax_1.Let(tm.plicity, tm.name, val, body);
    }
    if (tm.tag === 'Hole')
        return newMeta(ts);
    const [term, ty2] = synth(ns, ts, vs, k, tm);
    const [ty2inst, targs] = inst(ts, vs, ty2);
    try {
        unify_1.unify(ns, k, ty2inst, ty);
    }
    catch (err) {
        if (!(err instanceof TypeError))
            throw err;
        return util_1.terr(`failed to unify ${domain_1.showTermU(ty2, ns, k)} ~ ${domain_1.showTermU(ty, ns, k)}: ${err.message}`);
    }
    return list_1.foldl((a, m) => syntax_1.App(a, syntax_2.PlicityE, m), term, targs);
};
const freshPi = (ts, vs, x, impl) => {
    const a = newMeta(ts);
    const va = domain_1.evaluate(a, vs);
    const b = newMeta(list_1.Cons([true, va], ts));
    return domain_1.VPi(impl, x, va, v => domain_1.evaluate(b, domain_1.extendV(vs, v)));
};
const synth = (ns, ts, vs, k, tm) => {
    config_1.log(() => `synth ${syntax_1.showFromSurface(tm, ns)} in ${showEnvT(ts, k, false)} and ${domain_1.showEnvV(vs, k, false)}`);
    if (tm.tag === 'Type')
        return [tm, domain_1.VType];
    if (tm.tag === 'Var') {
        const res = list_1.index(ts, tm.index);
        if (!res)
            return util_1.terr(`var out of scope ${syntax_1.showFromSurface(tm, ns)}`);
        return [tm, res[1]];
    }
    if (tm.tag === 'Global') {
        const entry = globalenv_1.globalGet(tm.name);
        if (!entry)
            return util_1.terr(`global ${tm.name} not found`);
        return [tm, entry.type];
    }
    if (tm.tag === 'Hole') {
        const t = newMeta(ts);
        const vt = domain_1.evaluate(newMeta(ts), vs);
        return [t, vt];
    }
    if (tm.tag === 'App') {
        const [fntm, fn] = synth(ns, ts, vs, k, tm.left);
        const [rt, res, ms] = synthapp(ns, ts, vs, k, fn, tm.plicity, tm.right);
        return [syntax_1.App(list_1.foldl((f, a) => syntax_1.App(f, syntax_2.PlicityE, a), fntm, ms), tm.plicity, res), rt];
    }
    if (tm.tag === 'Abs') {
        if (tm.type) {
            const type = check(ns, ts, vs, k, tm.type, domain_1.VType);
            const vtype = domain_1.evaluate(type, vs);
            const [body, rt] = synth(list_1.Cons(tm.name, ns), extendT(ts, vtype, true), domain_1.extendV(vs, domain_1.VVar(k)), k + 1, tm.body);
            if (tm.plicity.erased && erasedUsed(0, tm.body))
                return util_1.terr(`erased argument used in ${syntax_1.showFromSurface(tm, ns)}`);
            // TODO: avoid quote here
            const pi = domain_1.evaluate(syntax_1.Pi(tm.plicity, tm.name, type, domain_1.quote(rt, k + 1, false)), vs);
            return [syntax_1.Abs(tm.plicity, tm.name, type, body), pi];
        }
        else {
            const pi = freshPi(ts, vs, tm.name, tm.plicity);
            const term = check(ns, ts, vs, k, tm, pi);
            return [term, pi];
        }
    }
    if (tm.tag === 'Let') {
        const [val, vty] = synth(ns, ts, vs, k, tm.val);
        const [body, rt] = synth(list_1.Cons(tm.name, ns), extendT(ts, vty, false), domain_1.extendV(vs, domain_1.evaluate(val, vs)), k + 1, tm.body);
        if (tm.plicity.erased && erasedUsed(0, tm.body))
            return util_1.terr(`erased argument used in ${syntax_1.showFromSurface(tm, ns)}`);
        return [syntax_1.Let(tm.plicity, tm.name, val, body), rt];
    }
    if (tm.tag === 'Pi') {
        const type = check(ns, ts, vs, k, tm.type, domain_1.VType);
        const body = check(list_1.Cons(tm.name, ns), extendT(ts, domain_1.evaluate(type, vs), true), domain_1.extendV(vs, domain_1.VVar(k)), k + 1, tm.body, domain_1.VType);
        return [syntax_1.Pi(tm.plicity, tm.name, type, body), domain_1.VType];
    }
    if (tm.tag === 'Fix') {
        const type = check(ns, ts, vs, k, tm.type, domain_1.VType);
        const vt = domain_1.evaluate(type, vs);
        const body = check(list_1.Cons(tm.name, ns), extendT(ts, vt, true), domain_1.extendV(vs, domain_1.VVar(k)), k + 1, tm.body, vt);
        return [syntax_1.Fix(tm.name, type, body), vt];
    }
    if (tm.tag === 'Roll' && tm.type) {
        const type = check(ns, ts, vs, k, tm.type, domain_1.VType);
        const vt = domain_1.evaluate(type, vs);
        const vtf = domain_1.force(vt);
        if (vtf.tag === 'VFix') {
            const term = check(ns, ts, vs, k, tm.term, vtf.body(vt));
            return [syntax_1.Roll(type, term), vt];
        }
        return util_1.terr(`fix type expected in ${syntax_1.showFromSurface(tm, ns)}: ${domain_1.showTermU(vt, ns, k)}`);
    }
    if (tm.tag === 'Unroll') {
        const [term, ty] = synth(ns, ts, vs, k, tm.term);
        const vt = domain_1.force(ty);
        if (vt.tag === 'VFix')
            return [syntax_1.Unroll(term), vt.body(ty)];
        return util_1.terr(`fix type expected in ${syntax_1.showFromSurface(tm, ns)}: ${domain_1.showTermU(vt, ns, k)}`);
    }
    if (tm.tag === 'Ann') {
        const type = check(ns, ts, vs, k, tm.type, domain_1.VType);
        const vt = domain_1.evaluate(type, vs);
        const term = check(ns, ts, vs, k, tm.term, vt);
        return [term, vt];
    }
    if (tm.tag === 'Assert' && tm.type) {
        const type = check(ns, ts, vs, k, tm.type, domain_1.VType);
        const vt = domain_1.evaluate(type, vs);
        const [term] = synth(ns, ts, vs, k, tm.term);
        return [syntax_1.Assert(type, term), vt];
    }
    return util_1.terr(`cannot synth ${syntax_1.showFromSurface(tm, ns)}`);
};
const synthapp = (ns, ts, vs, k, ty_, plicity, arg) => {
    config_1.log(() => `synthapp before ${domain_1.showTermU(ty_, ns, k)}`);
    const ty = domain_1.force(ty_);
    config_1.log(() => `synthapp ${domain_1.showTermU(ty, ns, k)} ${plicity.erased ? '-' : ''}@ ${syntax_1.showFromSurface(arg, ns)} in ${showEnvT(ts, k, false)} and ${domain_1.showEnvV(vs)}`);
    if (ty.tag === 'VPi' && ty.plicity.erased && !plicity.erased) {
        // {a} -> b @ c (instantiate with meta then b @ c)
        const m = newMeta(ts);
        const vm = domain_1.evaluate(m, vs);
        const [rt, ft, l] = synthapp(ns, ts, vs, k, ty.body(vm), plicity, arg);
        return [rt, ft, list_1.Cons(m, l)];
    }
    if (ty.tag === 'VPi' && syntax_2.eqPlicity(ty.plicity, plicity)) {
        const tm = check(ns, ts, vs, k, arg, ty.type);
        const vm = domain_1.evaluate(tm, vs);
        return [ty.body(vm), tm, list_1.Nil];
    }
    // TODO fix the following
    if (ty.tag === 'VNe' && ty.head.tag === 'HMeta') {
        const a = metas_1.freshMetaId();
        const b = metas_1.freshMetaId();
        const pi = domain_1.VPi(plicity, '_', domain_1.VNe(domain_1.HMeta(a), ty.args), () => domain_1.VNe(domain_1.HMeta(b), ty.args));
        unify_1.unify(ns, k, ty, pi);
        return synthapp(ns, ts, vs, k, pi, plicity, arg);
    }
    return util_1.terr(`invalid type or plicity mismatch in synthapp in ${domain_1.showTermU(ty, ns, k)} ${plicity.erased ? '-' : ''}@ ${syntax_1.showFromSurface(arg, ns)}`);
};
exports.typecheck = (tm) => {
    metas_1.metaReset();
    const [etm, ty] = synth(list_1.Nil, list_1.Nil, list_1.Nil, 0, tm);
    const ztm = domain_1.zonk(etm);
    // TODO: should type be checked?
    if (syntax_1.isUnsolved(ztm))
        return util_1.terr(`elaborated term was unsolved: ${syntax_1.showFromSurface(ztm)}`);
    return [ztm, ty];
};
exports.typecheckDefs = (ds, allowRedefinition = false) => {
    const xs = [];
    if (!allowRedefinition) {
        for (let i = 0; i < ds.length; i++) {
            const d = ds[i];
            if (d.tag === 'DDef' && globalenv_1.globalGet(d.name))
                return util_1.terr(`cannot redefine global ${d.name}`);
        }
    }
    for (let i = 0; i < ds.length; i++) {
        const d = ds[i];
        config_1.log(() => `typecheckDefs ${definitions_1.showDef(d)}`);
        if (d.tag === 'DDef') {
            const [tm, ty] = exports.typecheck(d.value);
            config_1.log(() => `set ${d.name} = ${syntax_1.showTerm(tm)}`);
            globalenv_1.globalSet(d.name, tm, domain_1.evaluate(tm), ty);
            xs.push(d.name);
        }
    }
    return xs;
};

},{"../config":1,"../list":5,"../syntax":16,"../util":18,"./definitions":9,"./domain":10,"./globalenv":11,"./metas":12,"./syntax":13,"./unify":15}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const domain_1 = require("./domain");
const util_1 = require("../util");
const syntax_1 = require("../syntax");
const list_1 = require("../list");
const lazy_1 = require("../lazy");
const config_1 = require("../config");
const syntax_2 = require("./syntax");
const metas_1 = require("./metas");
const eqHead = (a, b) => {
    if (a === b)
        return true;
    if (a.tag === 'HVar')
        return b.tag === 'HVar' && a.index === b.index;
    if (a.tag === 'HGlobal')
        return b.tag === 'HGlobal' && a.name === b.name;
    if (a.tag === 'HMeta')
        return b.tag === 'HMeta' && a.index === b.index;
    return a;
};
const unifyElim = (ns, k, a, b, x, y) => {
    if (a === b)
        return;
    if (a.tag === 'EUnroll' && b.tag === 'EUnroll')
        return;
    if (a.tag === 'EApp' && b.tag === 'EApp' && syntax_1.eqPlicity(a.plicity, b.plicity))
        return exports.unify(ns, k, a.arg, b.arg);
    return util_1.terr(`unify failed (${k}): ${domain_1.showTermU(x, ns, k)} ~ ${domain_1.showTermU(y, ns, k)}`);
};
exports.unify = (ns, k, a_, b_) => {
    const a = domain_1.forceGlue(a_);
    const b = domain_1.forceGlue(b_);
    config_1.log(() => `unify ${domain_1.showTermU(a, ns, k)} ~ ${domain_1.showTermU(b, ns, k)}`);
    if (a === b)
        return;
    if (a.tag === 'VType' && b.tag === 'VType')
        return;
    if (a.tag === 'VRoll' && b.tag === 'VRoll') {
        exports.unify(ns, k, a.type, b.type);
        return exports.unify(ns, k, a.term, b.term);
    }
    if (a.tag === 'VPi' && b.tag === 'VPi' && syntax_1.eqPlicity(a.plicity, b.plicity)) {
        exports.unify(ns, k, a.type, b.type);
        const v = domain_1.VVar(k);
        return exports.unify(list_1.Cons(a.name, ns), k + 1, a.body(v), b.body(v));
    }
    if (a.tag === 'VFix' && b.tag === 'VFix') {
        exports.unify(ns, k, a.type, b.type);
        const v = domain_1.VVar(k);
        return exports.unify(list_1.Cons(a.name, ns), k + 1, a.body(v), b.body(v));
    }
    if (a.tag === 'VAbs' && b.tag === 'VAbs' && syntax_1.eqPlicity(a.plicity, b.plicity)) {
        exports.unify(ns, k, a.type, b.type);
        const v = domain_1.VVar(k);
        return exports.unify(list_1.Cons(a.name, ns), k + 1, a.body(v), b.body(v));
    }
    if (a.tag === 'VAbs') {
        const v = domain_1.VVar(k);
        return exports.unify(list_1.Cons(a.name, ns), k + 1, a.body(v), domain_1.vapp(b, a.plicity, v));
    }
    if (b.tag === 'VAbs') {
        const v = domain_1.VVar(k);
        return exports.unify(list_1.Cons(b.name, ns), k + 1, domain_1.vapp(a, b.plicity, v), b.body(v));
    }
    if (a.tag === 'VNe' && b.tag === 'VNe' && eqHead(a.head, b.head) && list_1.length(a.args) === list_1.length(b.args))
        return list_1.zipWithR_((x, y) => unifyElim(ns, k, x, y, a, b), a.args, b.args);
    if (a.tag === 'VNe' && b.tag === 'VNe' && a.head.tag === 'HMeta' && b.head.tag === 'HMeta')
        return list_1.length(a.args) > list_1.length(b.args) ?
            solve(ns, k, a.head.index, a.args, b) :
            solve(ns, k, b.head.index, b.args, a);
    if (a.tag === 'VNe' && a.head.tag === 'HMeta')
        return solve(ns, k, a.head.index, a.args, b);
    if (b.tag === 'VNe' && b.head.tag === 'HMeta')
        return solve(ns, k, b.head.index, b.args, a);
    if (a.tag === 'VGlued' && b.tag === 'VGlued' && eqHead(a.head, b.head) && list_1.length(a.args) === list_1.length(b.args)) {
        try {
            metas_1.metaPush();
            list_1.zipWithR_((x, y) => unifyElim(ns, k, x, y, a, b), a.args, b.args);
            metas_1.metaDiscard();
            return;
        }
        catch (err) {
            if (!(err instanceof TypeError))
                throw err;
            metas_1.metaPop();
            return exports.unify(ns, k, lazy_1.forceLazy(a.val), lazy_1.forceLazy(b.val));
        }
    }
    if (a.tag === 'VGlued')
        return exports.unify(ns, k, lazy_1.forceLazy(a.val), b);
    if (b.tag === 'VGlued')
        return exports.unify(ns, k, a, lazy_1.forceLazy(b.val));
    return util_1.terr(`unify failed (${k}): ${domain_1.showTermU(a, ns, k)} ~ ${domain_1.showTermU(b, ns, k)}`);
};
const solve = (ns, k, m, spine, val) => {
    config_1.log(() => `solve ?${m} ${list_1.toString(spine, e => domain_1.showElimU(e, ns, k, false))} := ${domain_1.showTermU(val, ns, k)} (${k}, ${list_1.toString(ns)})`);
    try {
        const spinex = checkSpine(ns, k, spine);
        const rhs = domain_1.quote(val, k, false);
        const ivs = list_1.map(spinex, ([_, v]) => v);
        const body = checkSolution(ns, k, m, ivs, rhs);
        // Note: I'm solving with an abstraction that has * as type for all the parameters
        // TODO: I think it might actually matter
        config_1.log(() => `spinex ${list_1.toString(spinex, ([p, s]) => `${p.erased ? '-' : ''}${s}`)}`);
        const solution = list_1.foldl((body, [pl, y]) => {
            if (typeof y === 'string')
                return syntax_2.Abs(pl, '_', syntax_2.Type, body);
            const x = list_1.index(ns, k - y - 1);
            if (!x)
                return util_1.terr(`index ${y} out of range in meta spine`);
            return syntax_2.Abs(pl, x, syntax_2.Type, body);
        }, body, spinex);
        config_1.log(() => `solution ?${m} := ${syntax_2.showFromSurface(solution, list_1.Nil)} | ${syntax_2.showTerm(solution)}`);
        const vsolution = domain_1.evaluate(solution, list_1.Nil);
        metas_1.metaSet(m, vsolution);
    }
    catch (err) {
        if (!(err instanceof TypeError))
            throw err;
        const a = list_1.toArray(spine, e => domain_1.showElimU(e, ns, k));
        util_1.terr(`failed to solve meta (?${m}${a.length > 0 ? ' ' : ''}${a.join(' ')}) := ${domain_1.showTermU(val, ns, k)}: ${err.message}`);
    }
};
const checkSpine = (ns, k, spine) => list_1.map(spine, elim => {
    if (elim.tag === 'EUnroll')
        return util_1.terr(`unroll in meta spine`);
    if (elim.tag === 'EApp') {
        const v = domain_1.forceGlue(elim.arg);
        if ((v.tag === 'VNe' || v.tag === 'VGlued') && v.head.tag === 'HVar' && list_1.length(v.args) === 0)
            return [elim.plicity, v.head.index];
        if ((v.tag === 'VNe' || v.tag === 'VGlued') && v.head.tag === 'HGlobal' && list_1.length(v.args) === 0)
            return [elim.plicity, v.head.name];
        return util_1.terr(`not a var in spine: ${domain_1.showTermU(v, ns, k)}`);
    }
    return elim;
});
const checkSolution = (ns, k, m, is, t) => {
    if (t.tag === 'Type')
        return t;
    if (t.tag === 'Global')
        return t;
    if (t.tag === 'Var') {
        const i = k - t.index - 1;
        if (list_1.contains(is, i))
            return syntax_2.Var(list_1.indexOf(is, i));
        return util_1.terr(`scope error ${t.index} (${i}) | ${list_1.index(ns, t.index)}`);
    }
    if (t.tag === 'Meta') {
        if (m === t.index)
            return util_1.terr(`occurs check failed: ${syntax_2.showFromSurface(t, ns)}`);
        return t;
    }
    if (t.tag === 'App') {
        const l = checkSolution(ns, k, m, is, t.left);
        const r = checkSolution(ns, k, m, is, t.right);
        return syntax_2.App(l, t.plicity, r);
    }
    if (t.tag === 'Roll' && t.type) {
        const ty = checkSolution(ns, k, m, is, t.type);
        const tm = checkSolution(ns, k, m, is, t.term);
        return syntax_2.Roll(ty, tm);
    }
    if (t.tag === 'Unroll') {
        const tm = checkSolution(ns, k, m, is, t.term);
        return syntax_2.Unroll(tm);
    }
    if (t.tag === 'Abs' && t.type) {
        const ty = checkSolution(ns, k, m, is, t.type);
        const body = checkSolution(ns, k + 1, m, list_1.Cons(k, is), t.body);
        return syntax_2.Abs(t.plicity, t.name, ty, body);
    }
    if (t.tag === 'Pi') {
        const ty = checkSolution(ns, k, m, is, t.type);
        const body = checkSolution(ns, k + 1, m, list_1.Cons(k, is), t.body);
        return syntax_2.Pi(t.plicity, t.name, ty, body);
    }
    if (t.tag === 'Fix') {
        const ty = checkSolution(ns, k, m, is, t.type);
        const body = checkSolution(ns, k + 1, m, list_1.Cons(k, is), t.body);
        return syntax_2.Fix(t.name, ty, body);
    }
    return util_1.impossible(`checkSolution ?${m}: non-normal term: ${syntax_2.showFromSurface(t, ns)}`);
};

},{"../config":1,"../lazy":4,"../list":5,"../syntax":16,"../util":18,"./domain":10,"./metas":12,"./syntax":13}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eqPlicity = (a, b) => a.erased === b.erased;
exports.PlicityE = { erased: true };
exports.PlicityR = { erased: false };
exports.Var = (name) => ({ tag: 'Var', name });
exports.App = (left, plicity, right) => ({ tag: 'App', left, plicity, right });
exports.Abs = (plicity, name, type, body) => ({ tag: 'Abs', plicity, name, type, body });
exports.Let = (plicity, name, val, body) => ({ tag: 'Let', plicity, name, val, body });
exports.Roll = (type, term) => ({ tag: 'Roll', type, term });
exports.Unroll = (term) => ({ tag: 'Unroll', term });
exports.Pi = (plicity, name, type, body) => ({ tag: 'Pi', plicity, name, type, body });
exports.Fix = (name, type, body) => ({ tag: 'Fix', name, type, body });
exports.Type = { tag: 'Type' };
exports.Ann = (term, type) => ({ tag: 'Ann', term, type });
exports.Hole = { tag: 'Hole' };
exports.Meta = (index) => ({ tag: 'Meta', index });
exports.Assert = (type, term) => ({ tag: 'Assert', type, term });
exports.showTermS = (t) => {
    if (t.tag === 'Var')
        return t.name;
    if (t.tag === 'Meta')
        return `?${t.index}`;
    if (t.tag === 'Hole')
        return '_';
    if (t.tag === 'App')
        return `(${exports.showTermS(t.left)} ${t.plicity.erased ? '-' : ''}${exports.showTermS(t.right)})`;
    if (t.tag === 'Abs')
        return t.type ? `(\\(${t.plicity.erased ? '-' : ''}${t.name} : ${exports.showTermS(t.type)}). ${exports.showTermS(t.body)})` : `(\\${t.plicity.erased ? '-' : ''}${t.name}. ${exports.showTermS(t.body)})`;
    if (t.tag === 'Let')
        return `(let ${t.plicity.erased ? '-' : ''}${t.name} = ${exports.showTermS(t.val)} in ${exports.showTermS(t.body)})`;
    if (t.tag === 'Roll')
        return t.type ? `(roll {${exports.showTermS(t.type)}} ${exports.showTermS(t.term)})` : `(roll ${exports.showTermS(t.term)})`;
    if (t.tag === 'Unroll')
        return `(unroll ${exports.showTermS(t.term)})`;
    if (t.tag === 'Pi')
        return `(/(${t.plicity.erased ? '-' : ''}${t.name} : ${exports.showTermS(t.type)}). ${exports.showTermS(t.body)})`;
    if (t.tag === 'Fix')
        return `(fix (${t.name} : ${exports.showTermS(t.type)}). ${exports.showTermS(t.body)})`;
    if (t.tag === 'Type')
        return '*';
    if (t.tag === 'Ann')
        return `(${exports.showTermS(t.term)} : ${exports.showTermS(t.type)})`;
    if (t.tag === 'Assert')
        return t.type ? `(assert {${exports.showTermS(t.type)}} ${exports.showTermS(t.term)})` : `(assert ${exports.showTermS(t.term)})`;
    return t;
};
exports.flattenApp = (t) => {
    const r = [];
    while (t.tag === 'App') {
        r.push([t.plicity, t.right]);
        t = t.left;
    }
    return [t, r.reverse()];
};
exports.flattenAbs = (t) => {
    const r = [];
    while (t.tag === 'Abs') {
        r.push([t.name, t.plicity, t.type]);
        t = t.body;
    }
    return [r, t];
};
exports.flattenPi = (t) => {
    const r = [];
    while (t.tag === 'Pi') {
        r.push([t.name, t.plicity, t.type]);
        t = t.body;
    }
    return [r, t];
};
exports.showTermP = (b, t) => b ? `(${exports.showTerm(t)})` : exports.showTerm(t);
exports.showTerm = (t) => {
    if (t.tag === 'Type')
        return '*';
    if (t.tag === 'Var')
        return t.name;
    if (t.tag === 'Meta')
        return `?${t.index}`;
    if (t.tag === 'Hole')
        return '_';
    if (t.tag === 'App') {
        const [f, as] = exports.flattenApp(t);
        return `${exports.showTermP(f.tag === 'Abs' || f.tag === 'Pi' || f.tag === 'App' || f.tag === 'Let' || f.tag === 'Ann' || f.tag === 'Roll' || f.tag === 'Assert' || f.tag === 'Fix', f)} ${as.map(([im, t], i) => im.erased ? `{${exports.showTerm(t)}}` :
            `${exports.showTermP(t.tag === 'App' || t.tag === 'Ann' || t.tag === 'Let' || (t.tag === 'Abs' && i < as.length - 1) || t.tag === 'Pi' || t.tag === 'Fix' || t.tag === 'Unroll' || t.tag === 'Roll' || t.tag === 'Assert', t)}`).join(' ')}`;
    }
    if (t.tag === 'Abs') {
        const [as, b] = exports.flattenAbs(t);
        return `\\${as.map(([x, im, t]) => im.erased ? `{${x}${t ? ` : ${exports.showTermP(t.tag === 'Ann', t)}` : ''}}` : !t ? x : `(${x} : ${exports.showTermP(t.tag === 'Ann', t)})`).join(' ')}. ${exports.showTermP(b.tag === 'Ann', b)}`;
    }
    if (t.tag === 'Pi') {
        const [as, b] = exports.flattenPi(t);
        return `${as.map(([x, im, t]) => x === '_' ? (im.erased ? `${im.erased ? '{' : ''}${exports.showTerm(t)}${im.erased ? '}' : ''}` : `${exports.showTermP(t.tag === 'Ann' || t.tag === 'Abs' || t.tag === 'Let' || t.tag === 'Pi' || t.tag === 'Fix', t)}`) : `${im.erased ? '{' : '('}${x} : ${exports.showTermP(t.tag === 'Ann', t)}${im.erased ? '}' : ')'}`).join(' -> ')} -> ${exports.showTermP(b.tag === 'Ann', b)}`;
    }
    if (t.tag === 'Let')
        return `let ${t.plicity.erased ? `{${t.name}}` : t.name} = ${exports.showTermP(t.val.tag === 'Let', t.val)} in ${exports.showTermP(t.body.tag === 'Ann', t.body)}`;
    if (t.tag === 'Fix')
        return `fix (${t.name} : ${exports.showTermP(t.type.tag === 'Ann', t.type)}). ${exports.showTermP(t.body.tag === 'Ann', t.body)}`;
    if (t.tag === 'Unroll')
        return `unroll ${exports.showTermP(t.term.tag === 'Ann', t.term)}`;
    if (t.tag === 'Roll')
        return !t.type ? `roll ${exports.showTermP(t.term.tag === 'Ann', t.term)}` : `roll {${exports.showTerm(t.type)}} ${exports.showTermP(t.term.tag === 'Ann', t.term)}`;
    if (t.tag === 'Ann')
        return `${exports.showTermP(t.term.tag === 'Ann', t.term)} : ${exports.showTermP(t.term.tag === 'Ann', t.type)}`;
    if (t.tag === 'Assert')
        return !t.type ? `assert ${exports.showTermP(t.term.tag === 'Ann', t.term)}` : `assert {${exports.showTerm(t.type)}} ${exports.showTermP(t.term.tag === 'Ann', t.term)}`;
    return t;
};
exports.eraseTypes = (t) => {
    if (t.tag === 'Var')
        return t;
    if (t.tag === 'Meta')
        return t;
    if (t.tag === 'Hole')
        return t;
    if (t.tag === 'App')
        return t.plicity.erased ? exports.eraseTypes(t.left) : exports.App(exports.eraseTypes(t.left), t.plicity, exports.eraseTypes(t.right));
    if (t.tag === 'Abs')
        return t.plicity.erased ? exports.eraseTypes(t.body) : exports.Abs(t.plicity, t.name, null, exports.eraseTypes(t.body));
    if (t.tag === 'Let')
        return t.plicity.erased ? exports.eraseTypes(t.body) : exports.Let(t.plicity, t.name, exports.eraseTypes(t.val), exports.eraseTypes(t.body));
    if (t.tag === 'Roll')
        return exports.eraseTypes(t.term);
    if (t.tag === 'Unroll')
        return exports.eraseTypes(t.term);
    if (t.tag === 'Assert')
        return exports.eraseTypes(t.term);
    if (t.tag === 'Pi')
        return exports.Type;
    if (t.tag === 'Fix')
        return exports.Type;
    if (t.tag === 'Type')
        return exports.Type;
    if (t.tag === 'Ann')
        return exports.eraseTypes(t.term);
    return t;
};

},{}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const syntax_1 = require("../core/syntax");
exports.Var = (index) => ({ tag: 'Var', index });
exports.App = (left, right) => ({ tag: 'App', left, right });
exports.Abs = (body) => ({ tag: 'Abs', body });
exports.idTerm = exports.Abs(exports.Var(0));
exports.showTermS = (t) => {
    if (t.tag === 'Var')
        return `${t.index}`;
    if (t.tag === 'App')
        return `(${exports.showTermS(t.left)} ${exports.showTermS(t.right)})`;
    if (t.tag === 'Abs')
        return `(\\${exports.showTermS(t.body)})`;
    return t;
};
exports.flattenApp = (t) => {
    const r = [];
    while (t.tag === 'App') {
        r.push(t.right);
        t = t.left;
    }
    return [t, r.reverse()];
};
exports.showTermP = (b, t) => b ? `(${exports.showTerm(t)})` : exports.showTerm(t);
exports.showTerm = (t) => {
    if (t.tag === 'Var')
        return `${t.index}`;
    if (t.tag === 'App') {
        const [f, as] = exports.flattenApp(t);
        return `${exports.showTermP(f.tag === 'Abs' || f.tag === 'App', f)} ${as.map((t, i) => `${exports.showTermP(t.tag === 'App' || (t.tag === 'Abs' && i < as.length - 1), t)}`).join(' ')}`;
    }
    if (t.tag === 'Abs')
        return `\\${exports.showTerm(t.body)}`;
    return t;
};
exports.shift = (d, c, t) => {
    if (t.tag === 'Var')
        return t.index < c ? t : exports.Var(t.index + d);
    if (t.tag === 'Abs')
        return exports.Abs(exports.shift(d, c + 1, t.body));
    if (t.tag === 'App')
        return exports.App(exports.shift(d, c, t.left), exports.shift(d, c, t.right));
    return t;
};
exports.erase = (t) => {
    if (t.tag === 'Var')
        return exports.Var(t.index);
    if (t.tag === 'App')
        return t.plicity.erased ? exports.erase(t.left) : exports.App(exports.erase(t.left), exports.erase(t.right));
    if (t.tag === 'Abs')
        return t.plicity.erased ? exports.shift(-1, 0, exports.erase(t.body)) : exports.Abs(exports.erase(t.body));
    if (t.tag === 'Let')
        return t.plicity.erased ? exports.shift(-1, 0, exports.erase(t.body)) : exports.App(exports.Abs(exports.erase(t.body)), exports.erase(t.val));
    if (t.tag === 'Roll')
        return exports.erase(t.term);
    if (t.tag === 'Unroll')
        return exports.erase(t.term);
    if (t.tag === 'Assert')
        return exports.erase(t.term);
    if (t.tag === 'Pi')
        return exports.idTerm;
    if (t.tag === 'Fix')
        return exports.idTerm;
    if (t.tag === 'Type')
        return exports.idTerm;
    throw new Error(`unable to erase: ${syntax_1.showTerm(t)}`);
};

},{"../core/syntax":2}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
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

},{"./repl":8}],20:[function(require,module,exports){

},{}]},{},[19]);
