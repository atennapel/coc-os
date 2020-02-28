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
const syntax_1 = require("./syntax");
exports.DDef = (name, value) => ({ tag: 'DDef', name, value });
exports.showDef = (d) => {
    if (d.tag === 'DDef')
        return `def ${d.name} = ${syntax_1.showTerm(d.value)}`;
    return d.tag;
};
exports.toInternalDef = (d) => {
    if (d.tag === 'DDef')
        return exports.DDef(d.name, syntax_1.toInternal(d.value));
    return d.tag;
};
exports.toInternalDefs = (d) => d.map(exports.toInternalDef);

},{"./syntax":10}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const list_1 = require("./utils/list");
const lazy_1 = require("./utils/lazy");
const surface_1 = require("./surface");
const syntax_1 = require("./syntax");
const util_1 = require("./utils/util");
const globalenv_1 = require("./globalenv");
const metas_1 = require("./metas");
exports.HVar = (index) => ({ tag: 'HVar', index });
exports.HGlobal = (name) => ({ tag: 'HGlobal', name });
exports.HMeta = (index) => ({ tag: 'HMeta', index });
exports.EApp = (arg) => ({ tag: 'EApp', arg });
exports.VNe = (head, args) => ({ tag: 'VNe', head, args });
exports.VGlued = (head, args, val) => ({ tag: 'VGlued', head, args, val });
exports.VAbs = (name, body) => ({ tag: 'VAbs', name, body });
exports.VPi = (plicity, name, type, body) => ({ tag: 'VPi', name, plicity, type, body });
exports.VFix = (self, name, type, body) => ({ tag: 'VFix', self, name, type, body });
exports.VType = { tag: 'VType' };
exports.VVar = (index) => exports.VNe(exports.HVar(index), list_1.Nil);
exports.VGlobal = (name) => exports.VNe(exports.HGlobal(name), list_1.Nil);
exports.VMeta = (index) => exports.VNe(exports.HMeta(index), list_1.Nil);
exports.extendV = (vs, val) => list_1.Cons(val, vs);
exports.showEnvV = (l, k = 0, full = false) => list_1.listToString(l, v => syntax_1.showTerm(exports.quote(v, k, full)));
exports.force = (v) => {
    if (v.tag === 'VGlued')
        return exports.force(lazy_1.forceLazy(v.val));
    if (v.tag === 'VNe' && v.head.tag === 'HMeta') {
        const val = metas_1.metaGet(v.head.index);
        if (val.tag === 'Unsolved')
            return v;
        return exports.force(list_1.foldr((elim, y) => exports.vapp(y, elim.arg), val.val, v.args));
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
        const delayed = lazy_1.Lazy(() => exports.forceGlue(list_1.foldr((elim, y) => exports.vapp(y, elim.arg), val.val, v.args)));
        return exports.VGlued(v.head, v.args, delayed);
    }
    return v;
};
exports.vapp = (a, b) => {
    if (a.tag === 'VAbs')
        return a.body(b);
    if (a.tag === 'VNe')
        return exports.VNe(a.head, list_1.Cons(exports.EApp(b), a.args));
    if (a.tag === 'VGlued')
        return exports.VGlued(a.head, list_1.Cons(exports.EApp(b), a.args), lazy_1.mapLazy(a.val, v => exports.vapp(v, b)));
    return util_1.impossible(`vapp: ${a.tag}`);
};
exports.evaluate = (t, vs) => {
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
        return t.plicity ? exports.evaluate(t.left, vs) : exports.vapp(exports.evaluate(t.left, vs), exports.evaluate(t.right, vs));
    if (t.tag === 'Abs')
        return t.plicity ? exports.evaluate(t.body, exports.extendV(vs, exports.VVar(-1))) :
            exports.VAbs(t.name, v => exports.evaluate(t.body, exports.extendV(vs, v)));
    if (t.tag === 'Let')
        return t.plicity ? exports.evaluate(t.body, exports.extendV(vs, exports.VVar(-1))) : exports.evaluate(t.body, exports.extendV(vs, exports.evaluate(t.val, vs)));
    if (t.tag === 'Pi')
        return exports.VPi(t.plicity, t.name, exports.evaluate(t.type, vs), v => exports.evaluate(t.body, exports.extendV(vs, v)));
    if (t.tag === 'Fix')
        return exports.VFix(t.self, t.name, exports.evaluate(t.type, vs), (vself, vtype) => exports.evaluate(t.body, exports.extendV(exports.extendV(vs, vself), vtype)));
    if (t.tag === 'Ann')
        return exports.evaluate(t.term, vs);
    if (t.tag === 'Roll')
        return exports.evaluate(t.term, vs);
    if (t.tag === 'Unroll')
        return exports.evaluate(t.term, vs);
    if (t.tag === 'Hole')
        return util_1.impossible(`cannot evaluate ${syntax_1.showTerm(t)}`);
    return t;
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
        return syntax_1.App(t, false, exports.quote(e.arg, k, full));
    return e.tag;
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
        return syntax_1.Abs(false, v.name, null, exports.quote(v.body(exports.VVar(k)), k + 1, full));
    if (v.tag === 'VPi')
        return syntax_1.Pi(v.plicity, v.name, exports.quote(v.type, k, full), exports.quote(v.body(exports.VVar(k)), k + 1, full));
    if (v.tag === 'VFix')
        return syntax_1.Fix(v.self, v.name, exports.quote(v.type, k, full), exports.quote(v.body(exports.VVar(k), exports.VVar(k + 1)), k + 2, full));
    return v;
};
exports.normalize = (t, vs, k, full) => exports.quote(exports.evaluate(t, vs), k, full);
exports.showTermQ = (v, k = 0, full = false) => syntax_1.showTerm(exports.quote(v, k, full));
exports.showTermU = (v, ns = list_1.Nil, k = 0, full = false) => {
    const term = exports.quote(v, k, full);
    const surface = syntax_1.toSurface(term, ns);
    return surface_1.showTerm(surface);
};
exports.showTermUZ = (v, ns = list_1.Nil, vs = list_1.Nil, k = 0, full = false) => {
    const term = exports.zonk(exports.quote(v, k, full), vs, k, full);
    const surface = syntax_1.toSurface(term, ns);
    return surface_1.showTerm(surface);
};
exports.showElimQ = (e, k = 0, full = false) => {
    if (e.tag === 'EApp')
        return exports.showTermQ(e.arg, k, full);
    return e.tag;
};
exports.showElimU = (e, ns = list_1.Nil, k = 0, full = false) => {
    if (e.tag === 'EApp')
        return exports.showTermU(e.arg, ns, k, full);
    return e.tag;
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
            [false, exports.vapp(spine[1], exports.evaluate(tm.right, vs))];
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
        return syntax_1.Fix(tm.self, tm.name, exports.zonk(tm.type, vs, k, full), exports.zonk(tm.body, exports.extendV(exports.extendV(vs, exports.VVar(k)), exports.VVar(k + 1)), k + 2, full));
    if (tm.tag === 'Let')
        return syntax_1.Let(tm.plicity, tm.name, exports.zonk(tm.val, vs, k, full), exports.zonk(tm.body, exports.extendV(vs, exports.VVar(k)), k + 1, full));
    if (tm.tag === 'Ann')
        return syntax_1.Ann(exports.zonk(tm.term, vs, k, full), exports.zonk(tm.type, vs, k, full));
    if (tm.tag === 'Unroll')
        return syntax_1.Unroll(exports.zonk(tm.term, vs, k, full));
    if (tm.tag === 'Roll')
        return syntax_1.Roll(tm.type && exports.zonk(tm.type, vs, k, full), exports.zonk(tm.term, vs, k, full));
    if (tm.tag === 'Abs')
        return syntax_1.Abs(tm.plicity, tm.name, tm.type && exports.zonk(tm.type, vs, k, full), exports.zonk(tm.body, exports.extendV(vs, exports.VVar(k)), k + 1, full));
    if (tm.tag === 'App') {
        const spine = zonkSpine(tm.left, vs, k, full);
        return spine[0] ?
            syntax_1.App(spine[1], tm.plicity, exports.zonk(tm.right, vs, k, full)) :
            exports.quote(exports.vapp(spine[1], exports.evaluate(tm.right, vs)), k, full);
    }
    return tm;
};

},{"./globalenv":4,"./metas":5,"./surface":9,"./syntax":10,"./utils/lazy":13,"./utils/list":14,"./utils/util":15}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const syntax_1 = require("./syntax");
const util_1 = require("./utils/util");
const Unsolved = { tag: 'Unsolved' };
const Solved = (val) => ({ tag: 'Solved', val });
let metas = [];
const stack = [];
exports.metaUnsolved = () => metas.some(x => x.tag === 'Unsolved');
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

},{"./syntax":10,"./utils/util":15}],6:[function(require,module,exports){
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
const util_1 = require("./utils/util");
const surface_1 = require("./surface");
const surface_2 = require("./surface");
const config_1 = require("./config");
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
const SYM1 = ['\\', ':', '/', '.', '*', '=', '@'];
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
            if (!(/[\@a-z0-9\-\_\/]/i.test(c) || (c === '.' && /[a-z0-9]/i.test(next)))) {
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
const tunit = surface_1.Var('UnitType');
const unit = surface_1.Var('Unit');
const isName = (t, x) => t.tag === 'Name' && t.name === x;
const isNames = (t) => t.map(x => {
    if (x.tag !== 'Name')
        return util_1.serr(`expected name`);
    return x.name;
});
const splitTokens = (a, fn, keepSymbol = false) => {
    const r = [];
    let t = [];
    for (let i = 0, l = a.length; i < l; i++) {
        const c = a[i];
        if (fn(c)) {
            r.push(t);
            t = keepSymbol ? [c] : [];
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
            return [surface_1.Type, false];
        if (x.includes('@'))
            return util_1.serr(`invalid name: ${x}`);
        if (x.startsWith('_'))
            return [surface_1.Hole(x.slice(1) || null), false];
        if (/[a-z]/i.test(x[0]))
            return [surface_1.Var(x), false];
        return util_1.serr(`invalid name: ${x}`);
    }
    if (t.tag === 'Num') {
        if (t.num.endsWith('b')) {
            const n = +t.num.slice(0, -1);
            if (isNaN(n))
                return util_1.serr(`invalid number: ${t.num}`);
            const s0 = surface_1.Var('B0');
            const s1 = surface_1.Var('B1');
            let c = surface_1.Var('BE');
            const s = n.toString(2);
            for (let i = 0; i < s.length; i++)
                c = surface_1.App(s[i] === '0' ? s0 : s1, false, c);
            return [c, false];
        }
        else {
            const n = +t.num;
            if (isNaN(n))
                return util_1.serr(`invalid number: ${t.num}`);
            const s = surface_1.Var('S');
            let c = surface_1.Var('Z');
            for (let i = 0; i < n; i++)
                c = surface_1.App(s, false, c);
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
        return surface_1.Ann(exprs(a, '('), exprs(b, '('));
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
        return args.reduceRight((x, [name, impl, ty]) => surface_1.Abs(impl, name, ty, x), body);
    }
    if (isName(ts[0], 'unroll')) {
        if (ts.length < 2)
            return util_1.serr(`something went wrong when parsing unroll`);
        if (ts.length === 2) {
            const [term, tb] = expr(ts[1]);
            if (tb)
                return util_1.serr(`something went wrong when parsing unroll`);
            return surface_1.Unroll(term);
        }
        const indPart = ts.slice(0, 2);
        const rest = ts.slice(2);
        return exprs([TList(indPart, '(')].concat(rest), '(');
    }
    if (isName(ts[0], 'roll')) {
        if (ts[1].tag === 'List' && ts[1].bracket === '{') {
            const [ty, b] = expr(ts[1]);
            if (!b)
                return util_1.serr(`something went wrong when parsing roll`);
            const body = exprs(ts.slice(2), '(');
            return surface_1.Roll(ty, body);
        }
        else {
            const body = exprs(ts.slice(1), '(');
            return surface_1.Roll(null, body);
        }
    }
    if (isName(ts[0], 'fix')) {
        const args = ts[1];
        if (args.tag !== 'List' || args.bracket !== '(')
            return util_1.serr(`fix missing params`);
        const content = args.list;
        let ty = surface_1.Type;
        let name = '_';
        let self = '_';
        if (isName(content[1], '@')) {
            if (content[0].tag !== 'Name')
                return util_1.serr(`invalid self name in fix`);
            self = content[0].name;
            if (content[2].tag !== 'Name')
                return util_1.serr(`invalid type name in fix`);
            name = content[2].name;
            if (!isName(content[3], ':'))
                return util_1.serr(`: expected in Fix`);
            ty = exprs(content.slice(4), '(');
        }
        else if (isName(content[1], ':')) {
            if (content[0].tag !== 'Name')
                return util_1.serr(`invalid type name in fix`);
            name = content[0].name;
            ty = exprs(content.slice(2), '(');
        }
        else
            util_1.serr(`invalid params for fix`);
        if (!isName(ts[2], '.'))
            return util_1.serr(`. expected after fix params`);
        const body = exprs(ts.slice(3), '(');
        return surface_1.Fix(self, name, ty, body);
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
        return surface_1.Let(impl, name, val, body);
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
        return args.reduceRight((x, [name, impl, ty]) => surface_1.Pi(impl, name, ty, x), body);
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
    return all.slice(1).reduce((x, [y, impl]) => surface_1.App(x, impl, y), all[0][0]);
};
exports.parse = (s) => {
    const ts = tokenize(s);
    const ex = exprs(ts, '(');
    return ex;
};
exports.parseDef = async (c, importMap) => {
    if (c.length === 0)
        return [];
    if (c[0].tag === 'Name' && c[0].name === 'import') {
        const files = c.slice(1).map(t => {
            if (t.tag !== 'Name')
                return util_1.serr(`trying to import a non-path`);
            if (importMap[t.name]) {
                config_1.log(() => `skipping import ${t.name}`);
                return null;
            }
            return t.name;
        }).filter(x => x);
        config_1.log(() => `import ${files.join(' ')}`);
        const imps = await Promise.all(files.map(util_1.loadFile));
        const defs = await Promise.all(imps.map(s => exports.parseDefs(s, importMap)));
        const fdefs = defs.reduce((x, y) => x.concat(y), []);
        fdefs.forEach(t => importMap[t.name] = true);
        config_1.log(() => `imported ${fdefs.map(x => x.name).join(' ')}`);
        return fdefs;
    }
    else if (c[0].tag === 'Name' && c[0].name === 'def') {
        if (c[1].tag === 'Name') {
            const name = c[1].name;
            const fst = 2;
            const sym = c[fst];
            if (sym.tag !== 'Name')
                return util_1.serr(`def: after name should be : or =`);
            if (sym.name === '=') {
                return [surface_2.DDef(name, exprs(c.slice(fst + 1), '('))];
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
                return [surface_2.DDef(name, surface_1.Ann(body, ety))];
            }
            else
                return util_1.serr(`def: : or = expected but got ${sym.name}`);
        }
        else
            return util_1.serr(`def should start with a name`);
    }
    else
        return util_1.serr(`def should start with def or import`);
};
exports.parseDefs = async (s, importMap) => {
    const ts = tokenize(s);
    if (ts[0].tag !== 'Name' || (ts[0].name !== 'def' && ts[0].name !== 'import'))
        return util_1.serr(`def should start with "def" or "import"`);
    const spl = splitTokens(ts, t => t.tag === 'Name' && (t.name === 'def' || t.name === 'import'), true);
    const ds = await Promise.all(spl.map(s => exports.parseDef(s, importMap)));
    return ds.reduce((x, y) => x.concat(y), []);
};

},{"./config":1,"./surface":9,"./utils/util":15}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const surface_1 = require("./surface");
const parser_1 = require("./parser");
const list_1 = require("./utils/list");
const util_1 = require("./utils/util");
const globalenv_1 = require("./globalenv");
const definitions_1 = require("./definitions");
const typecheck_1 = require("./typecheck");
const domain_1 = require("./domain");
const syntax_1 = require("./syntax");
const help = `
EXAMPLES
identity = \\{t : *} (x : t). x
zero = \\{t} z s. z : {t : *} -> t -> (t -> t) -> t

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
`.trim();
let importMap = {};
exports.initREPL = () => {
    globalenv_1.globalReset();
    importMap = {};
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
            const msg = Object.keys(e).map(k => `def ${k} : ${domain_1.showTermUZ(e[k].type)} = ${syntax_1.showSurface(e[k].term)} ~> ${domain_1.showTermUZ(e[k].val)}`).join('\n');
            return _cb(msg || 'no definitions');
        }
        if (_s.startsWith(':del')) {
            const name = _s.slice(4).trim();
            globalenv_1.globalDelete(name);
            return _cb(`deleted ${name}`);
        }
        if (_s.startsWith(':def') || _s.startsWith(':import')) {
            const rest = _s.slice(1);
            parser_1.parseDefs(rest, importMap).then(ds => {
                const dsc = definitions_1.toInternalDefs(ds);
                const xs = typecheck_1.typecheckDefs(dsc, true);
                return _cb(`defined ${xs.join(' ')}`);
            }).catch(err => _cb('' + err, true));
            return;
        }
        if (_s.startsWith(':gtype')) {
            const name = _s.slice(6).trim();
            const res = globalenv_1.globalGet(name);
            if (!res)
                return _cb(`undefined global: ${name}`, true);
            return _cb(domain_1.showTermUZ(res.type, list_1.Nil, list_1.Nil, 0, true));
        }
        if (_s.startsWith(':gelab')) {
            const name = _s.slice(6).trim();
            const res = globalenv_1.globalGet(name);
            if (!res)
                return _cb(`undefined global: ${name}`, true);
            return _cb(syntax_1.showSurface(res.term));
        }
        if (_s.startsWith(':gterm')) {
            const name = _s.slice(7).trim();
            const res = globalenv_1.globalGet(name);
            if (!res)
                return _cb(`undefined global: ${name}`, true);
            return _cb(domain_1.showTermUZ(res.val));
        }
        if (_s.startsWith(':gnorm')) {
            const name = _s.slice(7).trim();
            const res = globalenv_1.globalGet(name);
            if (!res)
                return _cb(`undefined global: ${name}`, true);
            return _cb(domain_1.showTermUZ(res.val, list_1.Nil, list_1.Nil, 0, true));
        }
        if (_s.startsWith(':view')) {
            const files = _s.slice(5).trim().split(/\s+/g);
            Promise.all(files.map(util_1.loadFile)).then(ds => {
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
            config_1.log(() => surface_1.showTerm(t));
            const tt = syntax_1.toInternal(t);
            const vty = typecheck_1.typecheck(tt);
            tm_ = tt;
            config_1.log(() => domain_1.showTermUZ(vty));
            config_1.log(() => syntax_1.showSurface(tt));
            msg += `type: ${domain_1.showTermUZ(vty)}\nterm: ${syntax_1.showSurface(tm_)}`;
            if (typeOnly)
                return _cb(msg);
        }
        catch (err) {
            config_1.log(() => '' + err);
            return _cb('' + err, true);
        }
        try {
            const n = domain_1.normalize(tm_, list_1.Nil, 0, true);
            config_1.log(() => syntax_1.showSurface(n));
            return _cb(`${msg}\nnorm: ${syntax_1.showSurface(n)}`);
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

},{"./config":1,"./definitions":2,"./domain":3,"./globalenv":4,"./parser":7,"./surface":9,"./syntax":10,"./typecheck":11,"./utils/list":14,"./utils/util":15}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Var = (name) => ({ tag: 'Var', name });
exports.App = (left, plicity, right) => ({ tag: 'App', left, plicity, right });
exports.Abs = (plicity, name, type, body) => ({ tag: 'Abs', plicity, name, type, body });
exports.Let = (plicity, name, val, body) => ({ tag: 'Let', plicity, name, val, body });
exports.Roll = (type, term) => ({ tag: 'Roll', type, term });
exports.Unroll = (term) => ({ tag: 'Unroll', term });
exports.Pi = (plicity, name, type, body) => ({ tag: 'Pi', plicity, name, type, body });
exports.Fix = (self, name, type, body) => ({ tag: 'Fix', self, name, type, body });
exports.Type = { tag: 'Type' };
exports.Ann = (term, type) => ({ tag: 'Ann', term, type });
exports.Hole = (name = null) => ({ tag: 'Hole', name });
exports.Meta = (index) => ({ tag: 'Meta', index });
exports.showTermS = (t) => {
    if (t.tag === 'Var')
        return t.name;
    if (t.tag === 'Meta')
        return `?${t.index}`;
    if (t.tag === 'App')
        return `(${exports.showTermS(t.left)} ${t.plicity ? '-' : ''}${exports.showTermS(t.right)})`;
    if (t.tag === 'Abs')
        return t.type ? `(\\(${t.plicity ? '-' : ''}${t.name} : ${exports.showTermS(t.type)}). ${exports.showTermS(t.body)})` : `(\\${t.plicity ? '-' : ''}${t.name}. ${exports.showTermS(t.body)})`;
    if (t.tag === 'Let')
        return `(let ${t.plicity ? '-' : ''}${t.name} = ${exports.showTermS(t.val)} in ${exports.showTermS(t.body)})`;
    if (t.tag === 'Roll')
        return t.type ? `(roll {${exports.showTermS(t.type)}} ${exports.showTermS(t.term)})` : `(roll ${exports.showTermS(t.term)})`;
    if (t.tag === 'Unroll')
        return `(unroll ${exports.showTermS(t.term)})`;
    if (t.tag === 'Pi')
        return `(/(${t.plicity ? '-' : ''}${t.name} : ${exports.showTermS(t.type)}). ${exports.showTermS(t.body)})`;
    if (t.tag === 'Fix')
        return `(fix (${t.self} @ ${t.name} : ${exports.showTermS(t.type)}). ${exports.showTermS(t.body)})`;
    if (t.tag === 'Type')
        return '*';
    if (t.tag === 'Ann')
        return `(${exports.showTermS(t.term)} : ${exports.showTermS(t.type)})`;
    if (t.tag === 'Hole')
        return `_${t.name || ''}`;
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
    if (t.tag === 'App') {
        const [f, as] = exports.flattenApp(t);
        return `${exports.showTermP(f.tag === 'Abs' || f.tag === 'Pi' || f.tag === 'Fix' || f.tag === 'App' || f.tag === 'Let' || f.tag === 'Ann' || f.tag === 'Roll', f)} ${as.map(([im, t], i) => im ? `{${exports.showTerm(t)}}` :
            `${exports.showTermP(t.tag === 'App' || t.tag === 'Ann' || t.tag === 'Let' || (t.tag === 'Abs' && i < as.length - 1) || t.tag === 'Pi' || t.tag === 'Fix' || t.tag === 'Unroll' || t.tag === 'Roll', t)}`).join(' ')}`;
    }
    if (t.tag === 'Abs') {
        const [as, b] = exports.flattenAbs(t);
        return `\\${as.map(([x, im, t]) => im ? `{${x}${t ? ` : ${exports.showTermP(t.tag === 'Ann', t)}` : ''}}` : !t ? x : `(${x} : ${exports.showTermP(t.tag === 'Ann', t)})`).join(' ')}. ${exports.showTermP(b.tag === 'Ann', b)}`;
    }
    if (t.tag === 'Pi') {
        const [as, b] = exports.flattenPi(t);
        return `${as.map(([x, im, t]) => x === '_' ? (im ? `${im ? '{' : ''}${exports.showTerm(t)}${im ? '}' : ''}` : `${exports.showTermP(t.tag === 'Ann' || t.tag === 'Abs' || t.tag === 'Let' || t.tag === 'Pi' || t.tag === 'Fix', t)}`) : `${im ? '{' : '('}${x} : ${exports.showTermP(t.tag === 'Ann', t)}${im ? '}' : ')'}`).join(' -> ')} -> ${exports.showTermP(b.tag === 'Ann', b)}`;
    }
    if (t.tag === 'Fix')
        return `fix (${t.self === '_' ? '' : `${t.self} @ `}${t.name} : ${exports.showTermP(t.type.tag === 'Ann', t.type)}). ${exports.showTermP(t.body.tag === 'Ann', t.body)}`;
    if (t.tag === 'Let')
        return `let ${t.plicity ? `{${t.name}}` : t.name} = ${exports.showTermP(t.val.tag === 'Let', t.val)} in ${exports.showTermP(t.body.tag === 'Ann', t.body)}`;
    if (t.tag === 'Ann')
        return `${exports.showTermP(t.term.tag === 'Ann', t.term)} : ${exports.showTermP(t.term.tag === 'Ann', t.type)}`;
    if (t.tag === 'Unroll')
        return `unroll ${exports.showTermP(t.term.tag !== 'Var', t.term)}`;
    if (t.tag === 'Roll')
        return !t.type ? `roll ${exports.showTermP(t.term.tag !== 'Var', t.term)}` : `roll {${exports.showTerm(t.type)}} ${exports.showTermP(t.term.tag !== 'Var', t.term)}`;
    if (t.tag === 'Hole')
        return `_${t.name || ''}`;
    return t;
};
exports.DDef = (name, value) => ({ tag: 'DDef', name, value });
exports.showDef = (d) => {
    if (d.tag === 'DDef')
        return `def ${d.name} = ${exports.showTerm(d.value)}`;
    return d.tag;
};

},{}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const names_1 = require("./names");
const S = require("./surface");
const list_1 = require("./utils/list");
const util_1 = require("./utils/util");
exports.Var = (index) => ({ tag: 'Var', index });
exports.Global = (name) => ({ tag: 'Global', name });
exports.App = (left, plicity, right) => ({ tag: 'App', left, plicity, right });
exports.Abs = (plicity, name, type, body) => ({ tag: 'Abs', plicity, name, type, body });
exports.Let = (plicity, name, val, body) => ({ tag: 'Let', plicity, name, val, body });
exports.Roll = (type, term) => ({ tag: 'Roll', type, term });
exports.Unroll = (term) => ({ tag: 'Unroll', term });
exports.Pi = (plicity, name, type, body) => ({ tag: 'Pi', plicity, name, type, body });
exports.Fix = (self, name, type, body) => ({ tag: 'Fix', self, name, type, body });
exports.Type = { tag: 'Type' };
exports.Ann = (term, type) => ({ tag: 'Ann', term, type });
exports.Hole = (name = null) => ({ tag: 'Hole', name });
exports.Meta = (index) => ({ tag: 'Meta', index });
exports.showTerm = (t) => {
    if (t.tag === 'Var')
        return `${t.index}`;
    if (t.tag === 'Meta')
        return `?${t.index}`;
    if (t.tag === 'Global')
        return t.name;
    if (t.tag === 'App')
        return `(${exports.showTerm(t.left)} ${t.plicity ? '-' : ''}${exports.showTerm(t.right)})`;
    if (t.tag === 'Abs')
        return t.type ? `(\\(${t.plicity ? '-' : ''}${t.name} : ${exports.showTerm(t.type)}). ${exports.showTerm(t.body)})` : `(\\${t.plicity ? '-' : ''}${t.name}. ${exports.showTerm(t.body)})`;
    if (t.tag === 'Let')
        return `(let ${t.plicity ? '-' : ''}${t.name} = ${exports.showTerm(t.val)} in ${exports.showTerm(t.body)})`;
    if (t.tag === 'Roll')
        return t.type ? `(roll {${exports.showTerm(t.type)}} ${exports.showTerm(t.term)})` : `(roll ${exports.showTerm(t.term)})`;
    if (t.tag === 'Unroll')
        return `(unroll ${exports.showTerm(t.term)})`;
    if (t.tag === 'Pi')
        return `(/(${t.plicity ? '-' : ''}${t.name} : ${exports.showTerm(t.type)}). ${exports.showTerm(t.body)})`;
    if (t.tag === 'Fix')
        return `(fix (${t.self} @ ${t.name} : ${exports.showTerm(t.type)}). ${exports.showTerm(t.body)})`;
    if (t.tag === 'Type')
        return '*';
    if (t.tag === 'Ann')
        return `(${exports.showTerm(t.term)} : ${exports.showTerm(t.type)})`;
    if (t.tag === 'Hole')
        return `_${t.name || ''}`;
    return t;
};
exports.toInternal = (t, ns = list_1.Nil, k = 0) => {
    if (t.tag === 'Var') {
        const l = list_1.lookup(ns, t.name);
        return l === null ? exports.Global(t.name) : exports.Var(k - l - 1);
    }
    if (t.tag === 'Meta')
        return exports.Meta(t.index);
    if (t.tag === 'App')
        return exports.App(exports.toInternal(t.left, ns, k), t.plicity, exports.toInternal(t.right, ns, k));
    if (t.tag === 'Abs')
        return exports.Abs(t.plicity, t.name, t.type && exports.toInternal(t.type, ns, k), exports.toInternal(t.body, list_1.Cons([t.name, k], ns), k + 1));
    if (t.tag === 'Let')
        return exports.Let(t.plicity, t.name, exports.toInternal(t.val, ns, k), exports.toInternal(t.body, list_1.Cons([t.name, k], ns), k + 1));
    if (t.tag === 'Roll')
        return exports.Roll(t.type && exports.toInternal(t.type, ns, k), exports.toInternal(t.term, ns, k));
    if (t.tag === 'Unroll')
        return exports.Unroll(exports.toInternal(t.term, ns, k));
    if (t.tag === 'Pi')
        return exports.Pi(t.plicity, t.name, exports.toInternal(t.type, ns, k), exports.toInternal(t.body, list_1.Cons([t.name, k], ns), k + 1));
    if (t.tag === 'Fix')
        return exports.Fix(t.self, t.name, exports.toInternal(t.type, ns, k), exports.toInternal(t.body, list_1.Cons([t.name, k + 1], list_1.Cons([t.self, k], ns)), k + 2));
    if (t.tag === 'Type')
        return exports.Type;
    if (t.tag === 'Ann')
        return exports.Ann(exports.toInternal(t.term, ns, k), exports.toInternal(t.type, ns, k));
    if (t.tag === 'Hole')
        return exports.Hole(t.name);
    return t;
};
exports.globalUsed = (k, t) => {
    if (t.tag === 'Global')
        return t.name === k;
    if (t.tag === 'App')
        return exports.globalUsed(k, t.left) || exports.globalUsed(k, t.right);
    if (t.tag === 'Abs')
        return (t.type && exports.globalUsed(k, t.type)) || exports.globalUsed(k, t.body);
    if (t.tag === 'Let')
        return exports.globalUsed(k, t.val) || exports.globalUsed(k, t.body);
    if (t.tag === 'Roll')
        return (t.type && exports.globalUsed(k, t.type)) || exports.globalUsed(k, t.term);
    if (t.tag === 'Unroll')
        return exports.globalUsed(k, t.term);
    if (t.tag === 'Pi')
        return exports.globalUsed(k, t.type) || exports.globalUsed(k, t.body);
    if (t.tag === 'Fix')
        return exports.globalUsed(k, t.type) || exports.globalUsed(k, t.body);
    if (t.tag === 'Ann')
        return exports.globalUsed(k, t.term) || exports.globalUsed(k, t.type);
    return false;
};
exports.indexUsed = (k, t) => {
    if (t.tag === 'Var')
        return t.index === k;
    if (t.tag === 'App')
        return exports.indexUsed(k, t.left) || exports.indexUsed(k, t.right);
    if (t.tag === 'Abs')
        return (t.type && exports.indexUsed(k, t.type)) || exports.indexUsed(k + 1, t.body);
    if (t.tag === 'Let')
        return exports.indexUsed(k, t.val) || exports.indexUsed(k + 1, t.body);
    if (t.tag === 'Roll')
        return (t.type && exports.indexUsed(k, t.type)) || exports.indexUsed(k, t.term);
    if (t.tag === 'Unroll')
        return exports.indexUsed(k, t.term);
    if (t.tag === 'Pi')
        return exports.indexUsed(k, t.type) || exports.indexUsed(k + 1, t.body);
    if (t.tag === 'Fix')
        return exports.indexUsed(k, t.type) || exports.indexUsed(k + 2, t.body);
    if (t.tag === 'Ann')
        return exports.indexUsed(k, t.term) || exports.indexUsed(k, t.type);
    return false;
};
const decideName = (x, t, ns) => {
    if (x === '_')
        return x;
    const a = list_1.indecesOf(ns, x).some(i => exports.indexUsed(i + 1, t));
    const g = exports.globalUsed(x, t);
    return a || g ? decideName(names_1.nextName(x), t, ns) : x;
};
exports.toSurface = (t, ns = list_1.Nil) => {
    if (t.tag === 'Var') {
        const l = list_1.index(ns, t.index);
        return l ? S.Var(l) : util_1.impossible(`var index out of range in toSurface: ${t.index}`);
    }
    if (t.tag === 'Type')
        return S.Type;
    if (t.tag === 'Global')
        return S.Var(t.name);
    if (t.tag === 'Meta')
        return S.Meta(t.index);
    if (t.tag === 'App')
        return S.App(exports.toSurface(t.left, ns), t.plicity, exports.toSurface(t.right, ns));
    if (t.tag === 'Ann')
        return S.Ann(exports.toSurface(t.term, ns), exports.toSurface(t.type, ns));
    if (t.tag === 'Roll')
        return S.Roll(t.type && exports.toSurface(t.type, ns), exports.toSurface(t.term, ns));
    if (t.tag === 'Unroll')
        return S.Unroll(exports.toSurface(t.term, ns));
    if (t.tag === 'Hole')
        return S.Hole(t.name);
    if (t.tag === 'Abs') {
        const x = decideName(t.name, t.body, ns);
        return S.Abs(t.plicity, x, t.type && exports.toSurface(t.type, ns), exports.toSurface(t.body, list_1.Cons(x, ns)));
    }
    if (t.tag === 'Let') {
        const x = decideName(t.name, t.body, ns);
        return S.Let(t.plicity, x, exports.toSurface(t.val, ns), exports.toSurface(t.body, list_1.Cons(x, ns)));
    }
    if (t.tag === 'Pi') {
        const x = decideName(t.name, t.body, ns);
        return S.Pi(t.plicity, x, exports.toSurface(t.type, ns), exports.toSurface(t.body, list_1.Cons(x, ns)));
    }
    if (t.tag === 'Fix') {
        // TODO: is this correct?
        const x = decideName(t.name, t.body, ns);
        const self = decideName(t.self, t.body, list_1.Cons(t.name, ns));
        return S.Fix(self, x, exports.toSurface(t.type, ns), exports.toSurface(t.body, list_1.Cons(x, list_1.Cons(self, ns))));
    }
    return t;
};
exports.showSurface = (t, ns = list_1.Nil) => S.showTerm(exports.toSurface(t, ns));

},{"./names":6,"./surface":9,"./utils/list":14,"./utils/util":15}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const syntax_1 = require("./syntax");
const list_1 = require("./utils/list");
const domain_1 = require("./domain");
const config_1 = require("./config");
const util_1 = require("./utils/util");
const definitions_1 = require("./definitions");
const globalenv_1 = require("./globalenv");
const unify_1 = require("./unify");
const metas_1 = require("./metas");
const extendT = (ts, val, bound) => list_1.Cons([bound, val], ts);
const showEnvT = (ts, k = 0, full = false) => list_1.listToString(ts, ([b, v]) => `${b ? '' : 'def '}${domain_1.showTermQ(v, k, full)}`);
const localEmpty = { names: list_1.Nil, namesErased: list_1.Nil, ts: list_1.Nil, vs: list_1.Nil, index: 0, indexErased: 0 };
const extend = (l, x, ty, bound, val, erased = false) => ({
    names: list_1.Cons(x, l.names),
    namesErased: erased ? l.namesErased : list_1.Cons(x, l.namesErased),
    ts: extendT(l.ts, ty, bound),
    vs: domain_1.extendV(l.vs, val),
    index: l.index + 1,
    indexErased: erased ? l.indexErased : l.indexErased + 1,
});
const erasedUsed = (k, t) => {
    if (t.tag === 'Var')
        return t.index === k;
    if (t.tag === 'App')
        return erasedUsed(k, t.left) || (!t.plicity && erasedUsed(k, t.right));
    if (t.tag === 'Abs')
        return erasedUsed(k + 1, t.body);
    if (t.tag === 'Let')
        return erasedUsed(k + 1, t.body) || (!t.plicity && erasedUsed(k, t.val));
    if (t.tag === 'Ann')
        return erasedUsed(k, t.term);
    return false;
};
const newMeta = (ts) => {
    const spine = list_1.filter(list_1.mapIndex(ts, (i, [bound, _]) => bound ? syntax_1.Var(i) : null), x => x !== null);
    return list_1.foldr((x, y) => syntax_1.App(y, false, x), metas_1.freshMeta(), spine);
};
const inst = (ts, vs, ty_) => {
    const ty = domain_1.force(ty_);
    if (ty.tag === 'VPi' && ty.plicity) {
        const m = newMeta(ts);
        const vm = domain_1.evaluate(m, vs);
        const res = inst(ts, vs, ty.body(vm));
        return res;
    }
    return ty;
};
const check = (local, tm, ty) => {
    config_1.log(() => `check ${syntax_1.showSurface(tm, local.names)} : ${domain_1.showTermU(ty, local.names, local.index)} in ${showEnvT(local.ts, local.indexErased, false)} and ${domain_1.showEnvV(local.vs, local.indexErased, false)}`);
    if (ty.tag === 'VType' && tm.tag === 'Type')
        return tm;
    const tyf = domain_1.force(ty);
    if (tm.tag === 'Hole' && tm.name) {
        if (tm.name)
            return util_1.terr(`found hole ${syntax_1.showTerm(tm)}, expected type ${domain_1.showTermU(ty, local.names, local.index)}, forced: ${domain_1.showTermU(tyf, local.names, local.index)}`);
        const x = newMeta(local.ts);
        return x;
    }
    if (tm.tag === 'Abs' && !tm.type && tyf.tag === 'VPi' && tm.plicity === tyf.plicity) {
        const v = domain_1.VVar(local.index);
        const body = check(extend(local, tm.name, tyf.type, true, v, tyf.plicity), tm.body, tyf.body(v));
        if (tm.plicity && erasedUsed(0, tm.body))
            return util_1.terr(`erased argument used in ${syntax_1.showSurface(tm, local.names)}`);
        return syntax_1.Abs(tm.plicity, tm.name, null, body);
    }
    if (tm.tag === 'Abs' && !tm.type && tyf.tag === 'VPi' && !tm.plicity && tyf.plicity) {
        const v = domain_1.VVar(local.index);
        const term = check(extend(local, tm.name, tyf.type, true, v, tyf.plicity), tm, tyf.body(v));
        return term;
    }
    if (tm.tag === 'Let') {
        const [val, vty] = synth(local, tm.val);
        const body = check(extend(local, tm.name, vty, false, domain_1.evaluate(val, local.vs), tm.plicity), tm.body, ty);
        if (tm.plicity && erasedUsed(0, tm.body))
            return util_1.terr(`erased argument used in ${syntax_1.showSurface(tm, local.names)}`);
        return syntax_1.Let(tm.plicity, tm.name, val, body);
    }
    if (tm.tag === 'Roll' && !tm.type && tyf.tag === 'VFix') {
        const term = check(local, tm.term, tyf.body(domain_1.evaluate(tm, local.vs), ty));
        return syntax_1.Roll(null, term);
    }
    if (tyf.tag === 'VFix' && tm.tag === 'Abs') {
        const term = check(local, tm, tyf.body(domain_1.evaluate(tm, local.vs), ty));
        return term;
    }
    const [term, ty2] = synth(local, tm);
    try {
        config_1.log(() => `unify ${domain_1.showTermU(ty2, local.names, local.index)} ~ ${domain_1.showTermU(ty, local.names, local.index)}`);
        metas_1.metaPush();
        unify_1.unify(local.index, ty2, ty);
        metas_1.metaDiscard();
        return term;
    }
    catch (err) {
        if (!(err instanceof TypeError))
            throw err;
        try {
            metas_1.metaPop();
            metas_1.metaPush();
            const ty2inst = inst(local.ts, local.vs, ty2);
            unify_1.unify(local.index, ty2inst, ty);
            metas_1.metaDiscard();
            return term;
        }
        catch {
            if (!(err instanceof TypeError))
                throw err;
            metas_1.metaPop();
            return util_1.terr(`failed to unify ${domain_1.showTermU(ty2, local.names, local.index)} ~ ${domain_1.showTermU(ty, local.names, local.index)}: ${err.message}`);
        }
    }
};
const freshPi = (ts, vs, x, impl) => {
    const a = newMeta(ts);
    const va = domain_1.evaluate(a, vs);
    const b = newMeta(list_1.Cons([true, va], ts));
    return domain_1.VPi(impl, x, va, v => domain_1.evaluate(b, domain_1.extendV(vs, v)));
};
const synth = (local, tm) => {
    config_1.log(() => `synth ${syntax_1.showSurface(tm, local.names)} in ${showEnvT(local.ts, local.indexErased, false)} and ${domain_1.showEnvV(local.vs, local.indexErased, false)}`);
    if (tm.tag === 'Type')
        return [tm, domain_1.VType];
    if (tm.tag === 'Var') {
        const res = list_1.index(local.ts, tm.index);
        if (!res)
            return util_1.terr(`var out of scope ${syntax_1.showSurface(tm, local.names)}`);
        return [tm, res[1]];
    }
    if (tm.tag === 'Global') {
        const entry = globalenv_1.globalGet(tm.name);
        if (!entry)
            return util_1.terr(`global ${tm.name} not found`);
        return [tm, entry.type];
    }
    if (tm.tag === 'Hole' && !tm.name) {
        const t = newMeta(local.ts);
        const vt = domain_1.evaluate(newMeta(local.ts), local.vs);
        return [t, vt];
    }
    if (tm.tag === 'App') {
        const [fntm, fn] = synth(local, tm.left);
        const [argtm, rt] = synthapp(local, fntm, fn, tm.plicity, tm.right);
        return [syntax_1.App(fntm, tm.plicity, argtm), rt];
    }
    if (tm.tag === 'Abs') {
        if (tm.type) {
            const type = check(local, tm.type, domain_1.VType);
            const vtype = domain_1.evaluate(type, local.vs);
            const [body, rt] = synth(extend(local, tm.name, vtype, true, domain_1.VVar(local.indexErased), tm.plicity), tm.body);
            if (tm.plicity && erasedUsed(0, tm.body))
                return util_1.terr(`erased argument used in ${syntax_1.showSurface(tm, local.names)}`);
            // TODO: avoid quote here
            const pi = domain_1.evaluate(syntax_1.Pi(tm.plicity, tm.name, tm.type, domain_1.quote(rt, local.indexErased + 1, false)), local.vs);
            return [syntax_1.Abs(tm.plicity, tm.name, type, body), pi];
        }
        else {
            const pi = freshPi(local.ts, local.vs, tm.name, tm.plicity);
            const term = check(local, tm, pi);
            return [term, pi];
        }
    }
    if (tm.tag === 'Let') {
        const [valtm, vty] = synth(local, tm.val);
        const [bodytm, rt] = synth(extend(local, tm.name, vty, false, domain_1.evaluate(valtm, local.vs), tm.plicity), tm.body);
        if (tm.plicity && erasedUsed(0, tm.body))
            return util_1.terr(`erased argument used in ${syntax_1.showSurface(tm, local.names)}`);
        return [syntax_1.Let(tm.plicity, tm.name, valtm, bodytm), rt];
    }
    if (tm.tag === 'Pi') {
        const type = check(local, tm.type, domain_1.VType);
        const body = check(extend(local, tm.name, domain_1.evaluate(type, local.vs), true, domain_1.VVar(local.indexErased), false), tm.body, domain_1.VType);
        return [syntax_1.Pi(tm.plicity, tm.name, type, body), domain_1.VType];
    }
    if (tm.tag === 'Ann') {
        const type = check(local, tm.type, domain_1.VType);
        const vt = domain_1.evaluate(type, local.vs);
        const term = check(local, tm.term, vt);
        return [syntax_1.Ann(term, type), vt];
    }
    if (tm.tag === 'Fix') {
        const type = check(local, tm.type, domain_1.VType);
        const vty = domain_1.evaluate(type, local.vs);
        const vfix = domain_1.evaluate(tm, local.vs);
        // TODO: is this correct?
        const body = check(extend(extend(local, tm.self, vfix, true, domain_1.VVar(local.indexErased), false), tm.name, vty, false, vfix, false), tm.body, vty);
        return [syntax_1.Fix(tm.self, tm.name, type, body), vty];
    }
    if (tm.tag === 'Roll' && tm.type) {
        const type = check(local, tm.type, domain_1.VType);
        const vt = domain_1.evaluate(tm.type, local.vs);
        const vtf = domain_1.force(vt);
        if (vtf.tag !== 'VFix')
            return util_1.terr(`fix type expected in ${syntax_1.showSurface(tm, local.names)}: ${domain_1.showTermU(vt, local.names, local.index)}`);
        const term = check(local, tm.term, vtf.body(domain_1.evaluate(tm, local.vs), vt));
        return [syntax_1.Roll(type, term), vt];
    }
    if (tm.tag === 'Unroll') {
        const [term, ty] = synth(local, tm.term);
        const vt = domain_1.force(ty);
        if (vt.tag !== 'VFix')
            return util_1.terr(`fix type expected in ${syntax_1.showSurface(tm, local.names)}: ${domain_1.showTermU(vt, local.names, local.index)}`);
        return [syntax_1.Unroll(term), vt.body(domain_1.evaluate(term, local.vs), ty)];
    }
    return util_1.terr(`cannot synth ${syntax_1.showSurface(tm, local.names)}`);
};
const synthapp = (local, fntm, ty_, plicity, arg) => {
    const ty = domain_1.force(ty_);
    config_1.log(() => `synthapp ${domain_1.showTermU(ty, local.names, local.index)} ${plicity ? '-' : ''}@ ${syntax_1.showSurface(arg, local.names)} in ${showEnvT(local.ts, local.indexErased, false)} and ${domain_1.showEnvV(local.vs, local.indexErased, false)}`);
    if (ty.tag === 'VFix')
        return synthapp(local, fntm, ty.body(domain_1.evaluate(fntm, local.vs), ty), plicity, arg);
    if (ty.tag === 'VPi' && ty.plicity === plicity) {
        const argtm = check(local, arg, ty.type);
        const vm = domain_1.evaluate(argtm, local.vs);
        return [argtm, ty.body(vm)];
    }
    if (ty.tag === 'VPi' && ty.plicity && !plicity) {
        // {a} -> b @ c (instantiate with meta then b @ c)
        const m = newMeta(local.ts);
        const vm = domain_1.evaluate(m, local.vs);
        // TODO: fntm should probably be updated?
        const [argtm, rt] = synthapp(local, fntm, ty.body(vm), plicity, arg);
        return [argtm, rt];
    }
    // TODO: fix the following
    if (ty.tag === 'VNe' && ty.head.tag === 'HMeta') {
        const a = metas_1.freshMetaId();
        const b = metas_1.freshMetaId();
        const pi = domain_1.VPi(plicity, '_', domain_1.VNe(domain_1.HMeta(a), ty.args), () => domain_1.VNe(domain_1.HMeta(b), ty.args));
        unify_1.unify(local.indexErased, ty, pi);
        return synthapp(local, fntm, pi, plicity, arg);
    }
    return util_1.terr(`invalid type or plicity mismatch in synthapp in ${domain_1.showTermU(ty, local.names, local.index)} ${plicity ? '-' : ''}@ ${syntax_1.showSurface(arg, local.names)}`);
};
exports.typecheck = (tm) => {
    const res = synth(localEmpty, tm);
    if (metas_1.metaUnsolved())
        return util_1.terr(`there are unsolved metas`);
    return res[1];
};
exports.typecheckDefs = (ds, allowRedefinition = false) => {
    config_1.log(() => `typecheckDefs ${ds.map(x => x.name).join(' ')}`);
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
            const ty = exports.typecheck(d.value);
            config_1.log(() => `set ${d.name} = ${syntax_1.showTerm(d.value)}`);
            globalenv_1.globalSet(d.name, d.value, domain_1.evaluate(d.value, list_1.Nil), ty);
            xs.push(d.name);
        }
    }
    return xs;
};

},{"./config":1,"./definitions":2,"./domain":3,"./globalenv":4,"./metas":5,"./syntax":10,"./unify":12,"./utils/list":14,"./utils/util":15}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const domain_1 = require("./domain");
const util_1 = require("./utils/util");
const lazy_1 = require("./utils/lazy");
const list_1 = require("./utils/list");
const config_1 = require("./config");
const metas_1 = require("./metas");
const syntax_1 = require("./syntax");
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
const unifyElim = (k, a, b, x, y) => {
    if (a === b)
        return;
    if (a.tag === 'EApp' && b.tag === 'EApp')
        return exports.unify(k, a.arg, b.arg);
    return util_1.terr(`unify failed (${k}): ${domain_1.showTermQ(x, k)} ~ ${domain_1.showTermQ(y, k)}`);
};
exports.unify = (k, a_, b_) => {
    const a = domain_1.forceGlue(a_);
    const b = domain_1.forceGlue(b_);
    config_1.log(() => `unify ${domain_1.showTermQ(a, k)} ~ ${domain_1.showTermQ(b, k)}`);
    if (a === b)
        return;
    if (a.tag === 'VType' && b.tag === 'VType')
        return;
    if (a.tag === 'VPi' && b.tag === 'VPi' && a.plicity === b.plicity) {
        exports.unify(k, a.type, b.type);
        const v = domain_1.VVar(k);
        return exports.unify(k + 1, a.body(v), b.body(v));
    }
    if (a.tag === 'VFix' && b.tag === 'VFix') {
        exports.unify(k, a.type, b.type);
        const v = domain_1.VVar(k);
        const w = domain_1.VVar(k + 1);
        return exports.unify(k + 2, a.body(v, w), b.body(v, w));
    }
    if (a.tag === 'VAbs' && b.tag === 'VAbs') {
        const v = domain_1.VVar(k);
        return exports.unify(k + 1, a.body(v), b.body(v));
    }
    if (a.tag === 'VAbs') {
        const v = domain_1.VVar(k);
        return exports.unify(k + 1, a.body(v), domain_1.vapp(b, v));
    }
    if (b.tag === 'VAbs') {
        const v = domain_1.VVar(k);
        return exports.unify(k + 1, domain_1.vapp(a, v), b.body(v));
    }
    if (a.tag === 'VNe' && b.tag === 'VNe' && eqHead(a.head, b.head) && list_1.length(a.args) === list_1.length(b.args))
        return list_1.zipWithR_((x, y) => unifyElim(k, x, y, a, b), a.args, b.args);
    if (a.tag === 'VNe' && b.tag === 'VNe' && a.head.tag === 'HMeta' && b.head.tag === 'HMeta')
        return list_1.length(a.args) > list_1.length(b.args) ?
            solve(k, a.head.index, a.args, b) :
            solve(k, b.head.index, b.args, a);
    if (a.tag === 'VNe' && a.head.tag === 'HMeta')
        return solve(k, a.head.index, a.args, b);
    if (b.tag === 'VNe' && b.head.tag === 'HMeta')
        return solve(k, b.head.index, b.args, a);
    if (a.tag === 'VGlued' && b.tag === 'VGlued' && eqHead(a.head, b.head) && list_1.length(a.args) === list_1.length(b.args)) {
        try {
            metas_1.metaPush();
            list_1.zipWithR_((x, y) => unifyElim(k, x, y, a, b), a.args, b.args);
            metas_1.metaDiscard();
            return;
        }
        catch (err) {
            if (!(err instanceof TypeError))
                throw err;
            metas_1.metaPop();
            return exports.unify(k, lazy_1.forceLazy(a.val), lazy_1.forceLazy(b.val));
        }
    }
    if (a.tag === 'VGlued')
        return exports.unify(k, lazy_1.forceLazy(a.val), b);
    if (b.tag === 'VGlued')
        return exports.unify(k, a, lazy_1.forceLazy(b.val));
    return util_1.terr(`unify failed (${k}): ${domain_1.showTermQ(a, k)} ~ ${domain_1.showTermQ(b, k)}`);
};
const solve = (k, m, spine, val) => {
    config_1.log(() => `solve ?${m} ${list_1.listToString(spine, e => domain_1.showElimQ(e, k, false))} := ${domain_1.showTermQ(val, k)}`);
    try {
        const spinex = checkSpine(k, spine);
        const rhs = domain_1.quote(val, k, false);
        const body = checkSolution(k, m, spinex, rhs);
        const solution = list_1.foldl((body, y) => {
            if (typeof y === 'string')
                return syntax_1.Abs(false, '_', null, body);
            const x = `v\$${y}`;
            return syntax_1.Abs(false, x, null, body);
        }, body, spinex);
        config_1.log(() => `solution ?${m} := ${syntax_1.showSurface(solution, list_1.Nil)} | ${syntax_1.showTerm(solution)}`);
        const vsolution = domain_1.evaluate(solution, list_1.Nil);
        metas_1.metaSet(m, vsolution);
    }
    catch (err) {
        if (!(err instanceof TypeError))
            throw err;
        const a = list_1.toArray(spine, e => domain_1.showElimQ(e, k));
        util_1.terr(`failed to solve meta (?${m}${a.length > 0 ? ' ' : ''}${a.join(' ')}) := ${domain_1.showTermQ(val, k)}: ${err.message}`);
    }
};
const checkSpine = (k, spine) => list_1.map(spine, elim => {
    if (elim.tag === 'EApp') {
        const v = domain_1.forceGlue(elim.arg);
        if ((v.tag === 'VNe' || v.tag === 'VGlued') && v.head.tag === 'HVar' && list_1.length(v.args) === 0)
            return v.head.index;
        if ((v.tag === 'VNe' || v.tag === 'VGlued') && v.head.tag === 'HGlobal' && list_1.length(v.args) === 0)
            return v.head.name;
        return util_1.terr(`not a var in spine: ${domain_1.showTermQ(v, k)}`);
    }
    return elim.tag;
});
const checkSolution = (k, m, is, t) => {
    if (t.tag === 'Type')
        return t;
    if (t.tag === 'Global')
        return t;
    if (t.tag === 'Var') {
        const i = k - t.index - 1;
        if (list_1.contains(is, i))
            return syntax_1.Var(list_1.indexOf(is, i));
        return util_1.terr(`scope error ${t.index} (${i})`);
    }
    if (t.tag === 'Meta') {
        if (m === t.index)
            return util_1.terr(`occurs check failed: ${syntax_1.showTerm(t)}`);
        return t;
    }
    if (t.tag === 'App') {
        const l = checkSolution(k, m, is, t.left);
        const r = checkSolution(k, m, is, t.right);
        return syntax_1.App(l, t.plicity, r);
    }
    if (t.tag === 'Abs') {
        const body = checkSolution(k + 1, m, list_1.Cons(k, is), t.body);
        return syntax_1.Abs(t.plicity, t.name, null, body);
    }
    if (t.tag === 'Pi') {
        const ty = checkSolution(k, m, is, t.type);
        const body = checkSolution(k + 1, m, list_1.Cons(k, is), t.body);
        return syntax_1.Pi(t.plicity, t.name, ty, body);
    }
    if (t.tag === 'Fix') {
        const ty = checkSolution(k, m, is, t.type);
        const body = checkSolution(k + 2, m, list_1.Cons(k + 1, list_1.Cons(k, is)), t.body);
        return syntax_1.Fix(t.self, t.name, ty, body);
    }
    return util_1.impossible(`checkSolution ?${m}: non-normal term: ${syntax_1.showTerm(t)}`);
};

},{"./config":1,"./domain":3,"./metas":5,"./syntax":10,"./utils/lazy":13,"./utils/list":14,"./utils/util":15}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Nil = { tag: 'Nil' };
exports.Cons = (head, tail) => ({ tag: 'Cons', head, tail });
exports.listFrom = (a) => a.reduceRight((x, y) => exports.Cons(y, x), exports.Nil);
exports.list = (...a) => exports.listFrom(a);
exports.listToString = (l, fn = x => `${x}`) => {
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
exports.foldrprim = (f, i, l, ind = 0) => l.tag === 'Nil' ? i : f(l.head, exports.foldrprim(f, i, l.tail, ind + 1), l, ind);
exports.foldlprim = (f, i, l, ind = 0) => l.tag === 'Nil' ? i : exports.foldlprim(f, f(l.head, i, l, ind), l.tail, ind + 1);
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

},{}],15:[function(require,module,exports){
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
exports.loadFile = (fn) => {
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

},{"fs":17}],16:[function(require,module,exports){
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

},{"./repl":8}],17:[function(require,module,exports){

},{}]},{},[16]);
