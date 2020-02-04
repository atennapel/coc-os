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
    if (t.tag === 'Ann')
        return exports.toCore(t.term);
    return util_1.impossible(`toCore failed on ${S.showTerm(t)}`);
};

},{"../surface/syntax":12,"../util":17}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const syntax_1 = require("./syntax");
exports.DDef = (name, value) => ({ tag: 'DDef', name, value });
exports.showDef = (d) => {
    if (d.tag === 'DDef')
        return `def ${d.name} = ${syntax_1.showTerm(d.value)}`;
    return d.tag;
};

},{"./syntax":15}],4:[function(require,module,exports){
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
exports.index = (l, i) => {
    while (l.tag === 'Cons') {
        if (i-- === 0)
            return l.head;
        l = l.tail;
    }
    return null;
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
const config_1 = require("./config");
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
            else if (c === ';')
                state = COMMENT;
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
    config_1.log(() => ts);
    const ex = exprs(ts, '(');
    config_1.log(() => ex);
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

},{"./config":1,"./definitions":3,"./syntax":15,"./util":17}],8:[function(require,module,exports){
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
            const msg = Object.keys(e).map(k => `def ${k} : ${syntax_1.showTerm(syntax_2.fromSurface(domain_1.quote(e[k].type, 0, false)))} = ${syntax_1.showTerm(syntax_2.fromSurface(domain_1.quote(e[k].val, 0, false)))}`).join('\n');
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
            const ty = domain_1.quote(vty, 0, false);
            tm_ = etm;
            config_1.log(() => syntax_1.showTerm(syntax_2.fromSurface(ty)));
            config_1.log(() => syntax_1.showTerm(syntax_2.fromSurface(etm)));
            const eras = syntax_3.erase(syntax_4.toCore(domain_1.normalize(etm, list_1.Nil, 0, true)));
            config_1.log(() => syntax_3.showTerm(eras));
            msg += `type: ${syntax_1.showTerm(syntax_2.fromSurface(ty))}\nterm: ${syntax_1.showTerm(syntax_2.fromSurface(etm))}\neras: ${syntax_3.showTerm(eras)}`;
            if (typeOnly)
                return _cb(msg);
        }
        catch (err) {
            config_1.log(() => '' + err);
            return _cb('' + err, true);
        }
        try {
            const n = domain_1.normalize(tm_, list_1.Nil, 0, true);
            config_1.log(() => syntax_1.showTerm(syntax_2.fromSurface(n)));
            const er = syntax_3.erase(syntax_4.toCore(domain_1.normalize(n, list_1.Nil, 0, true)));
            config_1.log(() => syntax_3.showTerm(er));
            msg += `\nnorm: ${syntax_1.showTerm(syntax_2.fromSurface(n))}\neran: ${syntax_3.showTerm(er)}`;
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

},{"./config":1,"./core/syntax":2,"./list":5,"./parser":7,"./surface/definitions":9,"./surface/domain":10,"./surface/globalenv":11,"./surface/syntax":12,"./surface/typecheck":13,"./syntax":15,"./untyped/syntax":16,"fs":19}],9:[function(require,module,exports){
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

},{"./syntax":12}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const list_1 = require("../list");
const syntax_1 = require("./syntax");
const util_1 = require("../util");
const globalenv_1 = require("./globalenv");
const lazy_1 = require("../lazy");
const syntax_2 = require("../syntax");
const syntax_3 = require("../syntax");
exports.HVar = (index) => ({ tag: 'HVar', index });
exports.HGlobal = (name) => ({ tag: 'HGlobal', name });
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
exports.extendV = (vs, val) => list_1.Cons(val, vs);
exports.showEnvV = (l, k = 0, full = false) => list_1.toString(l, v => syntax_1.showTerm(exports.quote(v, k, full)));
exports.force = (v) => {
    if (v.tag === 'VGlued')
        return exports.force(lazy_1.forceLazy(v.val));
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
    return util_1.impossible(`cannot evaluate: ${syntax_1.showTerm(t)}`);
};
const quoteHead = (h, k) => {
    if (h.tag === 'HVar')
        return syntax_1.Var(k - (h.index + 1));
    if (h.tag === 'HGlobal')
        return syntax_1.Global(h.name);
    return h;
};
const quoteElim = (t, e, k, full) => {
    if (e.tag === 'EApp')
        return syntax_1.App(t, e.plicity, exports.quote(e.arg, k, full));
    if (e.tag === 'EUnroll')
        return syntax_1.Unroll(t);
    return e;
};
exports.quote = (v, k, full) => {
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
exports.normalize = (t, vs, k, full) => exports.quote(exports.evaluate(t, vs), k, full);
exports.showTermQ = (v, k = 0, full = false) => syntax_1.showTerm(exports.quote(v, k, full));
exports.showTermU = (v, ns = list_1.Nil, k = 0, full = false) => syntax_3.showTerm(syntax_1.fromSurface(exports.quote(v, k, full), ns));

},{"../lazy":4,"../list":5,"../syntax":15,"../util":17,"./globalenv":11,"./syntax":12}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let env = {};
exports.globalReset = () => {
    env = {};
};
exports.globalMap = () => env;
exports.globalGet = (name) => env[name] || null;
exports.globalSet = (name, val, type) => {
    env[name] = { val, type };
};
exports.globalDelete = (name) => {
    delete env[name];
};

},{}],12:[function(require,module,exports){
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
exports.showTerm = (t) => {
    if (t.tag === 'Var')
        return `${t.index}`;
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
    return t;
};
exports.toSurface = (t, ns = list_1.Nil, k = 0) => {
    if (t.tag === 'Var') {
        const l = list_1.lookup(ns, t.name);
        return l === null ? exports.Global(t.name) : exports.Var(k - l - 1);
    }
    if (t.tag === 'Hole')
        return exports.Hole;
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
    return t;
};
const isUnsolved = (t) => {
    if (t.tag === 'Hole')
        return true;
    if (t.tag === 'App')
        return isUnsolved(t.left) || isUnsolved(t.right);
    if (t.tag === 'Abs')
        return (t.type && isUnsolved(t.type)) || isUnsolved(t.body);
    if (t.tag === 'Let')
        return isUnsolved(t.val) || isUnsolved(t.body);
    if (t.tag === 'Roll')
        return (t.type && isUnsolved(t.type)) || isUnsolved(t.term);
    if (t.tag === 'Unroll')
        return isUnsolved(t.term);
    if (t.tag === 'Pi')
        return isUnsolved(t.type) || isUnsolved(t.body);
    if (t.tag === 'Fix')
        return isUnsolved(t.type) || isUnsolved(t.body);
    if (t.tag === 'Ann')
        return isUnsolved(t.term) || isUnsolved(t.type);
    if (t.tag === 'Global')
        return false;
    if (t.tag === 'Type')
        return false;
    if (t.tag === 'Var')
        return false;
    return t;
};
const decideName = (x, t, ns) => {
    const a = list_1.indecesOf(ns, x).map(i => indexUsed(i + 1, t)).reduce((x, y) => x || y, false);
    const g = globalUsed(x, t);
    return a || g ? decideName(names_1.nextName(x), t, ns) : x;
};
exports.fromSurface = (t, ns = list_1.Nil) => {
    if (t.tag === 'Var') {
        const l = list_1.index(ns, t.index);
        return l ? S.Var(l) : util_1.impossible(`var index out of range in fromSurface: ${t.index}`);
    }
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

},{"../list":5,"../names":6,"../syntax":15,"../util":17}],13:[function(require,module,exports){
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
    return t;
};
const check = (ns, ts, vs, k, tm, ty) => {
    config_1.log(() => `check ${syntax_1.showFromSurface(tm, ns)} : ${domain_1.showTermU(ty, ns, k)} in ${domain_1.showEnvV(ts, k, false)} and ${domain_1.showEnvV(vs, k, false)}`);
    const tyf = domain_1.force(ty);
    if (tm.tag === 'Abs' && !tm.type && tyf.tag === 'VPi' && syntax_2.eqPlicity(tm.plicity, tyf.plicity)) {
        const v = domain_1.VVar(k);
        const body = check(list_1.Cons(tm.name, ns), domain_1.extendV(ts, tyf.type), domain_1.extendV(vs, v), k + 1, tm.body, tyf.body(v));
        if (tm.plicity.erased && erasedUsed(0, tm.body))
            return util_1.terr(`erased argument used in ${syntax_1.showFromSurface(tm, ns)}`);
        return syntax_1.Abs(tm.plicity, tm.name, domain_1.quote(tyf.type, k, false), body);
    }
    if (tm.tag === 'Roll' && !tm.type && tyf.tag === 'VFix') {
        const term = check(ns, ts, vs, k, tm.term, tyf.body(ty));
        return syntax_1.Roll(domain_1.quote(tyf.type, k, false), term);
    }
    if (tm.tag === 'Let') {
        const [val, vty] = synth(ns, ts, vs, k, tm.val);
        const body = check(list_1.Cons(tm.name, ns), domain_1.extendV(ts, vty), domain_1.extendV(vs, domain_1.evaluate(val, vs)), k + 1, tm.body, ty);
        if (tm.plicity.erased && erasedUsed(0, tm.body))
            return util_1.terr(`erased argument used in ${syntax_1.showFromSurface(tm, ns)}`);
        return syntax_1.Let(tm.plicity, tm.name, val, body);
    }
    const [etm, ty2] = synth(ns, ts, vs, k, tm);
    try {
        unify_1.unify(ns, k, ty2, ty);
    }
    catch (err) {
        if (!(err instanceof TypeError))
            throw err;
        util_1.terr(`failed to unify ${domain_1.showTermU(ty2, ns, k)} ~ ${domain_1.showTermU(ty, ns, k)}: ${err.message}`);
    }
    return etm;
};
const synth = (ns, ts, vs, k, tm) => {
    config_1.log(() => `synth ${syntax_1.showFromSurface(tm, ns)} in ${domain_1.showEnvV(ts, k, false)} and ${domain_1.showEnvV(vs, k, false)}`);
    if (tm.tag === 'Type')
        return [tm, domain_1.VType];
    if (tm.tag === 'Var') {
        const ty = list_1.index(ts, tm.index);
        if (!ty)
            return util_1.terr(`var out of scope ${syntax_1.showFromSurface(tm, ns)}`);
        return [tm, ty];
    }
    if (tm.tag === 'Global') {
        const entry = globalenv_1.globalGet(tm.name);
        if (!entry)
            return util_1.terr(`global ${tm.name} not found`);
        return [tm, entry.type];
    }
    if (tm.tag === 'App') {
        const [left, ty_] = synth(ns, ts, vs, k, tm.left);
        const ty = domain_1.force(ty_);
        if (ty.tag === 'VPi' && syntax_2.eqPlicity(ty.plicity, tm.plicity)) {
            const right = check(ns, ts, vs, k, tm.right, ty.type);
            return [syntax_1.App(left, tm.plicity, right), ty.body(domain_1.evaluate(right, vs))];
        }
        return util_1.terr(`invalid type or plicity mismatch in synthapp in ${syntax_1.showFromSurface(tm, ns)}: ${domain_1.showTermU(ty, ns, k)} ${tm.plicity.erased ? '-' : ''}@ ${syntax_1.showFromSurface(tm.right, ns)}`);
    }
    if (tm.tag === 'Abs' && tm.type) {
        const type = check(ns, ts, vs, k, tm.type, domain_1.VType);
        const vtype = domain_1.evaluate(type, vs);
        const [body, rt] = synth(list_1.Cons(tm.name, ns), domain_1.extendV(ts, vtype), domain_1.extendV(vs, domain_1.VVar(k)), k + 1, tm.body);
        if (tm.plicity.erased && erasedUsed(0, tm.body))
            return util_1.terr(`erased argument used in ${syntax_1.showFromSurface(tm, ns)}`);
        // TODO: avoid quote here
        const pi = domain_1.evaluate(syntax_1.Pi(tm.plicity, tm.name, type, domain_1.quote(rt, k + 1, false)), vs);
        return [syntax_1.Abs(tm.plicity, tm.name, type, body), pi];
    }
    if (tm.tag === 'Let') {
        const [val, vty] = synth(ns, ts, vs, k, tm.val);
        const [body, rt] = synth(list_1.Cons(tm.name, ns), domain_1.extendV(ts, vty), domain_1.extendV(vs, domain_1.evaluate(val, vs)), k + 1, tm.body);
        if (tm.plicity.erased && erasedUsed(0, tm.body))
            return util_1.terr(`erased argument used in ${syntax_1.showFromSurface(tm, ns)}`);
        return [syntax_1.Let(tm.plicity, tm.name, val, body), rt];
    }
    if (tm.tag === 'Pi') {
        const type = check(ns, ts, vs, k, tm.type, domain_1.VType);
        const body = check(list_1.Cons(tm.name, ns), domain_1.extendV(ts, domain_1.evaluate(type, vs)), domain_1.extendV(vs, domain_1.VVar(k)), k + 1, tm.body, domain_1.VType);
        return [syntax_1.Pi(tm.plicity, tm.name, type, body), domain_1.VType];
    }
    if (tm.tag === 'Fix') {
        const type = check(ns, ts, vs, k, tm.type, domain_1.VType);
        const vt = domain_1.evaluate(type, vs);
        const body = check(list_1.Cons(tm.name, ns), domain_1.extendV(ts, vt), domain_1.extendV(vs, domain_1.VVar(k)), k + 1, tm.body, vt);
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
    return util_1.terr(`cannot synth ${syntax_1.showFromSurface(tm, ns)}`);
};
exports.typecheck = (tm) => synth(list_1.Nil, list_1.Nil, list_1.Nil, 0, tm);
exports.typecheckDefs = (ds, allowRedefinition = false) => {
    const xs = [];
    for (let i = 0; i < ds.length; i++) {
        const d = ds[i];
        config_1.log(() => `typecheckDefs ${definitions_1.showDef(d)}`);
        if (d.tag === 'DDef') {
            if (!allowRedefinition && globalenv_1.globalGet(d.name))
                return util_1.terr(`cannot redefine global ${d.name}`);
            const [tm, ty] = exports.typecheck(d.value);
            globalenv_1.globalSet(d.name, domain_1.evaluate(tm), ty);
            xs.push(d.name);
        }
    }
    return xs;
};

},{"../config":1,"../list":5,"../syntax":15,"../util":17,"./definitions":9,"./domain":10,"./globalenv":11,"./syntax":12,"./unify":14}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const domain_1 = require("./domain");
const util_1 = require("../util");
const syntax_1 = require("../syntax");
const list_1 = require("../list");
const lazy_1 = require("../lazy");
const config_1 = require("../config");
const eqHead = (a, b) => {
    if (a === b)
        return true;
    if (a.tag === 'HVar')
        return b.tag === 'HVar' && a.index === b.index;
    if (a.tag === 'HGlobal')
        return b.tag === 'HGlobal' && a.name === b.name;
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
exports.unify = (ns, k, a, b) => {
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
    if (a.tag === 'VGlued' && b.tag === 'VGlued' && eqHead(a.head, b.head) && list_1.length(a.args) === list_1.length(b.args)) {
        try {
            return list_1.zipWithR_((x, y) => unifyElim(ns, k, x, y, a, b), a.args, b.args);
        }
        catch (err) {
            if (!(err instanceof TypeError))
                throw err;
            return exports.unify(ns, k, lazy_1.forceLazy(a.val), lazy_1.forceLazy(b.val));
        }
    }
    if (a.tag === 'VGlued')
        return exports.unify(ns, k, lazy_1.forceLazy(a.val), b);
    if (b.tag === 'VGlued')
        return exports.unify(ns, k, a, lazy_1.forceLazy(b.val));
    return util_1.terr(`unify failed (${k}): ${domain_1.showTermU(a, ns, k)} ~ ${domain_1.showTermU(b, ns, k)}`);
};

},{"../config":1,"../lazy":4,"../list":5,"../syntax":15,"../util":17,"./domain":10}],15:[function(require,module,exports){
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
exports.showTermS = (t) => {
    if (t.tag === 'Var')
        return t.name;
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
    if (t.tag === 'Hole')
        return '_';
    if (t.tag === 'App') {
        const [f, as] = exports.flattenApp(t);
        return `${exports.showTermP(f.tag === 'Abs' || f.tag === 'Pi' || f.tag === 'App' || f.tag === 'Let' || f.tag === 'Ann' || f.tag === 'Roll' || f.tag === 'Fix', f)} ${as.map(([im, t], i) => im.erased ? `{${exports.showTerm(t)}}` :
            `${exports.showTermP(t.tag === 'App' || t.tag === 'Ann' || t.tag === 'Let' || (t.tag === 'Abs' && i < as.length - 1) || t.tag === 'Pi' || f.tag === 'Fix', t)}`).join(' ')}`;
    }
    if (t.tag === 'Abs') {
        const [as, b] = exports.flattenAbs(t);
        return `\\${as.map(([x, im, t]) => im.erased ? `{${x}${t ? ` : ${exports.showTermP(t.tag === 'Ann', t)}` : ''}}` : !t ? x : `(${x} : ${exports.showTermP(t.tag === 'Ann', t)})`).join(' ')}. ${exports.showTermP(b.tag === 'Ann', b)}`;
    }
    if (t.tag === 'Pi') {
        const [as, b] = exports.flattenPi(t);
        return `${as.map(([x, im, t]) => x === '_' ? (im.erased ? `${im ? '{' : ''}${exports.showTerm(t)}${im.erased ? '}' : ''}` : `${exports.showTermP(t.tag === 'Ann' || t.tag === 'Abs' || t.tag === 'Let' || t.tag === 'Pi' || t.tag === 'Fix', t)}`) : `${im ? '{' : '('}${x} : ${exports.showTermP(t.tag === 'Ann', t)}${im ? '}' : ')'}`).join(' -> ')} -> ${exports.showTermP(b.tag === 'Ann', b)}`;
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
    return t;
};

},{}],16:[function(require,module,exports){
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
    if (t.tag === 'Pi')
        return exports.idTerm;
    if (t.tag === 'Fix')
        return exports.idTerm;
    if (t.tag === 'Type')
        return exports.idTerm;
    throw new Error(`unable to erase: ${syntax_1.showTerm(t)}`);
};

},{"../core/syntax":2}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
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

},{"./repl":8}],19:[function(require,module,exports){

},{}]},{},[18]);
