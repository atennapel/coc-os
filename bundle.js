(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addToBase = exports.getFromBase = void 0;
const serialization_1 = require("./serialization");
const typecheck_1 = require("./typecheck");
const cache = {};
const getFromBase = (x, erased = false) => {
    if (cache[x])
        return cache[x];
    const fs = require('fs');
    const y = /[A-Z]/.test(x[0]) ? `_${x}` : x;
    const ser = fs.readFileSync(`./base/${y}`);
    let ns = null;
    if (fs.existsSync(`./names/${y}`))
        ns = JSON.parse(fs.readFileSync(`./names/${y}`));
    const term = serialization_1.deserializeCore(ser, ns);
    const [type, eras] = typecheck_1.typecheck(term, erased);
    cache[x] = [term, type, eras];
    return [term, type, eras];
};
exports.getFromBase = getFromBase;
const addToBase = (x, t, erased = false, alreadyTypechecked = false) => {
    if (!alreadyTypechecked) {
        const [type, eras] = typecheck_1.typecheck(t, erased);
        cache[x] = [t, type, eras];
    }
    const y = /[A-Z]/.test(x[0]) ? `_${x}` : x;
    const [ser, ns] = serialization_1.serializeCore(t);
    const fs = require('fs');
    fs.writeFileSync(`./base/${y}`, ser);
    fs.writeFileSync(`./names/${y}`, JSON.stringify(ns));
};
exports.addToBase = addToBase;

},{"./serialization":15,"./typecheck":17,"fs":24}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.setConfig = exports.config = void 0;
exports.config = {
    debug: false,
    showEnvs: false,
    unfold: [],
    postponeInvalidSolution: false,
    useBase: false,
    writeToBase: false,
};
const setConfig = (c) => {
    for (let k in c)
        exports.config[k] = c[k];
};
exports.setConfig = setConfig;
const log = (msg) => {
    if (exports.config.debug)
        console.log(msg());
};
exports.log = log;

},{}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.freshInstanceId = exports.getHoleEntries = exports.getHoles = exports.registerHole = exports.amountOfProblems = exports.allProblems = exports.problemsBlockedBy = exports.postpone = exports.contextSolved = exports.solveMeta = exports.isMetaSolved = exports.getMeta = exports.freshMeta = exports.undoContext = exports.discardContext = exports.markContext = exports.resetContext = exports.Solved = exports.Unsolved = void 0;
const utils_1 = require("./utils/utils");
const Unsolved = (type, erased) => ({ tag: 'Unsolved', type, erased });
exports.Unsolved = Unsolved;
const Solved = (val, type, erased) => ({ tag: 'Solved', val, type, erased });
exports.Solved = Solved;
const Blocked = (k, a, b, blockedBy) => ({ k, a, b, blockedBy });
const Context = (metas = [], blocked = [], holes = {}, instanceId = 0) => ({ metas, blocked, holes, instanceId });
let context = Context();
let contextStack = [];
const cloneContext = (ctx) => Context(ctx.metas.slice(), ctx.blocked.slice(), Object.assign({}, ctx.holes), ctx.instanceId);
const resetContext = () => {
    context = Context();
};
exports.resetContext = resetContext;
const markContext = () => {
    contextStack.push(context);
    context = cloneContext(context);
};
exports.markContext = markContext;
const discardContext = () => {
    contextStack.pop();
};
exports.discardContext = discardContext;
const undoContext = () => {
    const ctx = contextStack.pop();
    if (!ctx)
        return utils_1.impossible(`tried to undoMetas with empty stack`);
    context = ctx;
};
exports.undoContext = undoContext;
// metas
const freshMeta = (type, erased) => {
    const id = context.metas.length;
    context.metas[id] = exports.Unsolved(type, erased);
    return id;
};
exports.freshMeta = freshMeta;
const getMeta = (id) => {
    const s = context.metas[id];
    if (!s)
        return utils_1.impossible(`undefined meta ?${id} in metaGet`);
    return s;
};
exports.getMeta = getMeta;
const isMetaSolved = (id) => exports.getMeta(id).tag === 'Solved';
exports.isMetaSolved = isMetaSolved;
const solveMeta = (id, val) => {
    const s = exports.getMeta(id);
    if (s.tag === 'Solved')
        return utils_1.impossible(`meta already solved: ?${id}`);
    context.metas[id] = exports.Solved(val, s.type, s.erased);
};
exports.solveMeta = solveMeta;
const contextSolved = () => context.metas.every(s => s.tag === 'Solved') && context.blocked.length === 0;
exports.contextSolved = contextSolved;
// postponements
const postpone = (k, a, b, blockedBy) => {
    context.blocked.push(Blocked(k, a, b, blockedBy));
};
exports.postpone = postpone;
const problemsBlockedBy = (m) => {
    const bs = context.blocked;
    const newbs = [];
    const r = [];
    for (let i = 0, l = bs.length; i < l; i++) {
        const c = bs[i];
        if (c.blockedBy.includes(m))
            r.push(c);
        else
            newbs.push(c);
    }
    context.blocked = newbs;
    return r;
};
exports.problemsBlockedBy = problemsBlockedBy;
const allProblems = () => {
    const blocked = context.blocked;
    context.blocked = [];
    return blocked;
};
exports.allProblems = allProblems;
const amountOfProblems = () => context.blocked.length;
exports.amountOfProblems = amountOfProblems;
// holes
const registerHole = (name, info) => {
    if (context.holes[name])
        return utils_1.terr(`named hole used more than once: _${name}`);
    context.holes[name] = info;
};
exports.registerHole = registerHole;
const getHoles = () => context.holes;
exports.getHoles = getHoles;
const getHoleEntries = () => Object.entries(exports.getHoles());
exports.getHoleEntries = getHoleEntries;
const freshInstanceId = () => context.instanceId++;
exports.freshInstanceId = freshInstanceId;

},{"./utils/utils":21}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conv = exports.eqHead = void 0;
const config_1 = require("./config");
const lazy_1 = require("./utils/lazy");
const list_1 = require("./utils/list");
const utils_1 = require("./utils/utils");
const values_1 = require("./values");
const eqHead = (a, b) => {
    if (a === b)
        return true;
    if (a.tag === 'HVar')
        return b.tag === 'HVar' && a.index === b.index;
    if (a.tag === 'HPrim')
        return b.tag === 'HPrim' && a.name === b.name;
    if (a.tag === 'HMeta')
        return b.tag === 'HMeta' && a.index === b.index;
    return a;
};
exports.eqHead = eqHead;
const convElim = (k, a, b, x, y) => {
    if (a === b)
        return;
    if (a.tag === 'EApp' && b.tag === 'EApp' && a.mode.tag === b.mode.tag)
        return exports.conv(k, a.right, b.right);
    if (a.tag === 'EProj' && b.tag === 'EProj' && a.proj === b.proj)
        return;
    if (a.tag === 'EPrim' && b.tag === 'EPrim' && a.name === b.name && a.args.length === b.args.length) {
        for (let i = 0, l = a.args.length; i < l; i++)
            exports.conv(k, a.args[i], b.args[i]);
        return;
    }
    return utils_1.terr(`conv failed (${k}): ${values_1.showVal(x, k)} ~ ${values_1.showVal(y, k)}`);
};
const conv = (k, a_, b_) => {
    const a = values_1.force(a_, false);
    const b = values_1.force(b_, false);
    config_1.log(() => `conv(${k}): ${values_1.showVal(a, k)} ~ ${values_1.showVal(b, k)}`);
    if (a === b)
        return;
    if (a.tag === 'VPi' && b.tag === 'VPi' && a.mode.tag === b.mode.tag && a.erased === b.erased) {
        exports.conv(k, a.type, b.type);
        const v = values_1.VVar(k);
        return exports.conv(k + 1, values_1.vinst(a, v), values_1.vinst(b, v));
    }
    if (a.tag === 'VSigma' && b.tag === 'VSigma' && a.erased === b.erased) {
        exports.conv(k, a.type, b.type);
        const v = values_1.VVar(k);
        return exports.conv(k + 1, values_1.vinst(a, v), values_1.vinst(b, v));
    }
    if (a.tag === 'VAbs' && b.tag === 'VAbs' && a.mode.tag === b.mode.tag && a.erased === b.erased) {
        const v = values_1.VVar(k);
        return exports.conv(k + 1, values_1.vinst(a, v), values_1.vinst(b, v));
    }
    if (a.tag === 'VPair' && b.tag === 'VPair') {
        exports.conv(k, a.fst, b.fst);
        return exports.conv(k, a.snd, b.snd);
    }
    if (a.tag === 'VData' && b.tag === 'VData' && a.cons.length === b.cons.length) {
        exports.conv(k, a.index, b.index);
        for (let i = 0, l = a.cons.length; i < l; i++)
            exports.conv(k, a.cons[i], b.cons[i]);
        return;
    }
    if (a.tag === 'VTCon' && b.tag === 'VTCon' && a.args.length === b.args.length) {
        exports.conv(k, a.data, b.data);
        for (let i = 0, l = a.args.length; i < l; i++)
            exports.conv(k, a.args[i], b.args[i]);
        return;
    }
    if (a.tag === 'VAbs') {
        const v = values_1.VVar(k);
        return exports.conv(k + 1, values_1.vinst(a, v), values_1.vapp(b, a.mode, v));
    }
    if (b.tag === 'VAbs') {
        const v = values_1.VVar(k);
        return exports.conv(k + 1, values_1.vapp(a, b.mode, v), values_1.vinst(b, v));
    }
    if (a.tag === 'VPair') {
        exports.conv(k, a.fst, values_1.vproj('fst', b));
        return exports.conv(k, a.snd, values_1.vproj('snd', b));
    }
    if (b.tag === 'VPair') {
        exports.conv(k, values_1.vproj('fst', a), b.fst);
        return exports.conv(k, values_1.vproj('snd', a), b.snd);
    }
    if (values_1.isVPrim('ReflHEq', a))
        return;
    if (values_1.isVPrim('ReflHEq', b))
        return;
    if (a.tag === 'VNe' && b.tag === 'VNe' && exports.eqHead(a.head, b.head))
        return list_1.zipWithR_((x, y) => convElim(k, x, y, a, b), a.spine, b.spine);
    if (a.tag === 'VGlobal' && b.tag === 'VGlobal' && a.head === b.head && list_1.length(a.args) === list_1.length(b.args)) {
        return utils_1.tryT(() => list_1.zipWithR_((x, y) => convElim(k, x, y, a, b), a.args, b.args), () => exports.conv(k, lazy_1.forceLazy(a.val), lazy_1.forceLazy(b.val)));
    }
    if (a.tag === 'VGlobal')
        return exports.conv(k, lazy_1.forceLazy(a.val), b);
    if (b.tag === 'VGlobal')
        return exports.conv(k, a, lazy_1.forceLazy(b.val));
    return utils_1.terr(`conv failed (${k}): ${values_1.showVal(a, k)} ~ ${values_1.showVal(b, k)}`);
};
exports.conv = conv;

},{"./config":2,"./utils/lazy":19,"./utils/list":20,"./utils/utils":21,"./values":22}],5:[function(require,module,exports){
"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.substTop = exports.subst = exports.shift = exports.eq = exports.show = exports.flattenPi = exports.flattenApp = exports.showMode = exports.PiU = exports.PiE = exports.AbsU = exports.AbsE = exports.AppU = exports.AppE = exports.DataSort = exports.Type = exports.primNames = exports.isPrimName = exports.TCon = exports.DataDef = exports.Meta = exports.Sigma = exports.Pi = exports.Let = exports.Proj = exports.Pair = exports.Abs = exports.App = exports.Global = exports.Prim = exports.Var = exports.ImplUnif = exports.Expl = void 0;
const utils_1 = require("./utils/utils");
_a = { Expl: { tag: 'Expl' }, ImplUnif: { tag: 'ImplUnif' } }, exports.Expl = _a.Expl, exports.ImplUnif = _a.ImplUnif;
const Var = (index) => ({ tag: 'Var', index });
exports.Var = Var;
const Prim = (name) => ({ tag: 'Prim', name });
exports.Prim = Prim;
const Global = (name) => ({ tag: 'Global', name });
exports.Global = Global;
const App = (left, mode, right) => ({ tag: 'App', left, mode, right });
exports.App = App;
const Abs = (mode, erased, name, type, body) => ({ tag: 'Abs', name, erased, mode, type, body });
exports.Abs = Abs;
const Pair = (fst, snd, type) => ({ tag: 'Pair', fst, snd, type });
exports.Pair = Pair;
const Proj = (proj, term) => ({ tag: 'Proj', proj, term });
exports.Proj = Proj;
const Let = (erased, name, type, val, body) => ({ tag: 'Let', erased, name, type, val, body });
exports.Let = Let;
const Pi = (mode, erased, name, type, body) => ({ tag: 'Pi', mode, erased, name, type, body });
exports.Pi = Pi;
const Sigma = (erased, name, type, body) => ({ tag: 'Sigma', erased, name, type, body });
exports.Sigma = Sigma;
const Meta = (index) => ({ tag: 'Meta', index });
exports.Meta = Meta;
const DataDef = (index, cons) => ({ tag: 'Data', index, cons });
exports.DataDef = DataDef;
const TCon = (data, args) => ({ tag: 'TCon', data, args });
exports.TCon = TCon;
const isPrimName = (name) => exports.primNames.includes(name);
exports.isPrimName = isPrimName;
exports.primNames = [
    'Type', 'Data',
    'B', '0', '1', 'elimB',
    'HEq', 'ReflHEq', 'elimHEq',
    'IDesc', 'IEnd', 'IArg', 'IArgE', 'IFArg', 'IRec', 'IHRec', 'elimIDesc', 'InterpI', 'AllI', 'allI',
    'IData', 'ICon', 'indI',
];
exports.Type = exports.Prim('Type');
exports.DataSort = exports.Prim('Data');
const AppE = (left, right) => exports.App(left, exports.Expl, right);
exports.AppE = AppE;
const AppU = (left, right) => exports.App(left, exports.ImplUnif, right);
exports.AppU = AppU;
const AbsE = (name, type, body) => exports.Abs(exports.Expl, false, name, type, body);
exports.AbsE = AbsE;
const AbsU = (name, type, body) => exports.Abs(exports.ImplUnif, false, name, type, body);
exports.AbsU = AbsU;
const PiE = (name, type, body) => exports.Pi(exports.Expl, false, name, type, body);
exports.PiE = PiE;
const PiU = (name, type, body) => exports.Pi(exports.ImplUnif, false, name, type, body);
exports.PiU = PiU;
const showMode = (m) => m === exports.ImplUnif ? 'impl' : '';
exports.showMode = showMode;
const flattenApp = (t) => {
    const r = [];
    while (t.tag === 'App') {
        r.push([t.mode, t.right]);
        t = t.left;
    }
    return [t, r.reverse()];
};
exports.flattenApp = flattenApp;
const flattenPi = (t) => {
    const r = [];
    while (t.tag === 'Pi') {
        r.push([t.name, t.mode, t.erased, t.type]);
        t = t.body;
    }
    return [r, t];
};
exports.flattenPi = flattenPi;
const show = (t) => {
    if (t.tag === 'Var')
        return `${t.index}`;
    if (t.tag === 'Prim')
        return t.name === 'Type' ? '*' : `%${t.name}`;
    if (t.tag === 'Global')
        return `${t.name}`;
    if (t.tag === 'Meta')
        return `?${t.index}`;
    if (t.tag === 'App') {
        const [f, as] = exports.flattenApp(t);
        return `(${exports.show(f)} ${as.map(([m, a]) => `${m === exports.ImplUnif ? '{' : ''}${exports.show(a)}${m === exports.ImplUnif ? '}' : ''}`).join(' ')})`;
    }
    if (t.tag === 'Abs')
        return `(\\${t.mode.tag === 'ImplUnif' ? '{' : '('}${t.erased ? '-' : ''}${t.name} : ${exports.show(t.type)}${t.mode.tag === 'ImplUnif' ? '}' : ')'}. ${exports.show(t.body)})`;
    if (t.tag === 'Pair')
        return `(${exports.show(t.fst)}, ${exports.show(t.snd)} : ${exports.show(t.type)})`;
    if (t.tag === 'Proj')
        return `(${t.proj} ${exports.show(t.term)})`;
    if (t.tag === 'Let')
        return `(let ${t.erased ? '-' : ''}${t.name} : ${exports.show(t.type)} = ${exports.show(t.val)}; ${exports.show(t.body)})`;
    if (t.tag === 'Pi') {
        const [as, r] = exports.flattenPi(t);
        return `(${as.map(([x, m, e, ty]) => `${m === exports.ImplUnif ? '{' : '('}${e ? '-' : ''}${x} : ${exports.show(ty)}${m === exports.ImplUnif ? '}' : ')'}`).join(' -> ')} -> ${exports.show(r)})`;
    }
    if (t.tag === 'Sigma')
        return `((${t.erased ? '-' : ''}${t.name} : ${exports.show(t.type)}) ** ${exports.show(t.body)})`;
    if (t.tag === 'Data')
        return `(data ${exports.show(t.index)}${t.cons.length > 0 ? ' ' : ''}${t.cons.map(exports.show).join(' ')})`;
    if (t.tag === 'TCon')
        return `(tcon ${exports.show(t.data)}${t.args.length > 0 ? ' ' : ''}${t.args.map(exports.show).join(' ')})`;
    return t;
};
exports.show = show;
const eq = (t, o) => {
    if (t.tag === 'Var')
        return o.tag === 'Var' && t.index === o.index;
    if (t.tag === 'Prim')
        return o.tag === 'Prim' && t.name === o.name;
    if (t.tag === 'Global')
        return o.tag === 'Global' && t.name === o.name;
    if (t.tag === 'Meta')
        return o.tag === 'Meta' && t.index === o.index;
    if (t.tag === 'App')
        return o.tag === 'App' && exports.eq(t.left, o.left) && exports.eq(t.right, o.right);
    if (t.tag === 'Abs')
        return o.tag === 'Abs' && t.mode.tag === o.mode.tag && t.erased === o.erased && exports.eq(t.type, o.type) && exports.eq(t.body, o.body);
    if (t.tag === 'Pair')
        return o.tag === 'Pair' && exports.eq(t.fst, o.snd) && exports.eq(t.fst, o.snd);
    if (t.tag === 'Proj')
        return o.tag === 'Proj' && t.proj === o.proj && exports.eq(t.term, o.term);
    if (t.tag === 'Let')
        return o.tag === 'Let' && t.erased === o.erased && exports.eq(t.type, o.type) && exports.eq(t.val, o.val) && exports.eq(t.body, o.body);
    if (t.tag === 'Pi')
        return o.tag === 'Pi' && t.mode.tag === o.mode.tag && t.erased === o.erased && exports.eq(t.type, o.type) && exports.eq(t.body, o.body);
    if (t.tag === 'Sigma')
        return o.tag === 'Sigma' && t.erased === o.erased && exports.eq(t.type, o.type) && exports.eq(t.body, o.body);
    if (t.tag === 'Data')
        return o.tag === 'Data' && exports.eq(t.index, o.index) && utils_1.eqArr(t.cons, o.cons, exports.eq);
    if (t.tag === 'TCon')
        return o.tag === 'TCon' && exports.eq(t.data, o.data) && utils_1.eqArr(t.args, o.args, exports.eq);
    return t;
};
exports.eq = eq;
const shift = (d, c, t) => {
    if (t.tag === 'Var')
        return t.index < c ? t : exports.Var(t.index + d);
    if (t.tag === 'Prim')
        return t;
    if (t.tag === 'Global')
        return t;
    if (t.tag === 'Meta')
        return t;
    if (t.tag === 'App')
        return exports.App(exports.shift(d, c, t.left), t.mode, exports.shift(d, c, t.right));
    if (t.tag === 'Abs')
        return exports.Abs(t.mode, t.erased, t.name, exports.shift(d, c, t.type), exports.shift(d, c + 1, t.body));
    if (t.tag === 'Pair')
        return exports.Pair(exports.shift(d, c, t.fst), exports.shift(d, c, t.snd), exports.shift(d, c, t.type));
    if (t.tag === 'Proj')
        return exports.Proj(t.proj, exports.shift(d, c, t.term));
    if (t.tag === 'Let')
        return exports.Let(t.erased, t.name, exports.shift(d, c, t.type), exports.shift(d, c, t.val), exports.shift(d, c + 1, t.body));
    if (t.tag === 'Pi')
        return exports.Pi(t.mode, t.erased, t.name, exports.shift(d, c, t.type), exports.shift(d, c + 1, t.body));
    if (t.tag === 'Sigma')
        return exports.Sigma(t.erased, t.name, exports.shift(d, c, t.type), exports.shift(d, c + 1, t.body));
    if (t.tag === 'Data')
        return exports.DataDef(exports.shift(d, c, t.index), t.cons.map(x => exports.shift(d, c, x)));
    if (t.tag === 'TCon')
        return exports.TCon(exports.shift(d, c, t.data), t.args.map(x => exports.shift(d, c, x)));
    return t;
};
exports.shift = shift;
const subst = (j, s, t) => {
    if (t.tag === 'Var')
        return t.index === j ? s : t;
    if (t.tag === 'Prim')
        return t;
    if (t.tag === 'Global')
        return t;
    if (t.tag === 'Meta')
        return t;
    if (t.tag === 'App')
        return exports.App(exports.subst(j, s, t.left), t.mode, exports.subst(j, s, t.right));
    if (t.tag === 'Abs')
        return exports.Abs(t.mode, t.erased, t.name, exports.subst(j, s, t.type), exports.subst(j + 1, exports.shift(1, 0, s), t.body));
    if (t.tag === 'Pair')
        return exports.Pair(exports.subst(j, s, t.fst), exports.subst(j, s, t.snd), exports.subst(j, s, t.type));
    if (t.tag === 'Proj')
        return exports.Proj(t.proj, exports.subst(j, s, t.term));
    if (t.tag === 'Let')
        return exports.Let(t.erased, t.name, exports.subst(j, s, t.type), exports.subst(j, s, t.val), exports.subst(j + 1, exports.shift(1, 0, s), t.body));
    if (t.tag === 'Pi')
        return exports.Pi(t.mode, t.erased, t.name, exports.subst(j, s, t.type), exports.subst(j + 1, exports.shift(1, 0, s), t.body));
    if (t.tag === 'Sigma')
        return exports.Sigma(t.erased, t.name, exports.subst(j, s, t.type), exports.subst(j + 1, exports.shift(1, 0, s), t.body));
    if (t.tag === 'Data')
        return exports.DataDef(exports.subst(j, s, t.index), t.cons.map(x => exports.subst(j, s, x)));
    if (t.tag === 'TCon')
        return exports.TCon(exports.subst(j, s, t.data), t.args.map(x => exports.subst(j, s, x)));
    return t;
};
exports.subst = subst;
const substTop = (t, u) => exports.shift(-1, 0, exports.subst(0, exports.shift(1, 0, u), t));
exports.substTop = substTop;

},{"./utils/utils":21}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.elaborateDefs = exports.elaborate = void 0;
const config_1 = require("./config");
const core_1 = require("./core");
const C = require("./core");
const list_1 = require("./utils/list");
const utils_1 = require("./utils/utils");
const values_1 = require("./values");
const S = require("./surface");
const surface_1 = require("./surface");
const context_1 = require("./context");
const unification_1 = require("./unification");
const primitives_1 = require("./primitives");
const globals_1 = require("./globals");
const typecheck_1 = require("./typecheck");
const E = require("./erased");
const EV = require("./erasedvalues");
const V = require("./values");
const base_1 = require("./base");
const EntryT = (type, bound, mode, erased, inserted) => ({ type, bound, mode, erased, inserted });
const indexT = (ts, ix) => {
    let l = ts;
    let i = 0;
    while (l.tag === 'Cons') {
        if (l.head.inserted) {
            l = l.tail;
            i++;
            continue;
        }
        if (ix === 0)
            return [l.head, i];
        i++;
        ix--;
        l = l.tail;
    }
    return null;
};
const Local = (index, ns, nsSurface, ts, vs, erased) => ({ index, ns, nsSurface, ts, vs, erased });
const localEmpty = Local(0, list_1.Nil, list_1.Nil, list_1.Nil, list_1.Nil, false);
const localExtend = (local, name, ty, mode, erased, bound = true, inserted = false, val = values_1.VVar(local.index)) => Local(local.index + 1, list_1.Cons(name, local.ns), inserted ? local.nsSurface : list_1.Cons(name, local.nsSurface), list_1.Cons(EntryT(ty, bound, mode, erased, inserted), local.ts), list_1.Cons(val, local.vs), local.erased);
const localErased = (local) => Local(local.index, local.ns, local.nsSurface, local.ts, local.vs, true);
const showVal = (local, val) => S.showValZ(val, local.vs, local.index, local.ns);
const constructMetaType = (l, b, k = 0, skipped = 0, since = 0) => {
    if (l.tag === 'Cons') {
        const [, x, e] = l.head;
        if (!e.bound) {
            const rest = constructMetaType(l.tail, b, k + 1, skipped + 1, 0);
            return C.shift(-1, 1, rest);
        }
        const q = values_1.quote(e.type, k);
        return core_1.Pi(e.mode, e.erased, x, q, constructMetaType(l.tail, b, k + 1, skipped, since + 1));
    }
    return values_1.quote(b, k);
};
const newMeta = (local, erased, ty) => {
    config_1.log(() => `new ${erased ? 'erased ' : ''}meta return type: ${showVal(local, ty)}`);
    const zipped = list_1.zipWithIndex((x, y, i) => [i, x, y], local.ns, local.ts);
    const boundOnly = list_1.filter(zipped, ([_, __, ty]) => ty.bound);
    config_1.log(() => `new meta spine (${local.index}, ${list_1.length(boundOnly)}): ${list_1.listToString(boundOnly, ([i, x, entry]) => `${i} | ${x} | ${showVal(local, entry.type)}`)}`);
    const spine = list_1.map(boundOnly, x => [x[2].mode, core_1.Var(x[0])]);
    config_1.log(() => `new meta spine: ${list_1.listToString(spine, ([m, t]) => m.tag === 'ImplUnif' ? `{${C.show(t)}}` : C.show(t))}`);
    const mty = constructMetaType(list_1.reverse(zipped), ty);
    config_1.log(() => `new meta type: ${C.show(mty)}`);
    const vmty = values_1.evaluate(mty, list_1.Nil);
    config_1.log(() => `new meta type val: ${S.showVal(vmty)}`);
    const newmeta = list_1.foldr(([m, x], y) => core_1.App(y, m, x), core_1.Meta(context_1.freshMeta(vmty, erased)), spine);
    config_1.log(() => `new meta term: ${S.showCore(newmeta, local.ns)}`);
    return newmeta;
};
const inst = (local, ty_) => {
    const ty = values_1.force(ty_);
    if (ty.tag === 'VPi' && ty.mode.tag === 'ImplUnif') {
        const m = newMeta(local, local.erased || ty.erased, ty.type);
        const vm = values_1.evaluate(m, local.vs);
        const [res, args] = inst(local, values_1.vinst(ty, vm));
        return [res, list_1.Cons(m, args)];
    }
    return [ty_, list_1.Nil];
};
const check = (local, tm, ty) => {
    config_1.log(() => `check ${surface_1.show(tm)} : ${showVal(local, ty)}`);
    if (tm.tag === 'Hole') {
        const x = newMeta(local, local.erased, ty);
        if (tm.name) {
            const z = tm.name === '_' ? `_${context_1.freshInstanceId()}` : tm.name;
            context_1.registerHole(z, [values_1.evaluate(x, local.vs), ty, local, z[0] === '_']);
        }
        return x;
    }
    const fty = values_1.force(ty);
    if (tm.tag === 'Abs' && !tm.type && fty.tag === 'VPi' && tm.mode.tag === fty.mode.tag) {
        if (tm.erased && !fty.erased)
            return utils_1.terr(`erasability mismatch in check ${surface_1.show(tm)} : ${showVal(local, ty)}`);
        const v = values_1.VVar(local.index);
        const x = tm.name;
        const body = check(localExtend(local, x, fty.type, tm.mode, fty.erased, true, false, v), tm.body, values_1.vinst(fty, v));
        return core_1.Abs(tm.mode, fty.erased, x, values_1.quote(fty.type, local.index), body);
    }
    if (fty.tag === 'VPi' && fty.mode.tag === 'ImplUnif') {
        const v = values_1.VVar(local.index);
        const term = check(localExtend(local, fty.name, fty.type, fty.mode, fty.erased, true, true, v), tm, values_1.vinst(fty, v));
        return core_1.Abs(fty.mode, fty.erased, fty.name, values_1.quote(fty.type, local.index), term);
    }
    if (tm.tag === 'Pair' && fty.tag === 'VSigma') {
        const fst = check(fty.erased ? localErased(local) : local, tm.fst, fty.type);
        const snd = check(local, tm.snd, values_1.vinst(fty, values_1.evaluate(fst, local.vs)));
        return core_1.Pair(fst, snd, values_1.quote(ty, local.index));
    }
    if (tm.tag === 'Let') {
        let vtype;
        let vty;
        let val;
        if (tm.type) {
            vtype = check(localErased(local), tm.type, values_1.VType);
            vty = values_1.evaluate(vtype, local.vs);
            val = check(tm.erased ? localErased(local) : local, tm.val, ty);
        }
        else {
            [val, vty] = synth(tm.erased ? localErased(local) : local, tm.val);
            vtype = values_1.quote(vty, local.index);
        }
        const v = values_1.evaluate(val, local.vs);
        const body = check(localExtend(local, tm.name, vty, C.Expl, tm.erased, false, false, v), tm.body, ty);
        return core_1.Let(tm.erased, tm.name, vtype, val, body);
    }
    if (tm.tag === 'App') {
        const [fn, args] = S.flattenApp(tm);
        const [left, fnty] = synth(local, fn);
        const [term, rty, problems] = synthapps(local, fnty, left, list_1.listFrom(args), list_1.Nil);
        if (!list_1.isEmpty(problems))
            config_1.log(() => `unsolved constraints in application spine (${surface_1.show(tm)}): ${list_1.listToString(problems, c => showConstraint(local, c))}`);
        const [rtyinst, ms] = inst(local, rty);
        unification_1.unify(local.index, rtyinst, ty);
        list_1.each(problems, ([er, tm, vty, vm]) => {
            const etm = check(er ? localErased(local) : local, tm, vty);
            unification_1.unify(local.index, vm, values_1.evaluate(etm, local.vs));
        });
        return list_1.foldl((a, m) => core_1.App(a, C.ImplUnif, m), term, ms);
    }
    const [term, ty2] = synth(local, tm);
    const [ty2inst, ms] = inst(local, ty2);
    return utils_1.tryT(() => {
        config_1.log(() => `unify ${showVal(local, ty2inst)} ~ ${showVal(local, ty)}`);
        unification_1.unify(local.index, ty2inst, ty);
        return list_1.foldl((a, m) => core_1.App(a, C.ImplUnif, m), term, ms);
    }, e => utils_1.terr(`check failed (${surface_1.show(tm)}): ${showVal(local, ty2)} ~ ${showVal(local, ty)}: ${e}`));
};
const freshPi = (local, mode, erased, x) => {
    const a = newMeta(local, true, values_1.VType);
    const va = values_1.evaluate(a, local.vs);
    const b = newMeta(localExtend(local, '_', va, mode, erased), true, values_1.VType);
    return values_1.evaluate(core_1.Pi(mode, erased, x, a, b), local.vs);
};
const synth = (local, tm) => {
    config_1.log(() => `synth ${surface_1.show(tm)}`);
    if (tm.tag === 'Prim')
        return [core_1.Prim(tm.name), primitives_1.primType(tm.name)];
    if (tm.tag === 'Var') {
        const i = list_1.indexOf(local.nsSurface, tm.name);
        if (i < 0) {
            let ty;
            if (config_1.config.useBase) {
                const [, type] = base_1.getFromBase(tm.name, local.erased);
                ty = values_1.evaluate(type, list_1.Nil);
            }
            else {
                const entry = globals_1.getGlobal(tm.name);
                if (!entry)
                    return utils_1.terr(`global ${tm.name} not found`);
                if (entry.erased && !local.erased)
                    return utils_1.terr(`erased global used: ${surface_1.show(tm)}`);
                ty = entry.type;
            }
            return [core_1.Global(tm.name), ty];
        }
        else {
            const [entry, j] = indexT(local.ts, i) || utils_1.terr(`var out of scope ${surface_1.show(tm)}`);
            if (entry.erased && !local.erased)
                return utils_1.terr(`erased var used: ${surface_1.show(tm)}`);
            return [core_1.Var(j), entry.type];
        }
    }
    if (tm.tag === 'App') {
        const [fn, args] = S.flattenApp(tm);
        const [left, ty] = synth(local, fn);
        const [term, rty, problems] = synthapps(local, ty, left, list_1.listFrom(args), list_1.Nil);
        if (!list_1.isEmpty(problems))
            config_1.log(() => `unsolved constraints in application spine (${surface_1.show(tm)}): ${list_1.listToString(problems, c => showConstraint(local, c))}`);
        list_1.each(problems, ([er, tm, vty, vm]) => {
            const etm = check(er ? localErased(local) : local, tm, vty);
            unification_1.unify(local.index, vm, values_1.evaluate(etm, local.vs));
        });
        return [term, rty];
    }
    if (tm.tag === 'Abs') {
        if (tm.type) {
            const type = check(localErased(local), tm.type, values_1.VType);
            const ty = values_1.evaluate(type, local.vs);
            const [body, rty] = synth(localExtend(local, tm.name, ty, tm.mode, tm.erased), tm.body);
            const pi = values_1.evaluate(core_1.Pi(tm.mode, tm.erased, tm.name, type, values_1.quote(rty, local.index + 1)), local.vs);
            return [core_1.Abs(tm.mode, tm.erased, tm.name, type, body), pi];
        }
        else {
            const pi = freshPi(local, tm.mode, tm.erased, tm.name);
            const term = check(local, tm, pi);
            return [term, pi];
        }
    }
    if (tm.tag === 'Pair') {
        const [fst, fstty] = synth(local, tm.fst);
        const [snd, sndty] = synth(local, tm.snd);
        const ty = core_1.Sigma(false, '_', values_1.quote(fstty, local.index), values_1.quote(sndty, local.index + 1));
        return [core_1.Pair(fst, snd, ty), values_1.evaluate(ty, local.vs)];
    }
    if (tm.tag === 'Proj') {
        const [term, ty] = synth(local, tm.term);
        const fty = values_1.force(ty);
        if (fty.tag !== 'VSigma')
            return utils_1.terr(`not a sigma type in ${surface_1.show(tm)}: ${showVal(local, ty)}`);
        const proj = tm.proj;
        if (proj.tag === 'PCore') {
            const tag = proj.proj;
            if (tag === 'fst' && fty.erased && !local.erased)
                return utils_1.terr(`cannot project from erased sigma in non-erased context in ${surface_1.show(tm)}: ${showVal(local, ty)}`);
            const e = core_1.Proj(tag, term);
            return tag === 'fst' ? [e, fty.type] : [e, values_1.vinst(fty, values_1.vproj('fst', values_1.evaluate(term, local.vs)))];
        }
        else if (proj.tag === 'PIndex') {
            let c = term;
            let t = fty;
            let v = values_1.evaluate(term, local.vs);
            for (let i = 0; i < proj.index; i++) {
                if (t.tag !== 'VSigma')
                    return utils_1.terr(`not a sigma type in ${surface_1.show(tm)}: ${showVal(local, t)}`);
                c = core_1.Proj('snd', c);
                t = values_1.vinst(t, values_1.vproj('fst', v));
                v = values_1.vproj('snd', v);
            }
            if (t.tag !== 'VSigma')
                return utils_1.terr(`not a sigma type in ${surface_1.show(tm)}: ${showVal(local, t)}`);
            if (t.erased && !local.erased)
                return utils_1.terr(`cannot project from erased sigma in non-erased context in ${surface_1.show(tm)}: ${showVal(local, ty)}`);
            return [core_1.Proj('fst', c), t.type];
        }
        else if (proj.tag === 'PName') {
            let c = term;
            let t = fty;
            let v = values_1.evaluate(term, local.vs);
            while (true) {
                if (t.tag !== 'VSigma')
                    return utils_1.terr(`not a sigma type or name not found in ${surface_1.show(tm)}: ${showVal(local, t)}`);
                if (t.name === proj.name)
                    break;
                c = core_1.Proj('snd', c);
                t = values_1.vinst(t, values_1.vproj('fst', v));
                v = values_1.vproj('snd', v);
            }
            if (t.tag !== 'VSigma')
                return utils_1.terr(`not a sigma type in ${surface_1.show(tm)}: ${showVal(local, t)}`);
            if (t.erased && !local.erased)
                return utils_1.terr(`cannot project from erased sigma in non-erased context in ${surface_1.show(tm)}: ${showVal(local, ty)}`);
            return [core_1.Proj('fst', c), t.type];
        }
    }
    if (tm.tag === 'Pi') {
        const type = check(localErased(local), tm.type, values_1.VType);
        const ty = values_1.evaluate(type, local.vs);
        const body = check(localErased(localExtend(local, tm.name, ty, tm.mode, tm.erased)), tm.body, values_1.VType);
        return [core_1.Pi(tm.mode, tm.erased, tm.name, type, body), values_1.VType];
    }
    if (tm.tag === 'Sigma') {
        const type = check(localErased(local), tm.type, values_1.VType);
        const ty = values_1.evaluate(type, local.vs);
        const body = check(localErased(localExtend(local, tm.name, ty, C.Expl, tm.erased)), tm.body, values_1.VType);
        return [core_1.Sigma(tm.erased, tm.name, type, body), values_1.VType];
    }
    if (tm.tag === 'Let') {
        let type;
        let ty;
        let val;
        if (tm.type) {
            type = check(localErased(local), tm.type, values_1.VType);
            ty = values_1.evaluate(type, local.vs);
            val = check(tm.erased ? localErased(local) : local, tm.val, ty);
        }
        else {
            [val, ty] = synth(tm.erased ? localErased(local) : local, tm.val);
            type = values_1.quote(ty, local.index);
        }
        const v = values_1.evaluate(val, local.vs);
        const [body, rty] = synth(localExtend(local, tm.name, ty, C.Expl, tm.erased, false, false, v), tm.body);
        return [core_1.Let(tm.erased, tm.name, type, val, body), rty];
    }
    if (tm.tag === 'Hole') {
        const t = newMeta(local, local.erased, values_1.VType);
        const vt = values_1.evaluate(newMeta(local, local.erased, values_1.evaluate(t, local.vs)), local.vs);
        if (tm.name) {
            const x = tm.name === '_' ? `_${context_1.freshInstanceId()}` : tm.name;
            context_1.registerHole(x, [values_1.evaluate(t, local.vs), vt, local, x[0] === '_']);
        }
        return [t, vt];
    }
    if (tm.tag === 'Signature') {
        let clocal = local;
        const edefs = [];
        for (let i = 0, l = tm.defs.length; i < l; i++) {
            const e = tm.defs[i];
            let type;
            if (e.type) {
                type = check(localErased(clocal), e.type, values_1.VType);
            }
            else {
                type = newMeta(clocal, e.erased, values_1.VType);
            }
            edefs.push([e, type]);
            const ty = values_1.evaluate(type, clocal.vs);
            clocal = localExtend(clocal, e.name, ty, C.Expl, e.erased, true, false);
        }
        const stype = edefs.reduceRight((t, [e, type]) => core_1.Sigma(e.erased, e.name, type, t), values_1.quote(V.VU, local.index));
        return [stype, values_1.VType];
    }
    if (tm.tag === 'Module') {
        const defs = list_1.listFrom(tm.defs);
        const [term, type] = createModuleTerm(local, defs);
        return [term, values_1.evaluate(type, local.vs)];
    }
    if (tm.tag === 'Data') {
        const index = check(localErased(local), tm.index, V.VPi(C.Expl, false, 'R', values_1.VType, R => V.VPi(C.Expl, false, '_', V.VPi(C.Expl, false, 'T', values_1.VType, T => V.VPi(C.Expl, false, '_', V.VPi(C.Expl, false, '_', T, _ => R), _ => R)), _ => V.VPi(C.Expl, false, '_', R, _ => R)))); // (R : *) -> ((T : *) -> (T -> R) -> R) -> R -> R
        const vindex = values_1.evaluate(index, local.vs);
        const cons = tm.cons.map(t => check(localErased(local), t, V.VPi(C.Expl, false, 'R', values_1.VType, R => V.VPi(C.Expl, false, '_', V.VPi(C.Expl, false, 'T', values_1.VType, T => V.VPi(C.Expl, false, '_', V.VPi(C.Expl, false, '_', T, _ => R), _ => R)), _ => V.VPi(C.Expl, false, '_', V.vappEs([vindex, values_1.VType, V.VAbsE('T', values_1.VType, T => V.VAbsE('K', V.VPiE('_', T, _ => values_1.VType), K => V.VPiE('x', T, x => V.vapp(K, C.Expl, x)))), V.VPi(C.Expl, false, '_', R, _ => R)]), _ => V.VPi(C.Expl, false, '_', V.vappEs([vindex, values_1.VType, V.VAbsE('T', values_1.VType, T => V.VAbsE('K', V.VPiE('_', T, _ => values_1.VType), K => V.VPiE('x', T, x => V.vapp(K, C.Expl, x)))), R]), _ => R)))))); // (R : *) -> ((T : *) -> (T -> R) -> R) -> (index * (\(T : *) (K : T -> *). (x : T) -> K x) (R -> R)) -> (index * (\T K. (x : T) -> K x) R) -> R
        return [C.DataDef(index, cons), V.VDataSort];
    }
    if (tm.tag === 'TCon') {
        const data = check(localErased(local), tm.data, V.VDataSort);
        const vdata = values_1.force(values_1.evaluate(data, local.vs));
        if (vdata.tag !== 'VData')
            return utils_1.terr(`not a data in tcon: ${surface_1.show(tm)}`);
        const ty = V.vappEs([vdata.index, values_1.VType, V.VAbsE('T', values_1.VType, T => V.VAbsE('K', V.VPiE('_', T, _ => values_1.VType), K => V.VPiE('x', T, x => V.vappE(K, x)))), values_1.VType]); // index * (\(T : *) (K : T -> *). (x : T) -> K x) *
        const [term, rty, problems] = synthapps(local, ty, C.Type, list_1.listFrom(tm.args.map(t => [C.Expl, t])), list_1.Nil);
        if (!list_1.isEmpty(problems))
            config_1.log(() => `unsolved constraints in application spine (${surface_1.show(tm)}): ${list_1.listToString(problems, c => showConstraint(local, c))}`);
        list_1.each(problems, ([er, tm, vty, vm]) => {
            const etm = check(er ? localErased(local) : local, tm, vty);
            unification_1.unify(local.index, vm, values_1.evaluate(etm, local.vs));
        });
        unification_1.unify(local.index, rty, values_1.VType); // TODO: probably not necessary
        const args = C.flattenApp(term)[1].map(x => x[1]);
        return [C.TCon(data, args), values_1.VType];
    }
    return utils_1.terr(`unable to synth ${surface_1.show(tm)}`);
};
const createModuleTerm = (local, entries) => {
    if (entries.tag === 'Nil')
        return [values_1.quote(V.VUnit, 0), values_1.quote(V.VU, 0)];
    const e = entries.head;
    const rest = entries.tail;
    let type;
    let ty;
    let val;
    if (e.type) {
        type = check(localErased(local), e.type, values_1.VType);
        ty = values_1.evaluate(type, local.vs);
        val = check(e.erased ? localErased(local) : local, e.val, ty);
    }
    else {
        [val, ty] = synth(e.erased ? localErased(local) : local, e.val);
        type = values_1.quote(ty, local.index);
    }
    const v = values_1.evaluate(val, local.vs);
    const nextlocal = localExtend(local, e.name, ty, C.Expl, e.erased, false, false, v);
    const [nextterm, nexttype] = createModuleTerm(nextlocal, rest);
    if (e.private) {
        return [core_1.Let(e.erased, e.name, type, val, nextterm), C.substTop(nexttype, val)];
    }
    else {
        const sigma = core_1.Sigma(e.erased, e.name, type, nexttype);
        return [core_1.Let(e.erased, e.name, type, val, core_1.Pair(core_1.Var(0), nextterm, C.shift(1, 0, sigma))), sigma];
    }
};
const showConstraint = (local, c) => `Constraint(${c[0] ? `impl ` : ''}${showVal(local, c[3])} ~> ${surface_1.show(c[1])} : ${showVal(local, c[2])})`;
const synthapps = (local, ty, tm, spine, problems) => {
    config_1.log(() => `synthapps ${showVal(local, ty)} ${list_1.listToString(spine, ([m, t]) => `@${m.tag === 'ImplUnif' ? 'impl' : ''} ${surface_1.show(t)}`)} | ${S.showCore(tm, local.ns)}`);
    if (list_1.isEmpty(spine))
        return [tm, ty, problems];
    const fty = values_1.force(ty);
    const [mode, stm] = spine.head;
    if (fty.tag === 'VPi' && fty.mode.tag === mode.tag) {
        const cty = fty.type;
        /*
        const fcty = force(cty);
        if (false && fcty.tag === 'VNe' && fcty.head.tag === 'HMeta' && (stm.tag !== 'Hole' && stm.tag !== 'Prim' && stm.tag !== 'Meta' && stm.tag !== 'App')) {
          const m = newMeta(local, local.erased || fty.erased, fty.type);
          const vm = evaluate(m, local.vs);
          return synthapps(local, vinst(fty, vm), App(tm, mode, m), tail(spine), Cons([fty.erased, stm, fcty, vm], problems));
        } else
        */ {
            const term = check(fty.erased ? localErased(local) : local, stm, cty);
            const v = values_1.evaluate(term, local.vs);
            return synthapps(local, values_1.vinst(fty, v), core_1.App(tm, mode, term), list_1.tail(spine), problems);
        }
    }
    if (fty.tag === 'VPi' && fty.mode.tag === 'ImplUnif' && mode.tag === 'Expl') {
        const m = newMeta(local, local.erased || fty.erased, fty.type);
        const vm = values_1.evaluate(m, local.vs);
        return synthapps(local, values_1.vinst(fty, vm), core_1.App(tm, C.ImplUnif, m), spine, problems);
    }
    if (ty.tag === 'VNe' && ty.head.tag === 'HMeta') {
        const m = context_1.getMeta(ty.head.index);
        const mty = m.type;
        const a = context_1.freshMeta(mty, m.erased);
        const b = context_1.freshMeta(mty, m.erased);
        const pi = values_1.evaluate(core_1.Pi(mode, false, '_', values_1.quote(values_1.VNe(values_1.HMeta(a), ty.spine), local.index), values_1.quote(values_1.VNe(values_1.HMeta(b), ty.spine), local.index + 1)), local.vs);
        unification_1.unify(local.index, ty, pi);
        return synthapps(local, pi, tm, spine, problems);
    }
    return utils_1.terr(`not a correct pi type in synthapp: ${showVal(local, ty)} ${list_1.listToString(spine, ([m, t]) => `@${m.tag === 'ImplUnif' ? 'impl' : ''} ${surface_1.show(t)}`)} | ${S.showCore(tm, local.ns)}`);
};
const solveInstances = () => {
    config_1.log(() => `solve instances`);
    const instances = context_1.getHoleEntries().filter(p => p[1][3]);
    for (let [name, [tm_, ty_, local]] of instances) {
        const ty = values_1.force(ty_);
        const tm = values_1.force(tm_);
        config_1.log(() => `searchInstance _${name} = ${showVal(local, tm)} : ${showVal(local, ty)}`);
        if (ty.tag === 'VNe' && ty.head.tag === 'HMeta')
            return utils_1.terr(`cannot solve instance _${name}, expected type is a meta: ${showVal(local, ty)}`);
        if (tm.tag === 'VNe' && tm.head.tag !== 'HMeta')
            return utils_1.terr(`cannot solve instance _${name}, expected term is not a meta: ${showVal(local, tm)}`);
        return utils_1.terr(`failed to find instance for _${name} = ${showVal(local, tm_)} : ${showVal(local, ty_)}`);
    }
};
const MAX_SOLVING_COUNT = 100;
const tryToSolveBlockedProblems = () => {
    config_1.log(() => `try solve unsolved problems`);
    if (context_1.amountOfProblems() > 0) {
        let changed = true;
        let count = 0;
        while (changed && count++ < MAX_SOLVING_COUNT) {
            const blocked = context_1.allProblems();
            changed = false;
            for (let i = 0, l = blocked.length; i < l; i++) {
                const c = blocked[i];
                const l = context_1.amountOfProblems();
                unification_1.unify(c.k, c.a, c.b);
                if (context_1.amountOfProblems() > l)
                    changed = true;
            }
        }
    }
};
const elaborate = (t, erased = false) => {
    context_1.resetContext();
    const [tm, ty] = synth(erased ? localErased(localEmpty) : localEmpty, t);
    tryToSolveBlockedProblems();
    solveInstances();
    tryToSolveBlockedProblems();
    const ztm = values_1.zonk(tm);
    const zty = values_1.zonk(values_1.quote(ty, 0));
    showHoles(ztm, zty);
    if (!context_1.contextSolved())
        return utils_1.terr(`not all metas are solved: ${S.showCore(ztm)} : ${S.showCore(zty)}`);
    return [ztm, zty];
};
exports.elaborate = elaborate;
const elaborateDefs = (ds, allowRedefinition = false) => {
    config_1.log(() => `elaborateDefs ${S.showDefs(ds)}`);
    const xs = [];
    if (!allowRedefinition) {
        for (let i = 0; i < ds.length; i++) {
            const d = ds[i];
            if (d.tag === 'DDef' && globals_1.hasGlobal(d.name))
                return utils_1.terr(`cannot redefine global ${d.name}`);
        }
    }
    for (let i = 0; i < ds.length; i++) {
        const d = ds[i];
        config_1.log(() => `elaborateDef ${S.showDef(d)}`);
        if (d.tag === 'DDef') {
            try {
                const [tm, ty] = exports.elaborate(d.value, d.erased);
                config_1.log(() => `set ${d.name} : ${S.showCore(ty)} = ${S.showCore(tm)}`);
                const [, er] = typecheck_1.typecheck(tm, d.erased);
                config_1.log(() => `erased term: ${E.show(er)}`);
                globals_1.setGlobal(d.name, d.erased, tm, values_1.evaluate(tm, list_1.Nil), values_1.evaluate(ty, list_1.Nil), er, EV.evaluate(er, list_1.Nil));
                if (config_1.config.writeToBase)
                    base_1.addToBase(d.name, tm, d.erased, true);
                const i = xs.indexOf(d.name);
                if (i >= 0)
                    xs.splice(i, 1);
                xs.push(d.name);
            }
            catch (err) {
                err.message = `error in def ${d.name}: ${err.message}`;
                throw err;
            }
        }
        else if (d.tag === 'DExecute') {
            try {
                console.log(S.showDef(d));
                console.log(`term: ${S.show(d.term)}`);
                const [eterm, etype] = exports.elaborate(d.term, d.erased);
                console.log(`type: ${S.showCore(etype)}`);
                console.log(`etrm: ${S.showCore(eterm)}`);
                if (!d.typeOnly) {
                    const unfolded = V.normalize(eterm, false);
                    console.log(`etru: ${S.showCore(unfolded)}`);
                    const [ttype, er] = typecheck_1.typecheck(eterm, d.erased);
                    console.log(`ctyp: ${S.showCore(ttype)}`);
                    console.log(`eras: ${E.show(er)}`);
                    console.log(`nera: ${E.show(EV.normalize(er, true))}`);
                }
                console.log();
            }
            catch (err) {
                err.message = `error in ${S.showDef(d)}: ${err.message}`;
                throw err;
            }
        }
    }
    return xs;
};
exports.elaborateDefs = elaborateDefs;
const showValSZ = (local, v) => S.showCore(values_1.zonk(values_1.quote(v, local.index, false), local.vs, local.index, false), local.ns);
const showHoles = (tm, ty) => {
    const holeprops = context_1.getHoleEntries().filter(p => !p[1][3]);
    if (holeprops.length === 0)
        return;
    const strtype = S.showCore(ty);
    const strterm = S.showCore(tm);
    const str = holeprops.map(([x, [t, v, local]]) => {
        const all = list_1.zipWith(([x, v], { bound: def, type: ty, inserted, mode }) => [x, v, def, ty, inserted, mode], list_1.zipWith((x, v) => [x, v], local.ns, local.vs), local.ts);
        const allstr = list_1.toArray(all, ([x, v, b, t, _, p]) => `${p !== C.Expl ? `{${x}}` : x} : ${showValSZ(local, t)}${b ? '' : ` = ${showValSZ(local, v)}`}`).join('\n');
        return `\n_${x} : ${showValSZ(local, v)} = ${showValSZ(local, t)}\nlocal:\n${allstr}\n`;
    }).join('\n');
    return utils_1.terr(`unsolved holes\ntype: ${strtype}\nterm: ${strterm}\n${str}`);
};

},{"./base":1,"./config":2,"./context":3,"./core":5,"./erased":7,"./erasedvalues":9,"./globals":10,"./primitives":13,"./surface":16,"./typecheck":17,"./unification":18,"./utils/list":20,"./utils/utils":21,"./values":22}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.show = exports.flattenPair = exports.flattenApp = exports.termId = exports.Let = exports.Proj = exports.Pair = exports.Abs = exports.App = exports.Global = exports.Var = void 0;
const Var = (index) => ({ tag: 'Var', index });
exports.Var = Var;
const Global = (name) => ({ tag: 'Global', name });
exports.Global = Global;
const App = (left, right) => ({ tag: 'App', left, right });
exports.App = App;
const Abs = (body) => ({ tag: 'Abs', body });
exports.Abs = Abs;
const Pair = (fst, snd) => ({ tag: 'Pair', fst, snd });
exports.Pair = Pair;
const Proj = (proj, term) => ({ tag: 'Proj', proj, term });
exports.Proj = Proj;
const Let = (val, body) => ({ tag: 'Let', val, body });
exports.Let = Let;
exports.termId = exports.Abs(exports.Var(0));
const flattenApp = (t) => {
    const r = [];
    while (t.tag === 'App') {
        r.push(t.right);
        t = t.left;
    }
    return [t, r.reverse()];
};
exports.flattenApp = flattenApp;
const flattenPair = (t) => {
    const r = [];
    while (t.tag === 'Pair') {
        r.push(t.fst);
        t = t.snd;
    }
    r.push(t);
    return r;
};
exports.flattenPair = flattenPair;
const showP = (b, t) => b ? `(${exports.show(t)})` : exports.show(t);
const show = (t) => {
    if (t.tag === 'Var')
        return `${t.index}`;
    if (t.tag === 'Global')
        return `${t.name}`;
    if (t.tag === 'App') {
        const [f, as] = exports.flattenApp(t);
        return `${showP(f.tag === 'Abs' || f.tag === 'Let', f)} ${as.map(t => showP(t.tag === 'Abs' || t.tag === 'App' || t.tag === 'Let' || t.tag === 'Proj', t)).join(' ')}`;
    }
    if (t.tag === 'Abs')
        return `\\${exports.show(t.body)}`;
    if (t.tag === 'Pair')
        return `(${exports.flattenPair(t).map(exports.show).join(', ')})`;
    if (t.tag === 'Proj')
        return `${t.proj} ${exports.show(t.term)}`;
    if (t.tag === 'Let')
        return `let ${showP(t.val.tag === 'Let', t.val)}; ${exports.show(t.body)}`;
    return t;
};
exports.show = show;

},{}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.primErased = void 0;
const erasedvalues_1 = require("./erasedvalues");
const utils_1 = require("./utils/utils");
const l = erasedvalues_1.VAbs;
const ap = erasedvalues_1.vapps;
const id = l(x => x);
const fst = (x) => erasedvalues_1.vproj('fst', x);
const snd = (x) => erasedvalues_1.vproj('snd', x);
// in = \x alg. alg (\r. r alg) x
const inM = l(x => l(alg => ap([alg, l(r => ap([r, alg])), x])));
// fold = \alg r. r alg
const foldM = l(alg => l(r => ap([r, alg])));
// elimIDesc = \ce ca cf cr ch d. foldM (\r x. x ce (\f. ca f (\a. r (f a))) (\f. cae f (r f)) (\d. cf d (r d)) (\d. cr d (r d)) (\d. ch d (r d))) d 
const elimIDesc = l(ce => l(ca => l(cae => l(cf => l(cr => l(ch => l(d => ap([foldM, l(r => l(x => ap([
        x,
        ce,
        l(f => ap([ca, f, l(a => ap([r, ap([f, a])]))])),
        l(f => ap([cae, f, ap([r, f])])),
        l(d => ap([cf, d, ap([r, d])])),
        l(d => ap([cr, d, ap([r, d])])),
        l(d => ap([ch, d, ap([r, d])])),
    ]))), d]))))))));
// allI = \d. elimIDesc (\p xs. id) (\f r p xs. r xs.fst p xs.snd) (\f r p xs. r p xs) (\d r. r p xs.snd) (\d r. (p xs.fst, r p xs.snd)) (\d r. (\h. p (xs.fst h), r p xs.snd)) d
const allI = l(d => ap([
    elimIDesc,
    l(_ => l(_ => id)),
    l(_ => l(r => l(p => l(xs => ap([r, fst(xs), p, snd(xs)]))))),
    l(_ => l(r => l(p => l(xs => ap([r, p, xs]))))),
    l(_ => l(r => l(p => l(xs => ap([r, p, snd(xs)]))))),
    l(_ => l(r => l(p => l(xs => erasedvalues_1.VPair(ap([p, fst(xs)]), ap([r, p, snd(xs)])))))),
    l(_ => l(r => l(p => l(xs => erasedvalues_1.VPair(l(h => ap([p, ap([fst(xs), h])])), ap([r, p, snd(xs)])))))),
    d,
]));
const primErasedMap = {
    'Type': id,
    'Data': id,
    'B': id,
    '0': l(_ => l(y => y)),
    '1': l(x => l(_ => x)),
    'elimB': l(f => l(t => l(b => ap([b, t, f])))),
    'HEq': id,
    'ReflHEq': id,
    'elimHEq': id,
    'IDesc': id,
    // inM (\ce ca cae cf cr ch. ce)
    'IEnd': ap([inM, l(c => l(_ => l(_ => l(_ => l(_ => l(_ => c))))))]),
    // \f. inM (\ce ca cae cf cr ch. ca f)
    'IArg': l(f => ap([inM, l(_ => l(c => l(_ => l(_ => l(_ => l(_ => ap([c, f])))))))])),
    // \f. inM (\ce ca cae cf cr ch. cae f)
    'IArgE': l(f => ap([inM, l(_ => l(_ => l(c => l(_ => l(_ => l(_ => ap([c, f])))))))])),
    // \d. inM (\ce ca cae cf cr ch. cf d)
    'IFArg': l(d => ap([inM, l(_ => l(_ => l(_ => l(c => l(_ => l(_ => ap([c, d])))))))])),
    // \d. inM (\ce ca cae cf cr ch. cr d)
    'IRec': l(d => ap([inM, l(_ => l(_ => l(_ => l(_ => l(c => l(_ => ap([c, d])))))))])),
    // \d. inM (\ce ca cae cf cr ch. ch d)
    'IHRec': l(d => ap([inM, l(_ => l(_ => l(_ => l(_ => l(_ => l(c => ap([c, d])))))))])),
    'elimIDesc': elimIDesc,
    'InterpI': id,
    'AllI': id,
    'allI': allI,
    'IData': id,
    // \x. inM (\f. f x)
    'ICon': l(x => ap([inM, l(f => ap([f, x]))])),
    // \d h x. foldM (\rec f. f (\c. h c (allI d r c))) x
    'indI': l(d => l(h => l(x => ap([foldM, l(r => l(f => ap([f, l(c => ap([h, c, ap([allI, d, r, c])]))]))), x])))),
};
const primErased = (name) => primErasedMap[name] || utils_1.impossible(`primErased: ${name}`);
exports.primErased = primErased;

},{"./erasedvalues":9,"./utils/utils":21}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showVal = exports.normalize = exports.quote = exports.evaluate = exports.vproj = exports.vapps = exports.vapp = exports.forceGlobal = exports.vinst = exports.VVar = exports.VPair = exports.VAbs = exports.VGlobal = exports.VNe = exports.EProj = exports.EApp = void 0;
const base_1 = require("./base");
const config_1 = require("./config");
const erased_1 = require("./erased");
const globals_1 = require("./globals");
const lazy_1 = require("./utils/lazy");
const list_1 = require("./utils/list");
const utils_1 = require("./utils/utils");
const EApp = (right) => ({ tag: 'EApp', right });
exports.EApp = EApp;
const EProj = (proj) => ({ tag: 'EProj', proj });
exports.EProj = EProj;
const VNe = (head, spine) => ({ tag: 'VNe', head, spine });
exports.VNe = VNe;
const VGlobal = (head, args, val) => ({ tag: 'VGlobal', head, args, val });
exports.VGlobal = VGlobal;
const VAbs = (clos) => ({ tag: 'VAbs', clos });
exports.VAbs = VAbs;
const VPair = (fst, snd) => ({ tag: 'VPair', fst, snd });
exports.VPair = VPair;
const VVar = (index, spine = list_1.Nil) => exports.VNe(index, spine);
exports.VVar = VVar;
const vinst = (val, arg) => val.clos(arg);
exports.vinst = vinst;
const forceGlobal = (v) => {
    if (v.tag === 'VGlobal')
        return exports.forceGlobal(lazy_1.forceLazy(v.val));
    return v;
};
exports.forceGlobal = forceGlobal;
const vapp = (left, right) => {
    if (left.tag === 'VAbs')
        return exports.vinst(left, right);
    if (left.tag === 'VNe')
        return exports.VNe(left.head, list_1.Cons(exports.EApp(right), left.spine));
    if (left.tag === 'VGlobal')
        return exports.VGlobal(left.head, list_1.Cons(exports.EApp(right), left.args), lazy_1.mapLazy(left.val, v => exports.vapp(v, right)));
    return utils_1.impossible(`vapp: ${left.tag}`);
};
exports.vapp = vapp;
const vapps = (a) => a.reduce(exports.vapp);
exports.vapps = vapps;
const vproj = (proj, v) => {
    if (v.tag === 'VPair')
        return proj === 'fst' ? v.fst : v.snd;
    if (v.tag === 'VNe')
        return exports.VNe(v.head, list_1.Cons(exports.EProj(proj), v.spine));
    if (v.tag === 'VGlobal')
        return exports.VGlobal(v.head, list_1.Cons(exports.EProj(proj), v.args), lazy_1.mapLazy(v.val, v => exports.vproj(proj, v)));
    return utils_1.impossible(`vproj: ${v.tag}`);
};
exports.vproj = vproj;
const evaluate = (t, vs) => {
    if (t.tag === 'Abs')
        return exports.VAbs(v => exports.evaluate(t.body, list_1.Cons(v, vs)));
    if (t.tag === 'Pair')
        return exports.VPair(exports.evaluate(t.fst, vs), exports.evaluate(t.snd, vs));
    if (t.tag === 'Var')
        return list_1.index(vs, t.index) || utils_1.impossible(`evaluate: var ${t.index} has no value`);
    if (t.tag === 'Global') {
        let val;
        if (config_1.config.useBase) {
            const [, , erased] = base_1.getFromBase(t.name);
            val = exports.evaluate(erased, list_1.Nil);
        }
        else {
            const entry = globals_1.getGlobal(t.name) || utils_1.impossible(`evaluate: global ${t.name} has no value`);
            val = entry.valerased;
        }
        return exports.VGlobal(t.name, list_1.Nil, lazy_1.lazyOf(val));
    }
    if (t.tag === 'App')
        return exports.vapp(exports.evaluate(t.left, vs), exports.evaluate(t.right, vs));
    if (t.tag === 'Let')
        return exports.evaluate(t.body, list_1.Cons(exports.evaluate(t.val, vs), vs));
    if (t.tag === 'Proj')
        return exports.vproj(t.proj, exports.evaluate(t.term, vs));
    return t;
};
exports.evaluate = evaluate;
const quoteHead = (h, k) => erased_1.Var(k - (h + 1));
const quoteElim = (t, e, k, full) => {
    if (e.tag === 'EApp')
        return erased_1.App(t, exports.quote(e.right, k, full));
    if (e.tag === 'EProj')
        return erased_1.Proj(e.proj, t);
    return e;
};
const quote = (v, k, full = false) => {
    if (v.tag === 'VNe')
        return list_1.foldr((x, y) => quoteElim(y, x, k, full), quoteHead(v.head, k), v.spine);
    if (v.tag === 'VGlobal') {
        if (full || config_1.config.unfold.includes(v.head))
            return exports.quote(lazy_1.forceLazy(v.val), k, full);
        return list_1.foldr((x, y) => quoteElim(y, x, k, full), erased_1.Global(v.head), v.args);
    }
    if (v.tag === 'VPair')
        return erased_1.Pair(exports.quote(v.fst, k, full), exports.quote(v.snd, k, full));
    if (v.tag === 'VAbs')
        return erased_1.Abs(exports.quote(exports.vinst(v, exports.VVar(k)), k + 1, full));
    return v;
};
exports.quote = quote;
const normalize = (t, full = false) => exports.quote(exports.evaluate(t, list_1.Nil), 0, full);
exports.normalize = normalize;
const showVal = (v, k = 0, full = false) => erased_1.show(exports.quote(v, k, full));
exports.showVal = showVal;

},{"./base":1,"./config":2,"./erased":7,"./globals":10,"./utils/lazy":19,"./utils/list":20,"./utils/utils":21}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGlobal = exports.setGlobal = exports.hasGlobal = exports.getGlobal = exports.getGlobals = exports.resetGlobals = void 0;
let env = new Map();
const resetGlobals = () => {
    env.clear();
};
exports.resetGlobals = resetGlobals;
const getGlobals = () => env;
exports.getGlobals = getGlobals;
const getGlobal = (name) => env.get(name) || null;
exports.getGlobal = getGlobal;
const hasGlobal = (name) => env.has(name);
exports.hasGlobal = hasGlobal;
const setGlobal = (name, erased, term, val, type, termerased, valerased) => {
    if (env.has(name))
        env.delete(name);
    env.set(name, { erased, term, val, type, termerased, valerased });
};
exports.setGlobal = setGlobal;
const deleteGlobal = (name) => {
    env.delete(name);
};
exports.deleteGlobal = deleteGlobal;

},{}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chooseName = exports.nextName = void 0;
const list_1 = require("./utils/list");
const nextName = (x) => {
    if (x === '_')
        return x;
    const s = x.split('$');
    if (s.length === 2)
        return `${s[0]}\$${+s[1] + 1}`;
    return `${x}\$0`;
};
exports.nextName = nextName;
const chooseName = (x, ns) => x === '_' ? x : list_1.contains(ns, x) ? exports.chooseName(exports.nextName(x), ns) : x;
exports.chooseName = chooseName;

},{"./utils/list":20}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDefs = exports.parseDef = exports.parse = void 0;
const utils_1 = require("./utils/utils");
const surface_1 = require("./surface");
const core_1 = require("./core");
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
    return utils_1.serr(`invalid bracket: ${c}`);
};
const TName = (name) => ({ tag: 'Name', name });
const TNum = (num) => ({ tag: 'Num', num });
const TList = (list, bracket) => ({ tag: 'List', list, bracket });
const TStr = (str) => ({ tag: 'Str', str });
const SYM1 = ['\\', ':', '=', ',', '*', ';'];
const SYM2 = ['->', '**'];
const START = 0;
const NAME = 1;
const COMMENT = 2;
const NUMBER = 3;
const STRING = 4;
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
            else if (c === '"')
                state = STRING;
            else if (c === '.' && !/[\.\%\_a-z]/i.test(next))
                r.push(TName('.'));
            else if (c + next === '--')
                i++, state = COMMENT;
            else if (/[\-\.\?\@\#\%\_a-z]/i.test(c))
                t += c, state = NAME;
            else if (/[0-9]/.test(c))
                t += c, state = NUMBER;
            else if (c === '(' || c === '{')
                b.push(c), p.push(r), r = [];
            else if (c === ')' || c === '}') {
                if (b.length === 0)
                    return utils_1.serr(`unmatched bracket: ${c}`);
                const br = b.pop();
                if (matchingBracket(br) !== c)
                    return utils_1.serr(`unmatched bracket: ${br} and ${c}`);
                const a = p.pop();
                a.push(TList(r, br));
                r = a;
            }
            else if (/\s/.test(c))
                continue;
            else
                return utils_1.serr(`invalid char ${c} in tokenize`);
        }
        else if (state === NAME) {
            if (!(/[a-z0-9\-\_\/]/i.test(c) || (c === '.' && /[a-z0-9]/i.test(next)))) {
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
        else if (state === STRING) {
            if (c === '\\')
                esc = true;
            else if (esc)
                t += c, esc = false;
            else if (c === '"') {
                r.push(TStr(t));
                t = '', state = START;
            }
            else
                t += c;
        }
    }
    if (b.length > 0)
        return utils_1.serr(`unclosed brackets: ${b.join(' ')}`);
    if (state !== START && state !== COMMENT)
        return utils_1.serr('invalid tokenize end state');
    if (esc)
        return utils_1.serr(`escape is true after tokenize`);
    return r;
};
const tunit = surface_1.Var('U');
const unit = surface_1.Var('Unit');
const isName = (t, x) => t.tag === 'Name' && t.name === x;
const isNames = (t) => t.map(x => {
    if (x.tag !== 'Name')
        return utils_1.serr(`expected name`);
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
    return utils_1.serr(`invalid lambda param`);
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
    return utils_1.serr(`invalid pi param`);
};
const parseProj = (t, xx) => {
    const spl = xx.split('.');
    let c = t;
    for (let i = 0; i < spl.length; i++) {
        const x = spl[i];
        const n = +x;
        let proj;
        if (!isNaN(n) && n >= 0 && Math.floor(n) === n)
            proj = surface_1.PIndex(n);
        else if (x === 'fst')
            proj = surface_1.PCore('fst');
        else if (x === 'snd')
            proj = surface_1.PCore('snd');
        else
            proj = surface_1.PName(x);
        c = surface_1.Proj(proj, c);
    }
    return c;
};
const codepoints = (s) => {
    const chars = [];
    for (let i = 0; i < s.length; i++) {
        const c1 = s.charCodeAt(i);
        if (c1 >= 0xD800 && c1 < 0xDC00 && i + 1 < s.length) {
            const c2 = s.charCodeAt(i + 1);
            if (c2 >= 0xDC00 && c2 < 0xE000) {
                chars.push(0x10000 + ((c1 - 0xD800) << 10) + (c2 - 0xDC00));
                i++;
                continue;
            }
        }
        chars.push(c1);
    }
    return chars;
};
const numToNat = (n) => {
    if (isNaN(n))
        return utils_1.serr(`invalid nat number: ${n}`);
    const s = surface_1.Var('S');
    let c = surface_1.Var('Z');
    for (let i = 0; i < n; i++)
        c = surface_1.App(s, core_1.Expl, c);
    return c;
};
const expr = (t) => {
    if (t.tag === 'List')
        return [exprs(t.list, '('), t.bracket === '{'];
    if (t.tag === 'Str') {
        const s = codepoints(t.str).reverse();
        const Cons = surface_1.Var('Cons');
        const Nil = surface_1.Var('Nil');
        return [s.reduce((t, n) => surface_1.App(surface_1.App(Cons, core_1.Expl, numToNat(n)), core_1.Expl, t), Nil), false];
    }
    if (t.tag === 'Name') {
        const x = t.name;
        if (x === '*')
            return [surface_1.Type, false];
        if (x.startsWith('_')) {
            const rest = x.slice(1);
            return [surface_1.Hole(rest.length > 0 ? rest : null), false];
        }
        if (x[0] === '%') {
            const rest = x.slice(1);
            if (core_1.isPrimName(rest))
                return [surface_1.Prim(rest), false];
            return utils_1.serr(`invalid primitive: ${x}`);
        }
        if (/[a-z]/i.test(x[0])) {
            if (x.includes('.')) {
                const spl = x.split('.');
                const v = spl[0];
                const rest = spl.slice(1).join('.');
                return [parseProj(surface_1.Var(v), rest), false];
            }
            return [surface_1.Var(x), false];
        }
        return utils_1.serr(`invalid name: ${x}`);
    }
    if (t.tag === 'Num') {
        if (t.num.endsWith('b')) {
            const n = +t.num.slice(0, -1);
            if (isNaN(n))
                return utils_1.serr(`invalid number: ${t.num}`);
            const s0 = surface_1.Var('B0');
            const s1 = surface_1.Var('B1');
            let c = surface_1.Var('BE');
            const s = n.toString(2);
            for (let i = 0; i < s.length; i++)
                c = surface_1.App(s[i] === '0' ? s0 : s1, core_1.Expl, c);
            return [c, false];
        }
        else if (t.num.endsWith('f')) {
            const n = +t.num.slice(0, -1);
            if (isNaN(n))
                return utils_1.serr(`invalid number: ${t.num}`);
            const s = surface_1.Var('FS');
            let c = surface_1.Var('FZ');
            for (let i = 0; i < n; i++)
                c = surface_1.App(s, core_1.Expl, c);
            return [c, false];
        }
        else if (t.num.endsWith('n')) {
            return [numToNat(+t.num.slice(0, -1)), false];
        }
        else {
            return [numToNat(+t.num), false];
        }
    }
    return t;
};
const exprs = (ts, br) => {
    if (br === '{')
        return utils_1.serr(`{} cannot be used here`);
    if (ts.length === 0)
        return unit;
    if (ts.length === 1)
        return expr(ts[0])[0];
    if (isName(ts[0], 'signature')) {
        if (ts.length !== 2)
            return utils_1.serr(`invalid signature (1)`);
        const b = ts[1];
        if (b.tag !== 'List' || b.bracket !== '{')
            return utils_1.serr(`invalid signature (2)`);
        const bs = b.list;
        const spl = splitTokens(bs, t => t.tag === 'Name' && t.name === 'def', true);
        const entries = [];
        for (let i = 0; i < spl.length; i++) {
            const c = spl[i];
            if (c.length === 0)
                continue;
            if (c[0].tag !== 'Name')
                return utils_1.serr(`invalid signature, def does not start with def`);
            if (c[0].name !== 'def')
                return utils_1.serr(`invalid signature, def does not start with def`);
            const x = c[1];
            let impl = false;
            let name_ = '';
            if (x.tag === 'Name') {
                name_ = x.name;
            }
            else if (x.tag === 'List' && x.bracket === '{') {
                const a = x.list;
                if (a.length !== 1)
                    return utils_1.serr(`invalid name for signature def`);
                const h = a[0];
                if (h.tag !== 'Name')
                    return utils_1.serr(`invalid name for signature def`);
                name_ = h.name;
                impl = true;
            }
            else
                return utils_1.serr(`invalid name for signature def`);
            if (impl)
                return utils_1.serr(`signature definition cannot be implicit`);
            if (name_.length === 0 || name_ === '-')
                return utils_1.serr(`signature definition with empty name`);
            const erased = name_[0] === '-';
            const name = erased ? name_.slice(1) : name_;
            const fst = 2;
            const sym = c[fst];
            if (!sym) {
                entries.push({ erased, name, type: null });
                continue;
            }
            if (sym.tag !== 'Name')
                return utils_1.serr(`signature def: after name should be :`);
            if (sym.name === ':') {
                const type = exprs(c.slice(fst + 1), '(');
                entries.push({ erased, name, type });
                continue;
            }
            else
                return utils_1.serr(`def: : or = expected but got ${sym.name}`);
        }
        return surface_1.Signature(entries);
    }
    if (isName(ts[0], 'module')) {
        if (ts.length !== 2)
            return utils_1.serr(`invalid module (1)`);
        const b = ts[1];
        if (b.tag !== 'List' || b.bracket !== '{')
            return utils_1.serr(`invalid module (2)`);
        const bs = b.list;
        const spl = splitTokens(bs, t => t.tag === 'Name' && ['def', 'private'].includes(t.name), true);
        const entries = [];
        let private_flag = false;
        for (let i = 0; i < spl.length; i++) {
            const c = spl[i];
            if (c.length === 0)
                continue;
            if (c[0].tag !== 'Name')
                return utils_1.serr(`invalid module, def does not start with def or private`);
            if (c[0].name !== 'def' && c[0].name !== 'private')
                return utils_1.serr(`invalid module, def does not start with def or private`);
            if (c[0].name === 'private') {
                if (c.length > 1)
                    return utils_1.serr(`something went wrong in parsing module private definition`);
                private_flag = true;
                continue;
            }
            let private_ = false;
            if (c[0].name === 'def' && private_flag) {
                private_flag = false;
                private_ = true;
            }
            const x = c[1];
            let impl = false;
            let name_ = '';
            if (x.tag === 'Name') {
                name_ = x.name;
            }
            else if (x.tag === 'List' && x.bracket === '{') {
                const a = x.list;
                if (a.length !== 1)
                    return utils_1.serr(`invalid name for module def`);
                const h = a[0];
                if (h.tag !== 'Name')
                    return utils_1.serr(`invalid name for module def`);
                name_ = h.name;
                impl = true;
            }
            else
                return utils_1.serr(`invalid name for module def`);
            if (impl)
                return utils_1.serr(`module definition cannot be implicit`);
            if (name_.length === 0 || name_ === '-')
                return utils_1.serr(`module definition with empty name`);
            const erased = name_[0] === '-';
            const name = erased ? name_.slice(1) : name_;
            const fst = 2;
            const sym = c[fst];
            if (sym.tag !== 'Name')
                return utils_1.serr(`module def: after name should be : or =`);
            if (sym.name === '=') {
                const val = exprs(c.slice(fst + 1), '(');
                entries.push({ private: private_, erased, name, type: null, val });
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
                const type = exprs(tyts, '(');
                const val = exprs(c.slice(j + 1), '(');
                entries.push({ private: private_, erased, name, type, val });
                continue;
            }
            else
                return utils_1.serr(`def: : or = expected but got ${sym.name}`);
        }
        return surface_1.Module(entries);
    }
    if (isName(ts[0], 'let')) {
        const x = ts[1];
        let name = 'ERROR';
        if (x.tag === 'Name') {
            name = x.name;
        }
        else if (x.tag === 'List' && x.bracket === '{') {
            const a = x.list;
            if (a.length !== 1)
                return utils_1.serr(`invalid name for let`);
            const h = a[0];
            if (h.tag !== 'Name')
                return utils_1.serr(`invalid name for let`);
            name = h.name;
        }
        else
            return utils_1.serr(`invalid name for let`);
        let ty = null;
        let j = 2;
        if (isName(ts[j], ':')) {
            const tyts = [];
            j++;
            for (; j < ts.length; j++) {
                const v = ts[j];
                if (v.tag === 'Name' && v.name === '=')
                    break;
                else
                    tyts.push(v);
            }
            ty = exprs(tyts, '(');
        }
        if (!isName(ts[j], '='))
            return utils_1.serr(`no = after name in let`);
        const vals = [];
        let found = false;
        let i = j + 1;
        for (; i < ts.length; i++) {
            const c = ts[i];
            if (c.tag === 'Name' && c.name === ';') {
                found = true;
                break;
            }
            vals.push(c);
        }
        if (!found)
            return utils_1.serr(`no ; after let`);
        if (vals.length === 0)
            return utils_1.serr(`empty val in let`);
        const val = exprs(vals, '(');
        const body = exprs(ts.slice(i + 1), '(');
        const erased = name[0] === '-';
        const name2 = name[0] === '-' ? name.slice(1) : name;
        if (ty)
            return surface_1.Let(erased, name2, ty, val, body);
        return surface_1.Let(erased, name2, null, val, body);
    }
    const i = ts.findIndex(x => isName(x, ':'));
    if (i >= 0) {
        const a = ts.slice(0, i);
        const b = ts.slice(i + 1);
        return surface_1.Let(false, 'x', exprs(b, '('), exprs(a, '('), surface_1.Var('x'));
    }
    if (isName(ts[0], 'data')) {
        if (ts.length < 2)
            return utils_1.serr(`invalid data, no index`);
        const [index, b] = expr(ts[1]);
        if (b)
            return utils_1.serr(`invalid data, index cannot be implicit`);
        const cs = ts.slice(2).map(x => {
            const [e, b] = expr(x);
            if (b)
                return utils_1.serr(`invalid data, constructor cannot be implicit`);
            return e;
        });
        return surface_1.DataDef(index, cs);
    }
    if (isName(ts[0], 'tcon')) {
        if (ts.length < 2)
            return utils_1.serr(`invalid tcon, no data`);
        const [data, b] = expr(ts[1]);
        if (b)
            return utils_1.serr(`invalid tcon, data cannot be implicit`);
        const as = ts.slice(2).map(x => {
            const [e, b] = expr(x);
            if (b)
                return utils_1.serr(`invalid tcon, argument cannot be implicit`);
            return e;
        });
        return surface_1.TCon(data, as);
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
            return utils_1.serr(`. not found after \\ or there was no whitespace after .`);
        const body = exprs(ts.slice(i + 1), '(');
        return args.reduceRight((x, [name, impl, ty]) => surface_1.Abs(impl ? core_1.ImplUnif : core_1.Expl, name[0] === '-', name[0] === '-' ? name.slice(1) : name, ty, x), body);
    }
    if (ts[0].tag === 'Name' && ts[0].name[0] === '.') {
        const x = ts[0].name.slice(1);
        if (ts.length < 2)
            return utils_1.serr(`something went wrong when parsing .${x}`);
        if (ts.length === 2) {
            const [term, tb] = expr(ts[1]);
            if (tb)
                return utils_1.serr(`something went wrong when parsing .${x}`);
            return parseProj(term, x);
        }
        const indPart = ts.slice(0, 2);
        const rest = ts.slice(2);
        return exprs([TList(indPart, '(')].concat(rest), '(');
    }
    const j = ts.findIndex(x => isName(x, '->'));
    if (j >= 0) {
        const s = splitTokens(ts, x => isName(x, '->'));
        if (s.length < 2)
            return utils_1.serr(`parsing failed with ->`);
        const args = s.slice(0, -1)
            .map(p => p.length === 1 ? piParams(p[0]) : [['_', false, exprs(p, '(')]])
            .reduce((x, y) => x.concat(y), []);
        const body = exprs(s[s.length - 1], '(');
        return args.reduceRight((x, [name, impl, ty]) => surface_1.Pi(impl ? core_1.ImplUnif : core_1.Expl, name[0] === '-', name[0] === '-' ? name.slice(1) : name, ty, x), body);
    }
    const jp = ts.findIndex(x => isName(x, ','));
    if (jp >= 0) {
        const s = splitTokens(ts, x => isName(x, ','));
        if (s.length < 2)
            return utils_1.serr(`parsing failed with ,`);
        const args = s.map(x => {
            if (x.length === 1) {
                const h = x[0];
                if (h.tag === 'List' && h.bracket === '{')
                    return expr(h);
            }
            return [exprs(x, '('), false];
        });
        if (args.length === 0)
            return utils_1.serr(`empty pair`);
        if (args.length === 1)
            return utils_1.serr(`singleton pair`);
        const last1 = args[args.length - 1];
        const last2 = args[args.length - 2];
        const lastitem = surface_1.Pair(last2[0], last1[0]);
        return args.slice(0, -2).reduceRight((x, [y, _p]) => surface_1.Pair(y, x), lastitem);
    }
    const js = ts.findIndex(x => isName(x, '**'));
    if (js >= 0) {
        const s = splitTokens(ts, x => isName(x, '**'));
        if (s.length < 2)
            return utils_1.serr(`parsing failed with **`);
        const args = s.slice(0, -1)
            .map(p => p.length === 1 ? piParams(p[0]) : [['_', false, exprs(p, '(')]])
            .reduce((x, y) => x.concat(y), []);
        const rest = s[s.length - 1];
        let body;
        if (rest.length === 1) {
            const h = rest[0];
            if (h.tag === 'List' && h.bracket === '{')
                body = expr(h);
            else
                body = [exprs(s[s.length - 1], '('), false];
        }
        else
            body = [exprs(s[s.length - 1], '('), false];
        const last = args[args.length - 1];
        const lasterased = last[0][0] === '-';
        const lastname = last[0][0] === '-' ? last[0].slice(1) : last[0];
        const lastitem = surface_1.Sigma(lasterased, lastname, last[2], body[0]);
        return args.slice(0, -1).reduceRight((x, [name, _impl, ty]) => {
            const erased = name[0] === '-';
            const name2 = name[0] === '-' ? name.slice(1) : name;
            return surface_1.Sigma(erased, name2, ty, x);
        }, lastitem);
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
        return utils_1.serr(`empty application`);
    if (all[0] && all[0][1])
        return utils_1.serr(`in application function cannot be between {}`);
    return all.slice(1).reduce((x, [y, impl]) => surface_1.App(x, impl ? core_1.ImplUnif : core_1.Expl, y), all[0][0]);
};
const parse = (s) => {
    const ts = tokenize(s);
    const ex = exprs(ts, '(');
    return ex;
};
exports.parse = parse;
const addDef = (m, x, d) => { m[x][1].push(d); };
const parseDef = async (c, file, fileorder, filemap) => {
    if (!filemap[file])
        filemap[file] = [[], []];
    if (c.length === 0)
        return;
    if (c[0].tag === 'Name' && c[0].name === 'import') {
        if (config_1.config.useBase)
            return;
        const files = c.slice(1).map(t => {
            if (t.tag !== 'Name' && t.tag !== 'Num' && t.tag !== 'Str')
                return utils_1.serr(`trying to import a non-path`);
            const name = t.tag === 'Name' ? t.name : t.tag === 'Num' ? t.num : t.str;
            filemap[file][0].push(name);
            if (fileorder.includes(name)) {
                config_1.log(() => `skipping import ${name}`);
                return null;
            }
            fileorder.push(name);
            return name;
        }).filter(x => x);
        if (files.length === 0)
            return;
        config_1.log(() => `import all ${files.join(' ')}`);
        await Promise.all(files.map(async (f) => {
            config_1.log(() => `import ${f}`);
            const m = await utils_1.loadFile(f);
            await parseDefsR(m, f, fileorder, filemap);
            config_1.log(() => `parsed ${f}`);
        }));
        config_1.log(() => `imported ${files.join(' ')}`);
        return;
    }
    else if (c[0].tag === 'Name' && c[0].name === 'def') {
        const x = c[1];
        let impl = false;
        let name = '';
        if (x.tag === 'Name') {
            name = x.name;
        }
        else if (x.tag === 'List' && x.bracket === '{') {
            const a = x.list;
            if (a.length !== 1)
                return utils_1.serr(`invalid name for def`);
            const h = a[0];
            if (h.tag !== 'Name')
                return utils_1.serr(`invalid name for def`);
            name = h.name;
            impl = true;
        }
        else
            return utils_1.serr(`invalid name for def`);
        try {
            if (impl)
                return utils_1.serr(`definition cannot be implicit`);
            if (name) {
                const fst = 2;
                const sym = c[fst];
                if (sym.tag !== 'Name')
                    return utils_1.serr(`def: after name should be : or =`);
                if (sym.name === '=') {
                    const erased = name[0] === '-';
                    const name2 = erased ? name.slice(1) : name;
                    return addDef(filemap, file, surface_1.DDef(erased, name2, exprs(c.slice(fst + 1), '(')));
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
                    const erased = name[0] === '-';
                    const name2 = erased ? name.slice(1) : name;
                    return addDef(filemap, file, surface_1.DDef(erased, name2, surface_1.Let(false, name, ety, body, surface_1.Var(name))));
                }
                else
                    return utils_1.serr(`def: : or = expected but got ${sym.name}`);
            }
            else
                return utils_1.serr(`def should start with a name`);
        }
        catch (err) {
            if (!(err instanceof SyntaxError))
                throw err;
            return utils_1.serr(`syntax error in def ${name}: ${err}`);
        }
    }
    else if (c[0].tag === 'Name' && ['execute', '-execute', 'typecheck', '-typecheck'].includes(c[0].name)) {
        const command = c[0].name;
        const rest = c.slice(1);
        const term = exprs(rest, '(');
        return addDef(filemap, file, surface_1.DExecute(term, command[0] === '-', command.endsWith('typecheck')));
    }
    else
        return utils_1.serr(`def should start with ${defCommands.join(' or ')}`);
};
exports.parseDef = parseDef;
const defCommands = ['def', 'import', 'execute', 'typecheck', '-execute', '-typecheck'];
const parseDefsR = async (s, file, fileorder, filemap) => {
    config_1.log(() => `parseDefsR ${file}`);
    const ts = tokenize(s);
    if (ts.length === 0)
        return;
    if (ts[0].tag !== 'Name' || !defCommands.includes(ts[0].name))
        return utils_1.serr(`def should start with ${defCommands.map(x => `"${x}"`).join(' or ')}`);
    const spl = splitTokens(ts, t => t.tag === 'Name' && defCommands.includes(t.name), true);
    await Promise.all(spl.map(s => exports.parseDef(s, file, fileorder, filemap)));
};
const parseDefs = async (s, file = '_TOPLEVEL_', fileorder = [file], filemap = { [file]: [[], []] }) => {
    await parseDefsR(s, file, fileorder, filemap);
    config_1.log(() => fileorder.join(' '));
    config_1.log(() => Object.keys(filemap).map(f => `${f} <- ${filemap[f][0].join(' ')}`).join('\n'));
    const all = fileorder.slice();
    const curfiles = [];
    const defs = [];
    while (all.length > 0) {
        const i = all.findIndex(f => filemap[f][0].every(y => curfiles.includes(y)));
        if (i === -1)
            return utils_1.serr(`could not find import order: ${curfiles.join(' ')}`);
        const f = all[i];
        config_1.log(() => `order import ${f}`);
        all.splice(i, 1);
        curfiles.push(f);
        filemap[f][1].forEach(d => defs.push(d));
    }
    return defs;
};
exports.parseDefs = parseDefs;

},{"./config":2,"./core":5,"./surface":16,"./utils/utils":21}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.primType = void 0;
const utils_1 = require("./utils/utils");
const values_1 = require("./values");
const primTypes = {
    'Type': () => values_1.VType,
    'Data': () => values_1.VType,
    'B': () => values_1.VType,
    '0': () => values_1.VB,
    '1': () => values_1.VB,
    // (-P : %B -> *) -> P %0 -> P %1 -> (b : %B) -> P b
    'elimB': () => values_1.VPiEE('P', values_1.VPiE('_', values_1.VB, _ => values_1.VType), P => values_1.VPiE('_', values_1.vappE(P, values_1.V0), _ => values_1.VPiE('_', values_1.vappE(P, values_1.V1), _ => values_1.VPiE('b', values_1.VB, b => values_1.vappE(P, b))))),
    // (A : *) -> (B : *) -> A -> B -> *
    'HEq': () => values_1.VPiE('A', values_1.VType, A => values_1.VPiE('B', values_1.VType, B => values_1.VPiE('_', A, _ => values_1.VPiE('_', B, _ => values_1.VType)))),
    // (-A : *) -> (-a : A) -> HEq A A a a
    'ReflHEq': () => values_1.VPiEE('A', values_1.VType, A => values_1.VPiEE('a', A, a => values_1.vheq(A, A, a, a))),
    // (-A : *) -> (-a : A) -> (-P : (b : A) -> HEq A A a b -> *) -> P a (ReflHEq A a) -> (-b : A) -> (-p : HEq A A a b) -> P b p
    'elimHEq': () => values_1.VPiEE('A', values_1.VType, A => values_1.VPiEE('a', A, a => values_1.VPiEE('P', values_1.VPiE('b', A, b => values_1.VPiE('_', values_1.vheq(A, A, a, b), _ => values_1.VType)), P => values_1.VPiE('_', values_1.vappE(values_1.vappE(P, a), values_1.vreflheq(A, a)), _ => values_1.VPiEE('b', A, b => values_1.VPiEE('p', values_1.vheq(A, A, a, b), p => values_1.vappE(values_1.vappE(P, b), p))))))),
    'IDesc': () => values_1.VPiE('_', values_1.VType, _ => values_1.VType),
    'IEnd': () => values_1.VPiEE('I', values_1.VType, I => values_1.VPiEE('_', I, _ => values_1.videsc(I))),
    'IArg': () => values_1.VPiEE('I', values_1.VType, I => values_1.VPiEE('A', values_1.VType, A => values_1.VPiE('_', values_1.VPiE('_', A, _ => values_1.videsc(I)), _ => values_1.videsc(I)))),
    'IArgE': () => values_1.VPiEE('I', values_1.VType, I => values_1.VPiEE('A', values_1.VType, A => values_1.VPiE('_', values_1.VPiEE('a', A, _ => values_1.videsc(I)), _ => values_1.videsc(I)))),
    'IFArg': () => values_1.VPiEE('I', values_1.VType, I => values_1.VPiEE('_', values_1.VType, _ => values_1.VPiE('_', values_1.videsc(I), _ => values_1.videsc(I)))),
    'IRec': () => values_1.VPiEE('I', values_1.VType, I => values_1.VPiEE('_', I, _ => values_1.VPiE('_', values_1.videsc(I), _ => values_1.videsc(I)))),
    'IHRec': () => values_1.VPiEE('I', values_1.VType, I => values_1.VPiEE('A', values_1.VType, A => values_1.VPiEE('_', values_1.VPiE('_', A, _ => I), _ => values_1.VPiE('_', values_1.videsc(I), _ => values_1.videsc(I))))),
    /*
      (-I : *)
      -> (-P : IDesc I -> *)
      -> ((-i : I) -> P (IEnd i))
      -> ((-A : *) -> (f : A -> IDesc I) -> ((a : A) -> P (f a)) -> P (IArg A f))
      -> ((-A : *) -> (f : (-a : A) -> IDesc I) -> ((-a : A) -> P (f a)) -> P (IArgE A f))
      -> ((-A : *) -> (d : IDesc I) -> P d -> P (IFOArg A d))
      -> ((-i : I) -> (d : IDesc I) -> P d -> P (IRec i d))
      -> ((-A : *) -> (-f : A -> I) -> (d : IDesc I) -> P d -> P (IHRec A f d))
      -> (d : IDesc I)
      -> P d
    */
    'elimIDesc': () => values_1.VPiEE('I', values_1.VType, I => values_1.VPiEE('P', values_1.VPiE('_', values_1.videsc(I), _ => values_1.VType), P => values_1.VPiE('_', values_1.VPiEE('i', I, i => values_1.vappE(P, values_1.vappE(values_1.VIEnd, i))), _ => values_1.VPiE('_', values_1.VPiEE('A', values_1.VType, A => values_1.VPiE('f', values_1.VPiE('_', A, _ => values_1.videsc(I)), f => values_1.VPiE('_', values_1.VPiE('a', A, a => values_1.vappE(P, values_1.vappE(f, a))), _ => values_1.vappE(P, values_1.vappEs([values_1.VIArg, A, f]))))), _ => values_1.VPiE('_', values_1.VPiEE('A', values_1.VType, A => values_1.VPiE('f', values_1.VPiEE('a', A, _ => values_1.videsc(I)), f => values_1.VPiE('_', values_1.VPiEE('a', A, a => values_1.vappE(P, values_1.vappE(f, a))), _ => values_1.vappE(P, values_1.vappEs([values_1.VIArgE, A, f]))))), _ => values_1.VPiE('_', values_1.VPiEE('A', values_1.VType, A => values_1.VPiE('d', values_1.videsc(I), d => values_1.VPiE('_', values_1.vappE(P, d), _ => values_1.vappE(P, values_1.vappEs([values_1.VIFArg, A, d]))))), _ => values_1.VPiE('_', values_1.VPiEE('i', I, i => values_1.VPiE('d', values_1.videsc(I), d => values_1.VPiE('_', values_1.vappE(P, d), _ => values_1.vappE(P, values_1.vappEs([values_1.VIRec, i, d]))))), _ => values_1.VPiE('_', values_1.VPiEE('A', values_1.VType, A => values_1.VPiEE('f', values_1.VPiE('_', A, _ => I), f => values_1.VPiE('d', values_1.videsc(I), d => values_1.VPiE('_', values_1.vappE(P, d), _ => values_1.vappE(P, values_1.vappEs([values_1.VIHRec, A, f, d])))))), _ => values_1.VPiE('d', values_1.videsc(I), d => values_1.vappE(P, d)))))))))),
    // (I : *) -> IDesc I -> (I -> *) -> I -> *
    'InterpI': () => values_1.VPiE('I', values_1.VType, I => values_1.VPiE('_', values_1.videsc(I), _ => values_1.VPiE('_', values_1.VPiE('_', I, _ => values_1.VType), _ => values_1.VPiE('_', I, _ => values_1.VType)))),
    // (I : *) -> (d : IDesc I) -> (X : I -> *) -> (P : (i : I) -> X i -> *) -> (i : I) -> (xs : InterpI I d X i) -> *
    'AllI': () => values_1.VPiE('I', values_1.VType, I => values_1.VPiE('d', values_1.videsc(I), d => values_1.VPiE('X', values_1.VPiE('_', I, _ => values_1.VType), X => values_1.VPiE('_', values_1.VPiE('i', I, i => values_1.VPiE('_', values_1.vappE(X, i), _ => values_1.VType)), _ => values_1.VPiE('i', I, i => values_1.VPiE('_', values_1.vInterpI(I, d, X, i), _ => values_1.VType)))))),
    // (-I : *) -> (d : IDesc I) -> (-X : I -> *) -> (-P : (i : I) -> X i -> *) -> ((-i : I) -> (x : X i) -> P i x) -> (-i : I) -> (xs : InterpI I d X i) -> All I d X P i xs
    'allI': () => values_1.VPiEE('I', values_1.VType, I => values_1.VPiE('d', values_1.videsc(I), d => values_1.VPiEE('X', values_1.VPiE('_', I, _ => values_1.VType), X => values_1.VPiEE('P', values_1.VPiE('i', I, i => values_1.VPiE('_', values_1.vappE(X, i), _ => values_1.VType)), P => values_1.VPiE('_', values_1.VPiEE('i', I, i => values_1.VPiE('x', values_1.vappE(X, i), x => values_1.vappEs([P, i, x]))), _ => values_1.VPiEE('i', I, i => values_1.VPiE('xs', values_1.vInterpI(I, d, X, i), xs => values_1.vAllI(I, d, X, P, i, xs)))))))),
    // (I : *) -> IDesc I -> I -> *
    'IData': () => values_1.VPiE('I', values_1.VType, I => values_1.VPiE('_', values_1.videsc(I), _ => values_1.VPiE('_', I, _ => values_1.VType))),
    // (-I : *) -> (-d : IDesc I) -> (-i : I) -> InterpI I d (IData I d) i -> IData I d i
    'ICon': () => values_1.VPiEE('I', values_1.VType, I => values_1.VPiEE('d', values_1.videsc(I), d => values_1.VPiEE('i', I, i => values_1.VPiE('_', values_1.vInterpI(I, d, values_1.vappEs([values_1.VIData, I, d]), i), _ => values_1.vidata(I, d, i))))),
    /*
      (-I : *)
      -> (d : IDesc I)
      -> (-P : (i : I) -> IData I d i -> *)
      -> (
        (-i : I)
        -> (y : InterpI I d (IData I d) i)
        -> AllI I d (IData I d) P i y
        -> P i (ICon I d i y)
      )
      -> (-i : I)
      -> (x : IData I d i)
      -> P i x
    */
    'indI': () => values_1.VPiEE('I', values_1.VType, I => values_1.VPiE('d', values_1.videsc(I), d => values_1.VPiEE('P', values_1.VPiE('i', I, i => values_1.VPiE('_', values_1.vidata(I, d, i), _ => values_1.VType)), P => values_1.VPiE('_', values_1.VPiEE('i', I, i => values_1.VPiE('y', values_1.vInterpI(I, d, values_1.vappEs([values_1.VIData, I, d]), i), y => values_1.VPiE('_', values_1.vAllI(I, d, values_1.vappEs([values_1.VIData, I, d]), P, i, y), _ => values_1.vappEs([P, i, values_1.vicon(I, d, i, y)])))), _ => values_1.VPiEE('i', I, i => values_1.VPiE('x', values_1.vidata(I, d, i), x => values_1.vappEs([P, i, x]))))))),
};
const primType = (name) => {
    const v = primTypes[name];
    if (!v)
        return utils_1.impossible(`primType: ${name}`);
    return v();
};
exports.primType = primType;

},{"./utils/utils":21,"./values":22}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runREPL = exports.initREPL = void 0;
const config_1 = require("./config");
const elaboration_1 = require("./elaboration");
const parser_1 = require("./parser");
const surface_1 = require("./surface");
const C = require("./core");
const E = require("./erased");
const EV = require("./erasedvalues");
const typecheck_1 = require("./typecheck");
const values_1 = require("./values");
const globals_1 = require("./globals");
const list_1 = require("./utils/list");
const utils_1 = require("./utils/utils");
const serialization_1 = require("./serialization");
const help = `
COMMANDS
[:help or :h] this help message
[:debug or :d] toggle debug log messages
[:defs] show all defs
[:del name] delete a name
[:gtype name] view the type of a name
[:gtyno name] view the fully normalized type of a name
[:gelab name] view the elaborated term of a name
[:gterm name] view the term of a name
[:gnorm name] view the fully normalized term of a name
[:geras name] view the fully erased term of a name
[:gnera name] view the fully normalized erased term of a name
[:view files] view a file
[:def definitions] define names
[:import files] import a file
[:addunfold x y z] always unfold globals
[:postponeInvalidSolution] postpone more invalid meta solutions
[:useBase] use the base library
[:writeToBase] write definitions to base
[:showStackTrace] show stack trace of error
`.trim();
let showStackTrace = false;
const initREPL = () => {
    config_1.config.unfold.push('typeof');
    showStackTrace = false;
};
exports.initREPL = initREPL;
const runREPL = (s_, cb) => {
    try {
        const s = s_.trim();
        if (s === ':help' || s === ':h')
            return cb(help);
        if (s === ':d' || s === ':debug') {
            const d = !config_1.config.debug;
            config_1.setConfig({ debug: d });
            return cb(`debug: ${d}`);
        }
        if (s.startsWith(':addunfold')) {
            const xs = s.slice(10).trim().split(/\s+/g);
            const u = config_1.config.unfold;
            xs.forEach(x => u.push(x));
            return cb(`unfold: ${u.join(' ')}`);
        }
        if (s === ':postponeInvalidSolution') {
            const d = !config_1.config.postponeInvalidSolution;
            config_1.setConfig({ postponeInvalidSolution: d });
            return cb(`postponeInvalidSolution: ${d}`);
        }
        if (s === ':showStackTrace') {
            showStackTrace = !showStackTrace;
            return cb(`showStackTrace: ${showStackTrace}`);
        }
        if (s === ':useBase') {
            const d = !config_1.config.useBase;
            config_1.setConfig({ useBase: d });
            return cb(`useBase: ${d}`);
        }
        if (s === ':writeToBase') {
            const d = !config_1.config.writeToBase;
            config_1.setConfig({ writeToBase: d });
            return cb(`writeToBase: ${d}`);
        }
        if (s === ':defs') {
            const gs = globals_1.getGlobals();
            const r = [];
            for (const [k, e] of gs)
                r.push(`def ${k} : ${surface_1.showVal(e.type)} = ${surface_1.showCore(e.term)}`);
            return cb(r.length === 0 ? 'no definitions' : r.join('\n'));
        }
        if (s.startsWith(':del')) {
            const names = s.slice(4).trim().split(/\s+/g);
            names.forEach(x => globals_1.deleteGlobal(x));
            return cb(`deleted ${names.join(' ')}`);
        }
        if ([':def', ':import', ':execute', ':typecheck', ':-execute', '-typecheck'].some(x => s.startsWith(x))) {
            const rest = s.slice(1);
            parser_1.parseDefs(rest).then(ds => {
                const xs = elaboration_1.elaborateDefs(ds, true);
                return cb(xs.length === 0 ? `done` : `done, defined ${xs.join(' ')}`);
            }).catch(err => cb('' + err, true));
            return;
        }
        if (s.startsWith(':view')) {
            const files = s.slice(5).trim().split(/\s+/g);
            Promise.all(files.map(utils_1.loadFile)).then(ds => {
                return cb(ds.join('\n\n'));
            }).catch(err => cb('' + err, true));
            return;
        }
        if (s.startsWith(':gtype')) {
            const name = s.slice(6).trim();
            const res = globals_1.getGlobal(name);
            if (!res)
                return cb(`undefined global: ${name}`, true);
            return cb(surface_1.showVal(res.type));
        }
        if (s.startsWith(':gtyno')) {
            const name = s.slice(6).trim();
            const res = globals_1.getGlobal(name);
            if (!res)
                return cb(`undefined global: ${name}`, true);
            return cb(surface_1.showVal(res.type, 0, list_1.Nil, true));
        }
        if (s.startsWith(':gelab')) {
            const name = s.slice(6).trim();
            const res = globals_1.getGlobal(name);
            if (!res)
                return cb(`undefined global: ${name}`, true);
            return cb(surface_1.showCore(res.term));
        }
        if (s.startsWith(':gterm')) {
            const name = s.slice(6).trim();
            const res = globals_1.getGlobal(name);
            if (!res)
                return cb(`undefined global: ${name}`, true);
            return cb(surface_1.showVal(res.val));
        }
        if (s.startsWith(':gnorm')) {
            const name = s.slice(6).trim();
            const res = globals_1.getGlobal(name);
            if (!res)
                return cb(`undefined global: ${name}`, true);
            return cb(surface_1.showVal(res.val, 0, list_1.Nil, true));
        }
        if (s.startsWith(':geras')) {
            const name = s.slice(6).trim();
            const res = globals_1.getGlobal(name);
            if (!res)
                return cb(`undefined global: ${name}`, true);
            return cb(E.show(res.termerased));
        }
        if (s.startsWith(':gnera')) {
            const name = s.slice(6).trim();
            const res = globals_1.getGlobal(name);
            if (!res)
                return cb(`undefined global: ${name}`, true);
            return cb(E.show(EV.quote(res.valerased, 0, true)));
        }
        const term = parser_1.parse(s);
        config_1.log(() => surface_1.show(term));
        config_1.log(() => 'ELABORATE');
        const [eterm, etype] = elaboration_1.elaborate(term);
        config_1.log(() => C.show(eterm));
        config_1.log(() => surface_1.showCore(eterm));
        config_1.log(() => C.show(etype));
        config_1.log(() => surface_1.showCore(etype));
        const [ser, ns] = serialization_1.serializeCore(eterm);
        config_1.log(() => `serialized: ${ser}`);
        config_1.log(() => `names: ${JSON.stringify(ns)}`);
        const unfolded = values_1.normalize(eterm, false);
        config_1.log(() => surface_1.showCore(unfolded));
        config_1.log(() => 'TYPECHECK');
        const [ttype, er] = typecheck_1.typecheck(eterm);
        config_1.log(() => C.show(ttype));
        config_1.log(() => surface_1.showCore(ttype));
        config_1.log(() => E.show(er));
        return cb(`term: ${surface_1.show(term)}\ntype: ${surface_1.showCore(etype)}\netrm: ${surface_1.showCore(eterm)}\netru: ${surface_1.showCore(unfolded)}\neras: ${E.show(er)}\nnera: ${E.show(EV.normalize(er, true))}`);
    }
    catch (err) {
        if (showStackTrace)
            console.error(err);
        return cb(`${err}`, true);
    }
};
exports.runREPL = runREPL;

},{"./config":2,"./core":5,"./elaboration":6,"./erased":7,"./erasedvalues":9,"./globals":10,"./parser":12,"./serialization":15,"./surface":16,"./typecheck":17,"./utils/list":20,"./utils/utils":21,"./values":22}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deserializeCore = exports.serializeCore = exports.toCore = exports.fromCore = exports.Sigma = exports.Pi = exports.Let = exports.Proj = exports.Pair = exports.Abs = exports.App = exports.Global = exports.Prim = exports.Var = void 0;
const C = require("./core");
const utils_1 = require("./utils/utils");
const Var = (index) => ({ tag: 'Var', index });
exports.Var = Var;
const Prim = (name) => ({ tag: 'Prim', name });
exports.Prim = Prim;
const Global = (name) => ({ tag: 'Global', name });
exports.Global = Global;
const App = (left, mode, right) => ({ tag: 'App', left, mode, right });
exports.App = App;
const Abs = (mode, erased, type, body) => ({ tag: 'Abs', erased, mode, type, body });
exports.Abs = Abs;
const Pair = (fst, snd, type) => ({ tag: 'Pair', fst, snd, type });
exports.Pair = Pair;
const Proj = (proj, term) => ({ tag: 'Proj', proj, term });
exports.Proj = Proj;
const Let = (erased, type, val, body) => ({ tag: 'Let', erased, type, val, body });
exports.Let = Let;
const Pi = (mode, erased, type, body) => ({ tag: 'Pi', mode, erased, type, body });
exports.Pi = Pi;
const Sigma = (erased, type, body) => ({ tag: 'Sigma', erased, type, body });
exports.Sigma = Sigma;
const fromCoreR = (t, ns) => {
    if (t.tag === 'Var')
        return exports.Var(t.index);
    if (t.tag === 'Prim')
        return exports.Prim(t.name);
    if (t.tag === 'Global')
        return exports.Global(t.name);
    if (t.tag === 'App')
        return exports.App(fromCoreR(t.left, ns), t.mode, fromCoreR(t.right, ns));
    if (t.tag === 'Proj')
        return exports.Proj(t.proj, fromCoreR(t.term, ns));
    if (t.tag === 'Pair')
        return exports.Pair(fromCoreR(t.fst, ns), fromCoreR(t.snd, ns), fromCoreR(t.type, ns));
    if (t.tag === 'Pi') {
        ns.push(t.name);
        return exports.Pi(t.mode, t.erased, fromCoreR(t.type, ns), fromCoreR(t.body, ns));
    }
    if (t.tag === 'Abs') {
        ns.push(t.name);
        return exports.Abs(t.mode, t.erased, fromCoreR(t.type, ns), fromCoreR(t.body, ns));
    }
    if (t.tag === 'Sigma') {
        ns.push(t.name);
        return exports.Sigma(t.erased, fromCoreR(t.type, ns), fromCoreR(t.body, ns));
    }
    if (t.tag === 'Let') {
        ns.push(t.name);
        return exports.Let(t.erased, fromCoreR(t.type, ns), fromCoreR(t.val, ns), fromCoreR(t.body, ns));
    }
    return utils_1.impossible(`fromCore: ${t.tag}`);
};
const fromCore = (t) => {
    const ns = [];
    const tm = fromCoreR(t, ns);
    return [tm, ns];
};
exports.fromCore = fromCore;
const toCoreR = (t, ns) => {
    if (t.tag === 'Var')
        return C.Var(t.index);
    if (t.tag === 'Prim')
        return C.Prim(t.name);
    if (t.tag === 'Global')
        return C.Global(t.name);
    if (t.tag === 'Pair')
        return C.Pair(toCoreR(t.fst, ns), toCoreR(t.snd, ns), toCoreR(t.type, ns));
    if (t.tag === 'Proj')
        return C.Proj(t.proj, toCoreR(t.term, ns));
    if (t.tag === 'App')
        return C.App(toCoreR(t.left, ns), t.mode, toCoreR(t.right, ns));
    if (t.tag === 'Pi')
        return C.Pi(t.mode, t.erased, ns ? ns.pop() || 'x' : 'x', toCoreR(t.type, ns), toCoreR(t.body, ns));
    if (t.tag === 'Abs')
        return C.Abs(t.mode, t.erased, ns ? ns.pop() || 'x' : 'x', toCoreR(t.type, ns), toCoreR(t.body, ns));
    if (t.tag === 'Sigma')
        return C.Sigma(t.erased, ns ? ns.pop() || 'x' : 'x', toCoreR(t.type, ns), toCoreR(t.body, ns));
    if (t.tag === 'Let')
        return C.Let(t.erased, ns ? ns.pop() || 'x' : 'x', toCoreR(t.type, ns), toCoreR(t.val, ns), toCoreR(t.body, ns));
    return t;
};
const toCore = (t, ns = null) => {
    const core = toCoreR(t, ns ? ns.slice().reverse() : ns);
    return core;
};
exports.toCore = toCore;
const serializeCore = (t) => {
    const [tm, ns] = exports.fromCore(t);
    const str = JSON.stringify(tm);
    return [str, ns];
};
exports.serializeCore = serializeCore;
const deserializeCore = (s, ns = null) => {
    try {
        return exports.toCore(JSON.parse(s), ns);
    }
    catch (err) {
        return utils_1.impossible(`deserializeCore: ${err}`);
    }
};
exports.deserializeCore = deserializeCore;

},{"./core":5,"./utils/utils":21}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showDefs = exports.showDef = exports.DExecute = exports.DDef = exports.showValZ = exports.showCoreZ = exports.showVal = exports.showCore = exports.toSurface = exports.show = exports.flattenPair = exports.flattenSigma = exports.flattenPi = exports.flattenAbs = exports.flattenApp = exports.DataSort = exports.Type = exports.TCon = exports.DataDef = exports.Module = exports.Signature = exports.Hole = exports.Meta = exports.Sigma = exports.Pi = exports.Let = exports.Proj = exports.Pair = exports.Abs = exports.App = exports.Prim = exports.Var = exports.PCore = exports.PIndex = exports.PName = void 0;
const names_1 = require("./names");
const values_1 = require("./values");
const list_1 = require("./utils/list");
const utils_1 = require("./utils/utils");
const PName = (name) => ({ tag: 'PName', name });
exports.PName = PName;
const PIndex = (index) => ({ tag: 'PIndex', index });
exports.PIndex = PIndex;
const PCore = (proj) => ({ tag: 'PCore', proj });
exports.PCore = PCore;
const Var = (name) => ({ tag: 'Var', name });
exports.Var = Var;
const Prim = (name) => ({ tag: 'Prim', name });
exports.Prim = Prim;
const App = (left, mode, right) => ({ tag: 'App', left, mode, right });
exports.App = App;
const Abs = (mode, erased, name, type, body) => ({ tag: 'Abs', mode, erased, name, type, body });
exports.Abs = Abs;
const Pair = (fst, snd) => ({ tag: 'Pair', fst, snd });
exports.Pair = Pair;
const Proj = (proj, term) => ({ tag: 'Proj', proj, term });
exports.Proj = Proj;
const Let = (erased, name, type, val, body) => ({ tag: 'Let', erased, name, type, val, body });
exports.Let = Let;
const Pi = (mode, erased, name, type, body) => ({ tag: 'Pi', mode, erased, name, type, body });
exports.Pi = Pi;
const Sigma = (erased, name, type, body) => ({ tag: 'Sigma', erased, name, type, body });
exports.Sigma = Sigma;
const Meta = (index) => ({ tag: 'Meta', index });
exports.Meta = Meta;
const Hole = (name) => ({ tag: 'Hole', name });
exports.Hole = Hole;
const Signature = (defs) => ({ tag: 'Signature', defs });
exports.Signature = Signature;
const Module = (defs) => ({ tag: 'Module', defs });
exports.Module = Module;
const DataDef = (index, cons) => ({ tag: 'Data', index, cons });
exports.DataDef = DataDef;
const TCon = (data, args) => ({ tag: 'TCon', data, args });
exports.TCon = TCon;
exports.Type = exports.Prim('Type');
exports.DataSort = exports.Prim('Data');
const flattenApp = (t) => {
    const r = [];
    while (t.tag === 'App') {
        r.push([t.mode, t.right]);
        t = t.left;
    }
    return [t, r.reverse()];
};
exports.flattenApp = flattenApp;
const flattenAbs = (t) => {
    const r = [];
    while (t.tag === 'Abs') {
        r.push([t.name, t.mode, t.erased, t.type]);
        t = t.body;
    }
    return [r, t];
};
exports.flattenAbs = flattenAbs;
const flattenPi = (t) => {
    const r = [];
    while (t.tag === 'Pi') {
        r.push([t.name, t.mode, t.erased, t.type]);
        t = t.body;
    }
    return [r, t];
};
exports.flattenPi = flattenPi;
const flattenSigma = (t) => {
    const r = [];
    while (t.tag === 'Sigma') {
        r.push([t.name, t.erased, t.type]);
        t = t.body;
    }
    return [r, t];
};
exports.flattenSigma = flattenSigma;
const flattenPair = (t) => {
    const r = [];
    while (t.tag === 'Pair') {
        r.push(t.fst);
        t = t.snd;
    }
    r.push(t);
    return r;
};
exports.flattenPair = flattenPair;
const showP = (b, t) => b ? `(${exports.show(t)})` : exports.show(t);
const isSimple = (t) => t.tag === 'Var' || t.tag === 'Prim' || t.tag === 'Meta' || t.tag === 'Hole' || t.tag === 'Pair' || (t.tag === 'Proj' && isSimple(t.term));
const show = (t) => {
    if (t.tag === 'Var')
        return t.name;
    if (t.tag === 'Prim')
        return t.name === 'Type' ? '*' : `%${t.name}`;
    if (t.tag === 'Meta')
        return `?${t.index}`;
    if (t.tag === 'Hole')
        return `_${t.name || ''}`;
    if (t.tag === 'App') {
        const [f, as] = exports.flattenApp(t);
        return `${showP(!isSimple(f), f)} ${as.map(([m, t], i) => m.tag === 'ImplUnif' ? `{${exports.show(t)}}` : showP(!isSimple(t) && !(t.tag === 'Abs' && i >= as.length), t)).join(' ')}`;
    }
    if (t.tag === 'Abs') {
        const [as, b] = exports.flattenAbs(t);
        return `\\${as.map(([x, m, e, t]) => !t ?
            (m.tag === 'ImplUnif' ? `{${e ? '-' : ''}${x}}` : `${e ? '-' : ''}${x}`) :
            `${m.tag === 'ImplUnif' ? '{' : '('}${e ? '-' : ''}${x} : ${exports.show(t)}${m.tag === 'ImplUnif' ? '}' : ')'}`).join(' ')}. ${exports.show(b)}`;
    }
    if (t.tag === 'Pi') {
        const [as, b] = exports.flattenPi(t);
        return `${as.map(([x, m, e, t]) => x === '_' && !e ?
            (m.tag === 'ImplUnif' ? `{${exports.show(t)}}` : showP(!isSimple(t) && t.tag !== 'App', t)) :
            `${m.tag === 'ImplUnif' ? '{' : '('}${e ? '-' : ''}${x} : ${exports.show(t)}${m.tag === 'ImplUnif' ? '}' : ')'}`).join(' -> ')} -> ${exports.show(b)}`;
    }
    if (t.tag === 'Let')
        return `let ${t.erased ? '-' : ''}${t.name}${t.type ? ` : ${showP(t.type.tag === 'Let', t.type)}` : ''} = ${showP(t.val.tag === 'Let', t.val)}; ${exports.show(t.body)}`;
    if (t.tag === 'Sigma') {
        const [as, b] = exports.flattenSigma(t);
        return `${as.map(([x, e, t]) => !e && x === '_' ? showP(t.tag === 'Abs' || t.tag === 'Let' || t.tag === 'Pi' || t.tag === 'Sigma', t) : `(${e ? '-' : ''}${x} : ${showP(t.tag === 'Let', t)})`).join(' ** ')} ** ${showP(b.tag === 'Let', b)}`;
    }
    if (t.tag === 'Pair') {
        const ps = exports.flattenPair(t);
        return `(${ps.map(t => exports.show(t)).join(', ')})`;
    }
    if (t.tag === 'Proj') {
        const proj = t.proj.tag === 'PName' ? t.proj.name : t.proj.tag === 'PIndex' ? t.proj.index : t.proj.proj;
        if (isSimple(t.term))
            return `${exports.show(t.term)}.${proj}`;
        return `.${proj} ${showP(true, t.term)}`;
    }
    if (t.tag === 'Signature')
        return `signature { ${t.defs.map(({ erased, name, type }) => `def ${erased ? '_' : ''}${name}${type ? ` : ${exports.show(type)}` : ''}`).join(' ')} }`;
    if (t.tag === 'Module')
        return `module { ${t.defs.map(({ private: private_, erased, name, type, val }) => `${private_ ? 'private def' : 'def'} ${erased ? '-' : ''}${name}${type ? ` : ${exports.show(type)}` : ''} = ${exports.show(val)}`).join(' ')}${t.defs.length > 0 ? ' ' : ''}}`;
    if (t.tag === 'Data')
        return `data ${showP(!isSimple(t.index), t.index)}${t.cons.length > 0 ? ' ' : ''}${t.cons.map(x => showP(!isSimple(x), x)).join(' ')}`;
    if (t.tag === 'TCon')
        return `tcon ${showP(!isSimple(t.data), t.data)}${t.args.length > 0 ? ' ' : ''}${t.args.map(x => showP(!isSimple(x), x)).join(' ')}`;
    return t;
};
exports.show = show;
const toSurface = (t, ns = list_1.Nil) => {
    if (t.tag === 'Meta')
        return exports.Meta(t.index);
    if (t.tag === 'Var')
        return exports.Var(list_1.index(ns, t.index) || utils_1.impossible(`toSurface: index out of scope: ${t.index}`));
    if (t.tag === 'Global')
        return exports.Var(t.name);
    if (t.tag === 'Prim')
        return exports.Prim(t.name);
    if (t.tag === 'App')
        return exports.App(exports.toSurface(t.left, ns), t.mode, exports.toSurface(t.right, ns));
    if (t.tag === 'Pair')
        return exports.Pair(exports.toSurface(t.fst, ns), exports.toSurface(t.snd, ns));
    if (t.tag === 'Proj')
        return exports.Proj(exports.PCore(t.proj), exports.toSurface(t.term, ns));
    if (t.tag === 'Data')
        return exports.DataDef(exports.toSurface(t.index, ns), t.cons.map(x => exports.toSurface(x, ns)));
    if (t.tag === 'TCon')
        return exports.TCon(exports.toSurface(t.data, ns), t.args.map(x => exports.toSurface(x, ns)));
    if (t.tag === 'Abs') {
        const x = names_1.chooseName(t.name, ns);
        return exports.Abs(t.mode, t.erased, x, exports.toSurface(t.type, ns), exports.toSurface(t.body, list_1.Cons(x, ns)));
    }
    if (t.tag === 'Pi') {
        const x = names_1.chooseName(t.name, ns);
        return exports.Pi(t.mode, t.erased, x, exports.toSurface(t.type, ns), exports.toSurface(t.body, list_1.Cons(x, ns)));
    }
    if (t.tag === 'Sigma') {
        const x = names_1.chooseName(t.name, ns);
        return exports.Sigma(t.erased, x, exports.toSurface(t.type, ns), exports.toSurface(t.body, list_1.Cons(x, ns)));
    }
    if (t.tag === 'Let') {
        const x = names_1.chooseName(t.name, ns);
        return exports.Let(t.erased, x, exports.toSurface(t.type, ns), exports.toSurface(t.val, ns), exports.toSurface(t.body, list_1.Cons(x, ns)));
    }
    return t;
};
exports.toSurface = toSurface;
const showCore = (t, ns = list_1.Nil) => exports.show(exports.toSurface(t, ns));
exports.showCore = showCore;
const showVal = (v, k = 0, ns = list_1.Nil, full = false) => exports.show(exports.toSurface(values_1.quote(v, k, full), ns));
exports.showVal = showVal;
const showCoreZ = (t, vs = list_1.Nil, k = 0, ns = list_1.Nil) => exports.show(exports.toSurface(values_1.zonk(t, vs, k), ns));
exports.showCoreZ = showCoreZ;
const showValZ = (v, vs = list_1.Nil, k = 0, ns = list_1.Nil, full = false) => exports.show(exports.toSurface(values_1.zonk(values_1.quote(v, k, full), vs, k), ns));
exports.showValZ = showValZ;
const DDef = (erased, name, value) => ({ tag: 'DDef', erased, name, value });
exports.DDef = DDef;
const DExecute = (term, erased, typeOnly) => ({ tag: 'DExecute', term, erased, typeOnly });
exports.DExecute = DExecute;
const showDef = (d) => {
    if (d.tag === 'DDef')
        return `def ${d.erased ? '-' : ''}${d.name} = ${exports.show(d.value)}`;
    if (d.tag === 'DExecute')
        return `${d.erased ? '-' : ''}${d.typeOnly ? 'typecheck' : 'execute'} ${exports.show(d.term)}`;
    return d;
};
exports.showDef = showDef;
const showDefs = (ds) => ds.map(exports.showDef).join('\n');
exports.showDefs = showDefs;

},{"./names":11,"./utils/list":20,"./utils/utils":21,"./values":22}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typecheck = void 0;
const config_1 = require("./config");
const conversion_1 = require("./conversion");
const core_1 = require("./core");
const globals_1 = require("./globals");
const primitives_1 = require("./primitives");
const list_1 = require("./utils/list");
const utils_1 = require("./utils/utils");
const values_1 = require("./values");
const E = require("./erased");
const EV = require("./erasedvalues");
const erasedprimitives_1 = require("./erasedprimitives");
const context_1 = require("./context");
const S = require("./surface");
const base_1 = require("./base");
const V = require("./values");
const C = require("./core");
const Local = (index, ns, ts, vs, erased) => ({ index, ns, ts, vs, erased });
const localEmpty = Local(0, list_1.Nil, list_1.Nil, list_1.Nil, false);
const localExtend = (local, name, ty, erased, val = values_1.VVar(local.index)) => Local(local.index + 1, list_1.Cons(name, local.ns), list_1.Cons([ty, erased], local.ts), list_1.Cons(val, local.vs), local.erased);
const localErased = (local) => Local(local.index, local.ns, local.ts, local.vs, true);
const indexT = (ts, ix) => {
    let l = ts;
    let i = 0;
    let erased = 0;
    while (l.tag === 'Cons') {
        if (ix === 0)
            return [l.head, i, erased];
        if (l.head[1])
            erased++;
        i++;
        ix--;
        l = l.tail;
    }
    return null;
};
const showTerm = (local, tm) => S.showCore(tm, local.ns);
const showVal = (local, val) => S.showValZ(val, local.vs, local.index, local.ns);
const check = (local, tm, ty) => {
    config_1.log(() => `check ${showTerm(local, tm)} : ${showVal(local, ty)}`);
    const [ty2, er] = synth(local, tm);
    utils_1.tryT(() => conversion_1.conv(local.index, ty2, ty), e => utils_1.terr(`check failed (${showTerm(local, tm)}): ${showVal(local, ty2)} ~ ${showVal(local, ty)}: ${e}`));
    return er;
};
const synth = (local, tm) => {
    config_1.log(() => `synth ${showTerm(local, tm)}`);
    if (tm.tag === 'Prim')
        return [primitives_1.primType(tm.name), EV.quote(erasedprimitives_1.primErased(tm.name), 0, false)];
    if (tm.tag === 'Var') {
        const i = tm.index;
        const [entry, , erasedNo] = indexT(local.ts, i) || utils_1.terr(`undefined index ${tm.index}`);
        if (entry[1] && !local.erased)
            return utils_1.terr(`erased var used: ${showTerm(local, tm)}`);
        return [entry[0], E.Var(i - erasedNo)];
    }
    if (tm.tag === 'Global') {
        let ty;
        if (config_1.config.useBase) {
            const [, type] = base_1.getFromBase(tm.name, local.erased);
            ty = values_1.evaluate(type, list_1.Nil);
        }
        else {
            const entry = globals_1.getGlobal(tm.name);
            if (!entry)
                return utils_1.terr(`global ${tm.name} not found`);
            ty = entry.type;
        }
        return [ty, E.Global(tm.name)];
    }
    if (tm.tag === 'App') {
        const [ty, er] = synth(local, tm.left);
        const [ret, arg] = synthapp(local, ty, tm.mode, tm.right);
        return [ret, arg ? E.App(er, arg) : er];
    }
    if (tm.tag === 'Abs') {
        check(localErased(local), tm.type, values_1.VType);
        const ty = values_1.evaluate(tm.type, local.vs);
        const [rty, body] = synth(localExtend(local, tm.name, ty, tm.erased), tm.body);
        return [values_1.evaluate(core_1.Pi(tm.mode, tm.erased, tm.name, tm.type, values_1.quote(rty, local.index + 1)), local.vs), tm.erased ? body : E.Abs(body)];
    }
    if (tm.tag === 'Pair') {
        check(localErased(local), tm.type, values_1.VType);
        const ty = values_1.evaluate(tm.type, local.vs);
        const fty = values_1.force(ty);
        if (fty.tag !== 'VSigma')
            return utils_1.terr(`not a sigma type in pair: ${showTerm(local, tm)}`);
        const fst = check(fty.erased ? localErased(local) : local, tm.fst, fty.type);
        const snd = check(local, tm.snd, values_1.vinst(fty, values_1.evaluate(tm.fst, local.vs)));
        return [ty, fty.erased ? snd : E.Pair(fst, snd)];
    }
    if (tm.tag === 'Proj') {
        const [ty, er] = synth(local, tm.term);
        const fty = values_1.force(ty);
        if (fty.tag !== 'VSigma')
            return utils_1.terr(`not a sigma type in ${showTerm(local, tm)}: ${showVal(local, ty)}`);
        if (tm.proj === 'fst' && fty.erased && !local.erased)
            return utils_1.terr(`cannot project from erased sigma in non-erased context in ${showTerm(local, tm)}: ${showVal(local, ty)}`);
        return [tm.proj === 'fst' ? fty.type : values_1.vinst(fty, values_1.vproj('fst', values_1.evaluate(tm.term, local.vs))), fty.erased ? er : E.Proj(tm.proj, er)];
    }
    if (tm.tag === 'Pi') {
        check(localErased(local), tm.type, values_1.VType);
        const ty = values_1.evaluate(tm.type, local.vs);
        check(localErased(localExtend(local, tm.name, ty, tm.erased)), tm.body, values_1.VType);
        return [values_1.VType, E.termId];
    }
    if (tm.tag === 'Sigma') {
        check(localErased(local), tm.type, values_1.VType);
        const ty = values_1.evaluate(tm.type, local.vs);
        check(localErased(localExtend(local, tm.name, ty, tm.erased)), tm.body, values_1.VType);
        return [values_1.VType, E.termId];
    }
    if (tm.tag === 'Let') {
        check(localErased(local), tm.type, values_1.VType);
        const ty = values_1.evaluate(tm.type, local.vs);
        const valEr = check(tm.erased ? localErased(local) : local, tm.val, ty);
        const val = values_1.evaluate(tm.val, local.vs);
        const [ret, body] = synth(localExtend(local, tm.name, ty, tm.erased, val), tm.body);
        return [ret, tm.erased ? body : E.Let(valEr, body)];
    }
    if (tm.tag === 'Meta') {
        const m = context_1.getMeta(tm.index);
        return [m.type, E.termId]; // TODO
    }
    if (tm.tag === 'Data') {
        check(localErased(local), tm.index, V.VPi(C.Expl, false, 'R', values_1.VType, R => V.VPi(C.Expl, false, '_', V.VPi(C.Expl, false, 'T', values_1.VType, T => V.VPi(C.Expl, false, '_', V.VPi(C.Expl, false, '_', T, _ => R), _ => R)), _ => V.VPi(C.Expl, false, '_', R, _ => R)))); // (R : *) -> ((T : *) -> (T -> R) -> R) -> R -> R
        const vindex = values_1.evaluate(tm.index, local.vs);
        tm.cons.forEach(t => check(localErased(local), t, V.VPi(C.Expl, false, 'R', values_1.VType, R => V.VPi(C.Expl, false, '_', V.VPi(C.Expl, false, 'T', values_1.VType, T => V.VPi(C.Expl, false, '_', V.VPi(C.Expl, false, '_', T, _ => R), _ => R)), _ => V.VPi(C.Expl, false, '_', V.vappEs([vindex, values_1.VType, V.VAbsE('T', values_1.VType, T => V.VAbsE('K', V.VPiE('_', T, _ => values_1.VType), K => V.VPiE('x', T, x => V.vapp(K, C.Expl, x)))), V.VPi(C.Expl, false, '_', R, _ => R)]), _ => V.VPi(C.Expl, false, '_', V.vappEs([vindex, values_1.VType, V.VAbsE('T', values_1.VType, T => V.VAbsE('K', V.VPiE('_', T, _ => values_1.VType), K => V.VPiE('x', T, x => V.vapp(K, C.Expl, x)))), R]), _ => R)))))); // (R : *) -> ((T : *) -> (T -> R) -> R) -> (index * (\(T : *) (K : T -> *). (x : T) -> K x) (R -> R)) -> (index * (\T K. (x : T) -> K x) R) -> R
        return [V.VDataSort, E.termId];
    }
    if (tm.tag === 'TCon') {
        check(localErased(local), tm.data, V.VDataSort);
        const vdata = values_1.force(values_1.evaluate(tm.data, local.vs));
        if (vdata.tag !== 'VData')
            return utils_1.terr(`not a data in tcon: ${core_1.show(tm)}`);
        const ty = V.vappEs([vdata.index, values_1.VType, V.VAbsE('T', values_1.VType, T => V.VAbsE('K', V.VPiE('_', T, _ => values_1.VType), K => V.VPiE('x', T, x => V.vappE(K, x)))), values_1.VType]); // index * (\(T : *) (K : T -> *). (x : T) -> K x) *
        const [rty] = synthapps(local, ty, list_1.listFrom(tm.args.map(t => [C.Expl, t])));
        conversion_1.conv(local.index, rty, values_1.VType); // TODO: probably not necessary
        return [values_1.VType, E.termId];
    }
    return utils_1.terr(`synth failed: ${core_1.show(tm)}`);
};
const synthapp = (local, ty, mode, tm) => {
    config_1.log(() => `synthapp ${showVal(local, ty)} @${mode.tag === 'ImplUnif' ? 'impl' : ''} ${showTerm(local, tm)}`);
    const fty = values_1.force(ty);
    if (fty.tag === 'VPi' && fty.mode.tag === mode.tag) {
        const er = check(fty.erased ? localErased(local) : local, tm, fty.type);
        const v = values_1.evaluate(tm, local.vs);
        return [values_1.vinst(fty, v), fty.erased ? null : er];
    }
    return utils_1.terr(`not a correct pi type in synthapp: ${showVal(local, ty)} @${mode.tag === 'ImplUnif' ? 'impl' : ''} ${showTerm(local, tm)}`);
};
const synthapps = (local, ty, spine) => {
    config_1.log(() => `synthapps ${showVal(local, ty)} ${list_1.listToString(spine, ([m, t]) => `@${m.tag === 'ImplUnif' ? 'impl' : ''} ${core_1.show(t)}`)}`);
    if (spine.tag === 'Nil')
        return [ty, list_1.Nil];
    const [rty, etm] = synthapp(local, ty, spine.head[0], spine.head[1]);
    const [rty2, etms] = synthapps(local, rty, spine.tail);
    return [rty2, etm ? list_1.Cons(etm, etms) : etms];
};
const typecheck = (t, erased = false) => {
    const [ty, er] = synth(erased ? localErased(localEmpty) : localEmpty, t);
    return [values_1.quote(ty, 0), er];
};
exports.typecheck = typecheck;

},{"./base":1,"./config":2,"./context":3,"./conversion":4,"./core":5,"./erased":7,"./erasedprimitives":8,"./erasedvalues":9,"./globals":10,"./primitives":13,"./surface":16,"./utils/list":20,"./utils/utils":21,"./values":22}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unify = void 0;
const config_1 = require("./config");
const conversion_1 = require("./conversion");
const core_1 = require("./core");
const list_1 = require("./utils/list");
const utils_1 = require("./utils/utils");
const values_1 = require("./values");
const V = require("./values");
const context_1 = require("./context");
const lazy_1 = require("./utils/lazy");
const unifyElim = (k, a, b, x, y) => {
    if (a === b)
        return;
    if (a.tag === 'EApp' && b.tag === 'EApp' && a.mode.tag === b.mode.tag)
        return exports.unify(k, a.right, b.right);
    if (a.tag === 'EProj' && b.tag === 'EProj' && a.proj === b.proj)
        return;
    if (a.tag === 'EPrim' && b.tag === 'EPrim' && a.name === b.name && a.args.length === b.args.length) {
        for (let i = 0, l = a.args.length; i < l; i++)
            exports.unify(k, a.args[i], b.args[i]);
        return;
    }
    return utils_1.terr(`unify failed (${k}): ${values_1.showVal(x, k)} ~ ${values_1.showVal(y, k)}`);
};
const unify = (k, a_, b_) => {
    const a = values_1.force(a_, false);
    const b = values_1.force(b_, false);
    config_1.log(() => `unify(${k}): ${values_1.showVal(a, k)} ~ ${values_1.showVal(b, k)}`);
    if (a === b)
        return;
    if (a.tag === 'VPi' && b.tag === 'VPi' && a.mode.tag === b.mode.tag && a.erased === b.erased) {
        exports.unify(k, a.type, b.type);
        const v = values_1.VVar(k);
        return exports.unify(k + 1, values_1.vinst(a, v), values_1.vinst(b, v));
    }
    if (a.tag === 'VSigma' && b.tag === 'VSigma' && a.erased === b.erased) {
        exports.unify(k, a.type, b.type);
        const v = values_1.VVar(k);
        return exports.unify(k + 1, values_1.vinst(a, v), values_1.vinst(b, v));
    }
    if (a.tag === 'VAbs' && b.tag === 'VAbs' && a.mode.tag === b.mode.tag && a.erased === b.erased) {
        const v = values_1.VVar(k);
        return exports.unify(k + 1, values_1.vinst(a, v), values_1.vinst(b, v));
    }
    if (a.tag === 'VPair' && b.tag === 'VPair') {
        exports.unify(k, a.fst, b.fst);
        return exports.unify(k, a.snd, b.snd);
    }
    if (a.tag === 'VData' && b.tag === 'VData' && a.cons.length === b.cons.length) {
        exports.unify(k, a.index, b.index);
        for (let i = 0, l = a.cons.length; i < l; i++)
            exports.unify(k, a.cons[i], b.cons[i]);
        return;
    }
    if (a.tag === 'VTCon' && b.tag === 'VTCon' && a.args.length === b.args.length) {
        exports.unify(k, a.data, b.data);
        for (let i = 0, l = a.args.length; i < l; i++)
            exports.unify(k, a.args[i], b.args[i]);
        return;
    }
    if (a.tag === 'VAbs') {
        const v = values_1.VVar(k);
        return exports.unify(k + 1, values_1.vinst(a, v), values_1.vapp(b, a.mode, v));
    }
    if (b.tag === 'VAbs') {
        const v = values_1.VVar(k);
        return exports.unify(k + 1, values_1.vapp(a, b.mode, v), values_1.vinst(b, v));
    }
    if (a.tag === 'VPair') {
        exports.unify(k, a.fst, values_1.vproj('fst', b));
        return exports.unify(k, a.snd, values_1.vproj('snd', b));
    }
    if (b.tag === 'VPair') {
        exports.unify(k, values_1.vproj('fst', a), b.fst);
        return exports.unify(k, values_1.vproj('snd', a), b.snd);
    }
    if (values_1.isVPrim('ReflHEq', a))
        return;
    if (values_1.isVPrim('ReflHEq', b))
        return;
    if (a.tag === 'VNe' && b.tag === 'VNe' && conversion_1.eqHead(a.head, b.head))
        return list_1.zipWithR_((x, y) => unifyElim(k, x, y, a, b), a.spine, b.spine);
    if (a.tag === 'VNe' && b.tag === 'VNe' && a.head.tag === 'HMeta' && b.head.tag === 'HMeta')
        return list_1.length(a.spine) > list_1.length(b.spine) ?
            solve(k, a.head.index, a.spine, b) :
            solve(k, b.head.index, b.spine, a);
    if (a.tag === 'VNe' && a.head.tag === 'HMeta')
        return solve(k, a.head.index, a.spine, b);
    if (b.tag === 'VNe' && b.head.tag === 'HMeta')
        return solve(k, b.head.index, b.spine, a);
    if (a.tag === 'VGlobal' && b.tag === 'VGlobal' && a.head === b.head && list_1.length(a.args) === list_1.length(b.args)) {
        context_1.markContext();
        return utils_1.tryT(() => {
            list_1.zipWithR_((x, y) => unifyElim(k, x, y, a, b), a.args, b.args);
            context_1.discardContext();
        }, () => {
            context_1.undoContext();
            exports.unify(k, lazy_1.forceLazy(a.val), lazy_1.forceLazy(b.val));
        });
    }
    if (a.tag === 'VGlobal')
        return exports.unify(k, lazy_1.forceLazy(a.val), b);
    if (b.tag === 'VGlobal')
        return exports.unify(k, a, lazy_1.forceLazy(b.val));
    return utils_1.terr(`unify failed (${k}): ${values_1.showVal(a, k)} ~ ${values_1.showVal(b, k)}`);
};
exports.unify = unify;
const solve = (k, m, spine, val) => {
    config_1.log(() => `solve ${V.showVal(values_1.VMeta(m, spine), k)} := ${values_1.showVal(val, k)} (${k})`);
    utils_1.tryT(() => {
        if (context_1.isMetaSolved(m))
            return utils_1.impossible(`meta ?${m} is already solved`);
        const spinex = checkSpineTop(k, spine);
        if (spinex instanceof TypeError) {
            // postpone if spine contains non-vars
            context_1.postpone(k, values_1.VMeta(m, spine), val, [m]);
            return;
        }
        config_1.log(() => `spine ${list_1.listToString(spinex, s => `${s}`)}`);
        if (utils_1.hasDuplicates(list_1.toArray(spinex, x => x)))
            return utils_1.terr(`meta spine contains duplicates`);
        const rhs = values_1.quote(val, k);
        const meta = context_1.getMeta(m);
        const type = meta.type;
        config_1.log(() => `meta type: ${values_1.showVal(type, 0)}`);
        const zipped = zipSpine(0, list_1.reverse(spinex), type);
        config_1.log(() => `zipped: ${list_1.listToString(zipped, ([i, er]) => `${i} ${er}`)}`);
        const body = utils_1.tryTE(() => checkSolution(meta.erased, k, m, zipped, rhs));
        if (body instanceof TypeError) {
            if (config_1.config.postponeInvalidSolution) {
                // postpone if solution is invalid
                context_1.postpone(k, values_1.VMeta(m, spine), val, [m]);
                return;
            }
            else
                throw body;
        }
        const solution = constructSolution(0, type, body);
        config_1.log(() => `solution ?${m} := ${core_1.show(solution)}`);
        /*
         const res = tryTE(() => typecheck(solution, meta.erased));
        if (res instanceof TypeError)
          return terr(`solution was invalid: ${res}`);
        */
        const vsolution = values_1.evaluate(solution, list_1.Nil);
        context_1.solveMeta(m, vsolution);
        // try to solve blocked problems for the meta
        config_1.log(() => `try solve problems for ?${m}`);
        context_1.problemsBlockedBy(m).forEach(p => exports.unify(p.k, p.a, p.b));
        return;
    }, err => utils_1.terr(`failed to solve meta ${V.showVal(values_1.VMeta(m, spine), k)} := ${values_1.showVal(val, k)}: ${err.message}`));
};
const constructSolution = (k, ty_, body) => {
    const ty = values_1.force(ty_);
    if (ty.tag === 'VPi') {
        const v = values_1.VVar(k);
        return core_1.Abs(ty.mode, ty.erased, ty.name, values_1.quote(ty.type, k), constructSolution(k + 1, values_1.vinst(ty, v), body));
    }
    else
        return body;
};
const checkSpineTop = (k, spine) => utils_1.tryT(() => checkSpine(k, spine), err => err);
const checkSpine = (k, spine) => list_1.map(spine, elim => {
    if (elim.tag === 'EApp') {
        const v = values_1.force(elim.right);
        if (v.tag === 'VNe' && v.head.tag === 'HVar' && list_1.isEmpty(v.spine))
            return v.head.index;
        return utils_1.terr(`not a var in spine: ${values_1.showVal(v, k)}`);
    }
    return utils_1.terr(`unexpected elim in meta spine: ${elim.tag}`);
});
const zipSpine = (k, is, ty_, acc = list_1.Nil) => {
    const ty = values_1.force(ty_);
    if (list_1.isEmpty(is))
        return acc;
    if (ty.tag === 'VPi')
        return zipSpine(k + 1, list_1.tail(is), ty.clos(values_1.VVar(k)), list_1.Cons([list_1.head(is), ty.erased], acc));
    return utils_1.terr(`not a pi ${ty.tag} in zipSpine`);
};
const checkSolution = (erased, k, m, is, t) => {
    if (t.tag === 'Prim')
        return t;
    if (t.tag === 'Global')
        return t;
    if (t.tag === 'Var') {
        const i = k - t.index - 1;
        const j = list_1.indexOfFn(is, ([k]) => i === k);
        if (j >= 0) {
            const data = list_1.index(is, j);
            if (!erased && data && data[1])
                return utils_1.terr(`invalid solution, erased variable used: ${t.index} (${i}, ${j})`);
            return core_1.Var(j);
        }
        return utils_1.terr(`scope error ${t.index} (${i})`);
    }
    if (t.tag === 'Meta') {
        if (m === t.index)
            return utils_1.terr(`occurs check failed: ${core_1.show(t)}`);
        return t;
    }
    if (t.tag === 'App') {
        const l = checkSolution(erased, k, m, is, t.left);
        const r = checkSolution(erased, k, m, is, t.right);
        return core_1.App(l, t.mode, r);
    }
    if (t.tag === 'Pair') {
        const fst = checkSolution(erased, k, m, is, t.fst);
        const snd = checkSolution(erased, k, m, is, t.snd);
        const type = checkSolution(erased, k, m, is, t.type);
        return core_1.Pair(fst, snd, type);
    }
    if (t.tag === 'Proj') {
        const x = checkSolution(erased, k, m, is, t.term);
        return core_1.Proj(t.proj, x);
    }
    if (t.tag === 'Abs') {
        const ty = checkSolution(erased, k, m, is, t.type);
        const body = checkSolution(erased, k + 1, m, list_1.Cons([k, t.erased], is), t.body);
        return core_1.Abs(t.mode, t.erased, t.name, ty, body);
    }
    if (t.tag === 'Pi') {
        const ty = checkSolution(erased, k, m, is, t.type);
        const body = checkSolution(erased, k + 1, m, list_1.Cons([k, t.erased], is), t.body);
        return core_1.Pi(t.mode, t.erased, t.name, ty, body);
    }
    if (t.tag === 'Sigma') {
        const ty = checkSolution(erased, k, m, is, t.type);
        const body = checkSolution(erased, k + 1, m, list_1.Cons([k, t.erased], is), t.body);
        return core_1.Sigma(t.erased, t.name, ty, body);
    }
    if (t.tag === 'Data') {
        const index = checkSolution(erased, k, m, is, t.index);
        const cons = t.cons.map(x => checkSolution(erased, k, m, is, x));
        return core_1.DataDef(index, cons);
    }
    if (t.tag === 'TCon') {
        const data = checkSolution(erased, k, m, is, t.data);
        const args = t.args.map(x => checkSolution(erased, k, m, is, x));
        return core_1.TCon(data, args);
    }
    return utils_1.impossible(`checkSolution ?${m}: non-normal term: ${core_1.show(t)}`);
};

},{"./config":2,"./context":3,"./conversion":4,"./core":5,"./utils/lazy":19,"./utils/list":20,"./utils/utils":21,"./values":22}],19:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapLazy = exports.forceLazy = exports.lazyOf = exports.Lazy = void 0;
const Lazy = (fn) => ({ fn, val: null, forced: false });
exports.Lazy = Lazy;
const lazyOf = (val) => ({ fn: () => val, val, forced: true });
exports.lazyOf = lazyOf;
const forceLazy = (lazy) => {
    if (lazy.forced)
        return lazy.val;
    const v = lazy.fn();
    lazy.val = v;
    lazy.forced = true;
    return v;
};
exports.forceLazy = forceLazy;
const mapLazy = (lazy, fn) => exports.Lazy(() => fn(exports.forceLazy(lazy)));
exports.mapLazy = mapLazy;

},{}],20:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.last = exports.max = exports.contains = exports.range = exports.and = exports.zipWithR_ = exports.zipWith_ = exports.zipWithIndex = exports.zipWith = exports.foldlprim = exports.foldrprim = exports.foldl = exports.foldr = exports.lookup = exports.extend = exports.take = exports.indecesOf = exports.dropWhile = exports.takeWhile = exports.indexOfFn = exports.indexOf = exports.index = exports.mapIndex = exports.map = exports.consAll = exports.append = exports.toArrayFilter = exports.toArray = exports.reverse = exports.isEmpty = exports.length = exports.each = exports.first = exports.filter = exports.listToString = exports.tail = exports.head = exports.list = exports.listFrom = exports.Cons = exports.Nil = void 0;
exports.Nil = { tag: 'Nil' };
const Cons = (head, tail) => ({ tag: 'Cons', head, tail });
exports.Cons = Cons;
const listFrom = (a) => a.reduceRight((x, y) => exports.Cons(y, x), exports.Nil);
exports.listFrom = listFrom;
const list = (...a) => exports.listFrom(a);
exports.list = list;
const head = (l) => l.head;
exports.head = head;
const tail = (l) => l.tail;
exports.tail = tail;
const listToString = (l, fn = x => `${x}`) => {
    const r = [];
    let c = l;
    while (c.tag === 'Cons') {
        r.push(fn(c.head));
        c = c.tail;
    }
    return `[${r.join(', ')}]`;
};
exports.listToString = listToString;
const filter = (l, fn) => l.tag === 'Cons' ? (fn(l.head) ? exports.Cons(l.head, exports.filter(l.tail, fn)) : exports.filter(l.tail, fn)) : l;
exports.filter = filter;
const first = (l, fn) => {
    let c = l;
    while (c.tag === 'Cons') {
        if (fn(c.head))
            return c.head;
        c = c.tail;
    }
    return null;
};
exports.first = first;
const each = (l, fn) => {
    let c = l;
    while (c.tag === 'Cons') {
        fn(c.head);
        c = c.tail;
    }
};
exports.each = each;
const length = (l) => {
    let n = 0;
    let c = l;
    while (c.tag === 'Cons') {
        n++;
        c = c.tail;
    }
    return n;
};
exports.length = length;
const isEmpty = (l) => l.tag === 'Nil';
exports.isEmpty = isEmpty;
const reverse = (l) => exports.listFrom(exports.toArray(l, x => x).reverse());
exports.reverse = reverse;
const toArray = (l, fn) => {
    let c = l;
    const r = [];
    while (c.tag === 'Cons') {
        r.push(fn(c.head));
        c = c.tail;
    }
    return r;
};
exports.toArray = toArray;
const toArrayFilter = (l, m, f) => {
    const a = [];
    while (l.tag === 'Cons') {
        if (f(l.head))
            a.push(m(l.head));
        l = l.tail;
    }
    return a;
};
exports.toArrayFilter = toArrayFilter;
const append = (a, b) => a.tag === 'Cons' ? exports.Cons(a.head, exports.append(a.tail, b)) : b;
exports.append = append;
const consAll = (hs, b) => exports.append(exports.listFrom(hs), b);
exports.consAll = consAll;
const map = (l, fn) => l.tag === 'Cons' ? exports.Cons(fn(l.head), exports.map(l.tail, fn)) : l;
exports.map = map;
const mapIndex = (l, fn, i = 0) => l.tag === 'Cons' ? exports.Cons(fn(i, l.head), exports.mapIndex(l.tail, fn, i + 1)) : l;
exports.mapIndex = mapIndex;
const index = (l, i) => {
    while (l.tag === 'Cons') {
        if (i-- === 0)
            return l.head;
        l = l.tail;
    }
    return null;
};
exports.index = index;
const indexOf = (l, x) => {
    let i = 0;
    while (l.tag === 'Cons') {
        if (l.head === x)
            return i;
        l = l.tail;
        i++;
    }
    return -1;
};
exports.indexOf = indexOf;
const indexOfFn = (l, x) => {
    let i = 0;
    while (l.tag === 'Cons') {
        if (x(l.head))
            return i;
        l = l.tail;
        i++;
    }
    return -1;
};
exports.indexOfFn = indexOfFn;
const takeWhile = (l, fn) => l.tag === 'Cons' && fn(l.head) ? exports.Cons(l.head, exports.takeWhile(l.tail, fn)) : exports.Nil;
exports.takeWhile = takeWhile;
const dropWhile = (l, fn) => l.tag === 'Cons' && fn(l.head) ? exports.dropWhile(l.tail, fn) : l;
exports.dropWhile = dropWhile;
const indecesOf = (l, val) => {
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
exports.indecesOf = indecesOf;
const take = (l, n) => n <= 0 || l.tag === 'Nil' ? exports.Nil : exports.Cons(l.head, exports.take(l.tail, n - 1));
exports.take = take;
const extend = (name, val, rest) => exports.Cons([name, val], rest);
exports.extend = extend;
const lookup = (l, name, eq = (x, y) => x === y) => {
    while (l.tag === 'Cons') {
        const h = l.head;
        if (eq(h[0], name))
            return h[1];
        l = l.tail;
    }
    return null;
};
exports.lookup = lookup;
const foldr = (f, i, l, j = 0) => l.tag === 'Nil' ? i : f(l.head, exports.foldr(f, i, l.tail, j + 1), j);
exports.foldr = foldr;
const foldl = (f, i, l) => l.tag === 'Nil' ? i : exports.foldl(f, f(i, l.head), l.tail);
exports.foldl = foldl;
const foldrprim = (f, i, l, ind = 0) => l.tag === 'Nil' ? i : f(l.head, exports.foldrprim(f, i, l.tail, ind + 1), l, ind);
exports.foldrprim = foldrprim;
const foldlprim = (f, i, l, ind = 0) => l.tag === 'Nil' ? i : exports.foldlprim(f, f(l.head, i, l, ind), l.tail, ind + 1);
exports.foldlprim = foldlprim;
const zipWith = (f, la, lb) => la.tag === 'Nil' || lb.tag === 'Nil' ? exports.Nil :
    exports.Cons(f(la.head, lb.head), exports.zipWith(f, la.tail, lb.tail));
exports.zipWith = zipWith;
const zipWithIndex = (f, la, lb, i = 0) => la.tag === 'Nil' || lb.tag === 'Nil' ? exports.Nil :
    exports.Cons(f(la.head, lb.head, i), exports.zipWithIndex(f, la.tail, lb.tail, i + 1));
exports.zipWithIndex = zipWithIndex;
const zipWith_ = (f, la, lb) => {
    if (la.tag === 'Cons' && lb.tag === 'Cons') {
        f(la.head, lb.head);
        exports.zipWith_(f, la.tail, lb.tail);
    }
};
exports.zipWith_ = zipWith_;
const zipWithR_ = (f, la, lb) => {
    if (la.tag === 'Cons' && lb.tag === 'Cons') {
        exports.zipWith_(f, la.tail, lb.tail);
        f(la.head, lb.head);
    }
};
exports.zipWithR_ = zipWithR_;
const and = (l) => l.tag === 'Nil' ? true : l.head && exports.and(l.tail);
exports.and = and;
const range = (n) => n <= 0 ? exports.Nil : exports.Cons(n - 1, exports.range(n - 1));
exports.range = range;
const contains = (l, v) => l.tag === 'Cons' ? (l.head === v || exports.contains(l.tail, v)) : false;
exports.contains = contains;
const max = (l) => exports.foldl((a, b) => b > a ? b : a, Number.MIN_SAFE_INTEGER, l);
exports.max = max;
const last = (l) => {
    let c = l;
    while (c.tag === 'Cons')
        if (c.tail.tag === 'Nil')
            return c.head;
    return null;
};
exports.last = last;

},{}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eqArr = exports.mapObj = exports.tryTE = exports.tryT = exports.hasDuplicates = exports.range = exports.loadFile = exports.serr = exports.terr = exports.impossible = void 0;
const impossible = (msg) => {
    throw new Error(`impossible: ${msg}`);
};
exports.impossible = impossible;
const terr = (msg) => {
    throw new TypeError(msg);
};
exports.terr = terr;
const serr = (msg) => {
    throw new SyntaxError(msg);
};
exports.serr = serr;
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
exports.loadFile = loadFile;
const range = (n) => {
    const a = Array(n);
    for (let i = 0; i < n; i++)
        a[i] = i;
    return a;
};
exports.range = range;
const hasDuplicates = (x) => {
    const m = {};
    for (let i = 0; i < x.length; i++) {
        const y = `${x[i]}`;
        if (m[y])
            return true;
        m[y] = true;
    }
    return false;
};
exports.hasDuplicates = hasDuplicates;
const tryT = (v, e, throwErr = false) => {
    try {
        return v();
    }
    catch (err) {
        if (!(err instanceof TypeError))
            throw err;
        const r = e(err);
        if (throwErr)
            throw err;
        return r;
    }
};
exports.tryT = tryT;
const tryTE = (v) => exports.tryT(v, err => err);
exports.tryTE = tryTE;
const mapObj = (o, fn) => {
    const n = {};
    for (const k in o)
        n[k] = fn(o[k]);
    return n;
};
exports.mapObj = mapObj;
const eqArr = (a, b, eq = (x, y) => x === y) => {
    const l = a.length;
    if (b.length !== l)
        return false;
    for (let i = 0; i < l; i++)
        if (!eq(a[i], b[i]))
            return false;
    return true;
};
exports.eqArr = eqArr;

},{"fs":24}],22:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VAbsU = exports.VAbsEE = exports.VAbsE = exports.VPiU = exports.VPiEE = exports.VPiE = exports.vAllI = exports.VAllI = exports.vInterpI = exports.VInterpI = exports.vicon = exports.VICon = exports.vidata = exports.VIData = exports.VIHRec = exports.VIRec = exports.VIFArg = exports.VIArgE = exports.VIArg = exports.VIEnd = exports.videsc = exports.VIDesc = exports.vreflheq = exports.vheq = exports.VReflHEq = exports.VHEq = exports.V1 = exports.V0 = exports.VB = exports.VDataSort = exports.VType = exports.vprimArgs = exports.isVPrim = exports.VMeta = exports.VPrim = exports.VVar = exports.VTCon = exports.VDataDef = exports.VSigma = exports.VPi = exports.VPair = exports.VAbs = exports.VGlobal = exports.VNe = exports.EPrim = exports.EProj = exports.EApp = exports.HMeta = exports.HPrim = exports.HVar = void 0;
exports.showValZ = exports.showVal = exports.zonk = exports.normalize = exports.quote = exports.evaluate = exports.VUnit = exports.VU = exports.VVoid = exports.velimprim = exports.vproj = exports.vappU = exports.vappEs = exports.vappE = exports.vapp = exports.force = exports.vinst = void 0;
const base_1 = require("./base");
const config_1 = require("./config");
const context_1 = require("./context");
const core_1 = require("./core");
const globals_1 = require("./globals");
const lazy_1 = require("./utils/lazy");
const list_1 = require("./utils/list");
const utils_1 = require("./utils/utils");
const HVar = (index) => ({ tag: 'HVar', index });
exports.HVar = HVar;
const HPrim = (name) => ({ tag: 'HPrim', name });
exports.HPrim = HPrim;
const HMeta = (index) => ({ tag: 'HMeta', index });
exports.HMeta = HMeta;
const EApp = (mode, right) => ({ tag: 'EApp', mode, right });
exports.EApp = EApp;
const EProj = (proj) => ({ tag: 'EProj', proj });
exports.EProj = EProj;
const EPrim = (name, args) => ({ tag: 'EPrim', name, args });
exports.EPrim = EPrim;
const VNe = (head, spine) => ({ tag: 'VNe', head, spine });
exports.VNe = VNe;
const VGlobal = (head, args, val) => ({ tag: 'VGlobal', head, args, val });
exports.VGlobal = VGlobal;
const VAbs = (mode, erased, name, type, clos) => ({ tag: 'VAbs', mode, erased, name, type, clos });
exports.VAbs = VAbs;
const VPair = (fst, snd, type) => ({ tag: 'VPair', fst, snd, type });
exports.VPair = VPair;
const VPi = (mode, erased, name, type, clos) => ({ tag: 'VPi', mode, erased, name, type, clos });
exports.VPi = VPi;
const VSigma = (erased, name, type, clos) => ({ tag: 'VSigma', erased, name, type, clos });
exports.VSigma = VSigma;
const VDataDef = (index, cons) => ({ tag: 'VData', index, cons });
exports.VDataDef = VDataDef;
const VTCon = (data, args) => ({ tag: 'VTCon', data, args });
exports.VTCon = VTCon;
const VVar = (index, spine = list_1.Nil) => exports.VNe(exports.HVar(index), spine);
exports.VVar = VVar;
const VPrim = (name, spine = list_1.Nil) => exports.VNe(exports.HPrim(name), spine);
exports.VPrim = VPrim;
const VMeta = (index, spine = list_1.Nil) => exports.VNe(exports.HMeta(index), spine);
exports.VMeta = VMeta;
const isVPrim = (name, v) => v.tag === 'VNe' && v.head.tag === 'HPrim' && v.head.name === name;
exports.isVPrim = isVPrim;
const vprimArgs = (v) => {
    if (v.tag !== 'VNe')
        return utils_1.impossible(`vprimArgs, not VNe: ${v.tag}`);
    return list_1.toArray(v.spine, e => {
        if (e.tag !== 'EApp')
            return utils_1.impossible(`vprimArgs, not EApp: ${e.tag}`);
        return e.right;
    }).reverse();
};
exports.vprimArgs = vprimArgs;
exports.VType = exports.VPrim('Type');
exports.VDataSort = exports.VPrim('Data');
exports.VB = exports.VPrim('B');
exports.V0 = exports.VPrim('0');
exports.V1 = exports.VPrim('1');
exports.VHEq = exports.VPrim('HEq');
exports.VReflHEq = exports.VPrim('ReflHEq');
const vheq = (a, b, x, y) => exports.vappE(exports.vappE(exports.vappE(exports.vappE(exports.VHEq, a), b), x), y);
exports.vheq = vheq;
const vreflheq = (a, x) => exports.vappE(exports.vappE(exports.VReflHEq, a), x);
exports.vreflheq = vreflheq;
exports.VIDesc = exports.VPrim('IDesc');
const videsc = (i) => exports.vappE(exports.VIDesc, i);
exports.videsc = videsc;
exports.VIEnd = exports.VPrim('IEnd');
exports.VIArg = exports.VPrim('IArg');
exports.VIArgE = exports.VPrim('IArgE');
exports.VIFArg = exports.VPrim('IFArg');
exports.VIRec = exports.VPrim('IRec');
exports.VIHRec = exports.VPrim('IHRec');
exports.VIData = exports.VPrim('IData');
const vidata = (I, d, i) => exports.vappEs([exports.VIData, I, d, i]);
exports.vidata = vidata;
exports.VICon = exports.VPrim('ICon');
const vicon = (I, d, i, x) => exports.vappEs([exports.VICon, I, d, i, x]);
exports.vicon = vicon;
exports.VInterpI = exports.VPrim('InterpI');
const vInterpI = (I, d, r, i) => exports.velimprim('InterpI', d, [I, r, i]);
exports.vInterpI = vInterpI;
exports.VAllI = exports.VPrim('AllI');
const vAllI = (I, d, X, P, i, xs) => exports.velimprim('AllI', d, [I, X, P, i, xs]);
exports.vAllI = vAllI;
const VPiE = (name, type, clos) => exports.VPi(core_1.Expl, false, name, type, clos);
exports.VPiE = VPiE;
const VPiEE = (name, type, clos) => exports.VPi(core_1.Expl, true, name, type, clos);
exports.VPiEE = VPiEE;
const VPiU = (name, type, clos) => exports.VPi(core_1.ImplUnif, false, name, type, clos);
exports.VPiU = VPiU;
const VAbsE = (name, type, clos) => exports.VAbs(core_1.Expl, false, name, type, clos);
exports.VAbsE = VAbsE;
const VAbsEE = (name, type, clos) => exports.VAbs(core_1.Expl, true, name, type, clos);
exports.VAbsEE = VAbsEE;
const VAbsU = (name, type, clos) => exports.VAbs(core_1.ImplUnif, false, name, type, clos);
exports.VAbsU = VAbsU;
const vinst = (val, arg) => val.clos(arg);
exports.vinst = vinst;
const force = (v, forceGlobal = true) => {
    if (v.tag === 'VGlobal' && forceGlobal)
        return exports.force(lazy_1.forceLazy(v.val), forceGlobal);
    if (v.tag === 'VNe' && v.head.tag === 'HMeta') {
        const val = context_1.getMeta(v.head.index);
        if (val.tag === 'Unsolved')
            return v;
        return exports.force(list_1.foldr((elim, y) => elim.tag === 'EProj' ? exports.vproj(elim.proj, y) :
            elim.tag === 'EPrim' ? exports.velimprim(elim.name, y, elim.args) :
                exports.vapp(y, elim.mode, elim.right), val.val, v.spine), forceGlobal);
    }
    return v;
};
exports.force = force;
const vapp = (left, mode, right) => {
    if (left.tag === 'VAbs')
        return exports.vinst(left, right);
    if (left.tag === 'VNe')
        return exports.VNe(left.head, list_1.Cons(exports.EApp(mode, right), left.spine));
    if (left.tag === 'VGlobal')
        return exports.VGlobal(left.head, list_1.Cons(exports.EApp(mode, right), left.args), lazy_1.mapLazy(left.val, v => exports.vapp(v, mode, right)));
    return utils_1.impossible(`vapp: ${left.tag}`);
};
exports.vapp = vapp;
const vappE = (left, right) => exports.vapp(left, core_1.Expl, right);
exports.vappE = vappE;
const vappEs = (a) => a.reduce(exports.vappE);
exports.vappEs = vappEs;
const vappU = (left, right) => exports.vapp(left, core_1.ImplUnif, right);
exports.vappU = vappU;
const vproj = (proj, v) => {
    if (v.tag === 'VPair')
        return proj === 'fst' ? v.fst : v.snd;
    if (v.tag === 'VNe')
        return exports.VNe(v.head, list_1.Cons(exports.EProj(proj), v.spine));
    if (v.tag === 'VGlobal')
        return exports.VGlobal(v.head, list_1.Cons(exports.EProj(proj), v.args), lazy_1.mapLazy(v.val, v => exports.vproj(proj, v)));
    return utils_1.impossible(`vproj: ${v.tag}`);
};
exports.vproj = vproj;
const velimprim = (name, v, args) => {
    if (name === 'elimB') {
        if (exports.isVPrim('0', v))
            return args[1];
        if (exports.isVPrim('1', v))
            return args[2];
    }
    if (name === 'elimHEq') {
        if (exports.isVPrim('ReflHEq', v))
            return args[3];
    }
    if (name === 'elimIDesc') {
        const [, , end, arg, arge, farg, rec, hrec] = args;
        if (exports.isVPrim('IEnd', v)) {
            // elimIDesc I P end arg farg rec hrec (IEnd I i) = end i
            const [, i] = exports.vprimArgs(v);
            return exports.vappE(end, i);
        }
        if (exports.isVPrim('IArg', v)) {
            // elimIDesc I P end arg farg rec hrec (IArg I A f) = arg A f (\(a : A). elimIDesc ... (f a))
            const [, A, f] = exports.vprimArgs(v);
            return exports.vappEs([arg, A, f, exports.VAbsE('a', A, a => exports.velimprim('elimIDesc', exports.vappE(f, a), args))]);
        }
        if (exports.isVPrim('IArgE', v)) {
            // elimIDesc I P end arg arge farg rec hrec (IArgE I A f) = arge A f (\(-a : A). elimIDesc ... (f a))
            const [, A, f] = exports.vprimArgs(v);
            return exports.vappEs([arge, A, f, exports.VAbsEE('a', A, a => exports.velimprim('elimIDesc', exports.vappE(f, a), args))]);
        }
        if (exports.isVPrim('IFArg', v)) {
            // elimIDesc I P end arg farg rec hrec (IFArg I A d) = farg A d (elimIDesc ... d)
            const [, A, d] = exports.vprimArgs(v);
            return exports.vappEs([farg, A, d, exports.velimprim('elimIDesc', d, args)]);
        }
        if (exports.isVPrim('IRec', v)) {
            // elimIDesc I P end arg farg rec hrec (IRec I i d) = rec i d (elimIDesc ... d)
            const [, i, d] = exports.vprimArgs(v);
            return exports.vappEs([rec, i, d, exports.velimprim('elimIDesc', d, args)]);
        }
        if (exports.isVPrim('IHRec', v)) {
            // elimIDesc I P end arg farg rec hrec (IHRec I A f d) = rec A f d (elimIDesc ... d)
            const [, A, f, d] = exports.vprimArgs(v);
            return exports.vappEs([hrec, A, f, d, exports.velimprim('elimIDesc', d, args)]);
        }
    }
    if (name === 'InterpI') {
        /*
        Interp : (I : *) -> IDesc I -> (I -> *) -> I -> *
        Interp I (IEnd I i) X j = i = j
        Interp I (IArg I A f) X j = (x : A) ** Interp I (f x) X j
        Interp I (IArgE I A f) X j = (-x : A) ** Interp I (f x) X j
        Interp I (IFArg I A d) X j = A ** Interp I d X j
        Interp I (IRec I i d) X j = X i ** Interp I d X j
        Interp I (IHRec I A f d) X j = ((a : A) -> X (f a)) ** Interp I d X j
        */
        const [I, X, j] = args;
        if (exports.isVPrim('IEnd', v)) {
            const [, i] = exports.vprimArgs(v);
            return exports.vheq(I, I, i, j);
        }
        if (exports.isVPrim('IArg', v)) {
            const [, A, f] = exports.vprimArgs(v);
            return exports.VSigma(false, 'x', A, x => exports.velimprim('InterpI', exports.vappE(f, x), args));
        }
        if (exports.isVPrim('IArgE', v)) {
            const [, A, f] = exports.vprimArgs(v);
            return exports.VSigma(true, 'x', A, x => exports.velimprim('InterpI', exports.vappE(f, x), args));
        }
        if (exports.isVPrim('IFArg', v)) {
            const [, A, d] = exports.vprimArgs(v);
            return exports.VSigma(false, '_', A, _ => exports.velimprim('InterpI', d, args));
        }
        if (exports.isVPrim('IRec', v)) {
            const [, i, d] = exports.vprimArgs(v);
            return exports.VSigma(false, '_', exports.vappE(X, i), _ => exports.velimprim('InterpI', d, args));
        }
        if (exports.isVPrim('IHRec', v)) {
            const [, A, f, d] = exports.vprimArgs(v);
            return exports.VSigma(false, '_', exports.VPiE('a', A, a => exports.vappE(X, exports.vappE(f, a))), _ => exports.velimprim('InterpI', d, args));
        }
        // InterpretI I (elimB Pb f t b) X i ~> elimB * (InterpretI I f X i) (InterpretI I t X i) b
        if (v.tag === 'VNe' && v.spine.tag === 'Cons' && v.spine.head.tag === 'EPrim' && v.spine.head.name === 'elimB') {
            const head = v.spine.head;
            const f = head.args[1];
            const t = head.args[2];
            return exports.velimprim('elimB', exports.VNe(v.head, v.spine.tail), [exports.VAbsE('_', exports.VB, _ => exports.VType), exports.velimprim('InterpI', f, args), exports.velimprim('InterpI', t, args)]);
        }
    }
    if (name === 'AllI') {
        /*
        AllI : (I : *) -> (d : IDesc I) -> (X : I -> *) -> (P : (i : I) -> X i -> *) -> (i : I) -> (xs : InterpI I d X i) -> *
        AllI I (IEnd I i) X P j () = U
        AllI I (IArg I A f) X P j (x, y) = AllI I (f x) X P j y
        AllI I (IArgE I A f) X P j (x, y) = AllI I (f x) X P j y
        AllI I (IFArg I A d) X P j (_, y) = AllI I d X P j y
        AllI I (IRec I i d) X P j (x, y) = P i x ** AllI I d X P j y
        AllI I (IHRec I A fi d) X P j (f, y) = ((a : A) -> P (fi a) (f a)) ** AllI I d X P j y
        */
        const [I, X, P, i, xs] = args;
        if (exports.isVPrim('IEnd', v))
            return exports.VU;
        if (exports.isVPrim('IArg', v)) {
            const [, , f] = exports.vprimArgs(v);
            return exports.velimprim('AllI', exports.vappE(f, exports.vproj('fst', xs)), [I, X, P, i, exports.vproj('snd', xs)]);
        }
        if (exports.isVPrim('IArgE', v)) {
            const [, , f] = exports.vprimArgs(v);
            return exports.velimprim('AllI', exports.vappE(f, exports.vproj('fst', xs)), [I, X, P, i, exports.vproj('snd', xs)]);
        }
        if (exports.isVPrim('IFArg', v)) {
            const [, , d] = exports.vprimArgs(v);
            return exports.velimprim('AllI', d, [I, X, P, i, exports.vproj('snd', xs)]);
        }
        if (exports.isVPrim('IRec', v)) {
            const [, j, d] = exports.vprimArgs(v);
            return exports.VSigma(false, '_', exports.vappEs([P, j, exports.vproj('fst', xs)]), _ => exports.velimprim('AllI', d, [I, X, P, i, exports.vproj('snd', xs)]));
        }
        if (exports.isVPrim('IHRec', v)) {
            const [, A, fi, d] = exports.vprimArgs(v);
            return exports.VSigma(false, '_', exports.VPiE('a', A, a => exports.vappEs([P, exports.vappE(fi, a), exports.vappE(exports.vproj('fst', xs), a)])), _ => exports.velimprim('AllI', d, [I, X, P, i, exports.vproj('snd', xs)]));
        }
    }
    if (name === 'allI') {
        /*
        allI : (I : *) -> (d : IDesc I) -> (X : I -> *) -> (P : (i : I) -> X i -> *) -> ((i : I) -> (x : X i) -> P i x) -> (i : I) -> (xs : InterpI I d X i) -> All I d X P i xs
        allI I (IEnd I i) X P p j () = ()
        allI I (IArg I A f) X P p j (x, y) = all (f x) X P p y
        allI I (IArgE I A f) X P p j (x, y) = all (f x) X P p y
        allI I (IFArg I A d) X P p j (_, y) = all d X P p y
        allI I (IRec A i d) X P p j (x, y) = (p i x, all d X P p y)
        allI I (IHRec A fi d) X P p j (f, y) = (\(h : A). p (fi h) (f h), all d X P p y)
        */
        const [I, X, P, p, i, xs] = args;
        if (exports.isVPrim('IEnd', v))
            return exports.VUnit;
        if (exports.isVPrim('IArg', v)) {
            const [, , f] = exports.vprimArgs(v);
            return exports.velimprim('allI', exports.vappE(f, exports.vproj('fst', xs)), [I, X, P, p, i, exports.vproj('snd', xs)]);
        }
        if (exports.isVPrim('IArgE', v)) {
            const [, , f] = exports.vprimArgs(v);
            return exports.velimprim('allI', exports.vappE(f, exports.vproj('fst', xs)), [I, X, P, p, i, exports.vproj('snd', xs)]);
        }
        if (exports.isVPrim('IFArg', v)) {
            const [, , d] = exports.vprimArgs(v);
            return exports.velimprim('allI', d, [I, X, P, p, i, exports.vproj('snd', xs)]);
        }
        if (exports.isVPrim('IRec', v)) {
            const [, i, d] = exports.vprimArgs(v);
            return exports.VPair(exports.vappEs([p, i, exports.vproj('fst', xs)]), exports.velimprim('allI', d, [I, X, P, p, i, exports.vproj('snd', xs)]), exports.velimprim('AllI', v, [I, X, P, i, xs]));
        }
        if (exports.isVPrim('IHRec', v)) {
            const [, A, fi, d] = exports.vprimArgs(v);
            return exports.VPair(exports.VAbsE('h', A, h => exports.vappEs([p, exports.vappE(fi, h), exports.vappE(exports.vproj('fst', xs), h)])), exports.velimprim('allI', d, [I, X, P, p, i, exports.vproj('snd', xs)]), exports.velimprim('AllI', v, [I, X, P, i, xs]));
        }
    }
    if (name === 'indI') {
        if (exports.isVPrim('ICon', v)) {
            const [I, d, P, h, i] = args;
            const [, , , c] = exports.vprimArgs(v);
            // ind I d P h i (ICon I d i c) ~> h i c (allI I d (IData I d) P (\(x : Data d). ind I d P h i x) i c)
            return exports.vappEs([h, i, c, exports.velimprim('allI', d, [I, exports.vappEs([exports.VIData, I, d]), P, exports.VAbsEE('i', I, i => exports.VAbsE('x', exports.vidata(I, d, i), x => exports.velimprim('indI', x, [I, d, P, h, i]))), i, c])]);
        }
    }
    if (v.tag === 'VNe')
        return exports.VNe(v.head, list_1.Cons(exports.EPrim(name, args), v.spine));
    if (v.tag === 'VGlobal')
        return exports.VGlobal(v.head, list_1.Cons(exports.EPrim(name, args), v.args), lazy_1.mapLazy(v.val, v => exports.velimprim(name, v, args)));
    return utils_1.impossible(`velimprim ${name}: ${v.tag}`);
};
exports.velimprim = velimprim;
exports.VVoid = exports.VPiE('t', exports.VType, t => t);
exports.VU = exports.vheq(exports.VType, exports.VType, exports.VVoid, exports.VVoid);
exports.VUnit = exports.vreflheq(exports.VType, exports.VVoid);
const evaluate = (t, vs) => {
    if (t.tag === 'Abs')
        return exports.VAbs(t.mode, t.erased, t.name, exports.evaluate(t.type, vs), v => exports.evaluate(t.body, list_1.Cons(v, vs)));
    if (t.tag === 'Pair')
        return exports.VPair(exports.evaluate(t.fst, vs), exports.evaluate(t.snd, vs), exports.evaluate(t.type, vs));
    if (t.tag === 'Pi')
        return exports.VPi(t.mode, t.erased, t.name, exports.evaluate(t.type, vs), v => exports.evaluate(t.body, list_1.Cons(v, vs)));
    if (t.tag === 'Sigma')
        return exports.VSigma(t.erased, t.name, exports.evaluate(t.type, vs), v => exports.evaluate(t.body, list_1.Cons(v, vs)));
    if (t.tag === 'Data')
        return exports.VDataDef(exports.evaluate(t.index, vs), t.cons.map(x => exports.evaluate(x, vs)));
    if (t.tag === 'TCon')
        return exports.VTCon(exports.evaluate(t.data, vs), t.args.map(x => exports.evaluate(x, vs)));
    if (t.tag === 'Meta') {
        const s = context_1.getMeta(t.index);
        return s.tag === 'Solved' ? s.val : exports.VMeta(t.index);
    }
    if (t.tag === 'Var')
        return list_1.index(vs, t.index) || utils_1.impossible(`evaluate: var ${t.index} has no value`);
    if (t.tag === 'Global') {
        let val;
        if (config_1.config.useBase) {
            const [term] = base_1.getFromBase(t.name);
            val = exports.evaluate(term, list_1.Nil);
        }
        else {
            const entry = globals_1.getGlobal(t.name) || utils_1.impossible(`evaluate: global ${t.name} has no value`);
            val = entry.val;
        }
        return exports.VGlobal(t.name, list_1.Nil, lazy_1.lazyOf(val));
    }
    if (t.tag === 'App')
        return exports.vapp(exports.evaluate(t.left, vs), t.mode, exports.evaluate(t.right, vs));
    if (t.tag === 'Let')
        return exports.evaluate(t.body, list_1.Cons(exports.evaluate(t.val, vs), vs));
    if (t.tag === 'Proj')
        return exports.vproj(t.proj, exports.evaluate(t.term, vs));
    if (t.tag === 'Prim') {
        if (t.name === 'elimB') {
            return exports.VAbsEE('P', exports.VPiE('_', exports.VB, _ => exports.VType), P => exports.VAbsE('f', exports.vappE(P, exports.V0), f => exports.VAbsE('t', exports.vappE(P, exports.V1), t => exports.VAbsE('b', exports.VB, b => exports.velimprim('elimB', b, [P, f, t])))));
        }
        if (t.name === 'elimHEq') {
            return exports.VAbsEE('A', exports.VType, A => exports.VAbsEE('a', A, a => exports.VAbsEE('P', exports.VPiE('b', A, b => exports.VPiE('_', exports.vheq(A, A, a, b), _ => exports.VType)), P => exports.VAbsE('h', exports.vappE(exports.vappE(P, a), exports.vreflheq(A, a)), h => exports.VAbsEE('b', A, b => exports.VAbsEE('p', exports.vheq(A, A, a, b), p => exports.velimprim('elimHEq', p, [A, a, P, h, b])))))));
        }
        if (t.name === 'elimIDesc') {
            return exports.VAbsEE('I', exports.VType, I => exports.VAbsEE('P', exports.VPiE('_', exports.videsc(I), _ => exports.VType), P => exports.VAbsE('end', exports.VPiEE('i', I, i => exports.vappE(P, exports.vappE(exports.VIEnd, i))), end => exports.VAbsE('arg', exports.VPiEE('A', exports.VType, A => exports.VPiE('f', exports.VPiE('_', A, _ => exports.videsc(I)), f => exports.VPiE('_', exports.VPiE('a', A, a => exports.vappE(P, exports.vappE(f, a))), _ => exports.vappE(P, exports.vappEs([exports.VIArg, A, f]))))), arg => exports.VAbsE('arge', exports.VPiEE('A', exports.VType, A => exports.VPiE('f', exports.VPiEE('a', A, _ => exports.videsc(I)), f => exports.VPiE('_', exports.VPiEE('a', A, a => exports.vappE(P, exports.vappE(f, a))), _ => exports.vappE(P, exports.vappEs([exports.VIArgE, A, f]))))), arge => exports.VAbsE('farg', exports.VPiEE('A', exports.VType, A => exports.VPiE('d', exports.videsc(I), d => exports.VPiE('_', exports.vappE(P, d), _ => exports.vappE(P, exports.vappEs([exports.VIFArg, A, d]))))), farg => exports.VAbsE('rec', exports.VPiEE('i', I, i => exports.VPiE('d', exports.videsc(I), d => exports.VPiE('_', exports.vappE(P, d), _ => exports.vappE(P, exports.vappEs([exports.VIRec, i, d]))))), rec => exports.VAbsE('hrec', exports.VPiEE('A', exports.VType, A => exports.VPiE('f', exports.VPiEE('_', A, _ => I), f => exports.VPiE('d', exports.videsc(I), d => exports.VPiE('_', exports.vappE(P, d), _ => exports.vappE(P, exports.vappEs([exports.VIHRec, A, f, d])))))), hrec => exports.VAbsE('d', exports.videsc(I), d => exports.velimprim('elimIDesc', d, [I, P, end, arg, arge, farg, rec, hrec]))))))))));
        }
        if (t.name === 'InterpI')
            return exports.VAbsE('I', exports.VType, I => exports.VAbsE('d', exports.videsc(I), d => exports.VAbsE('r', exports.VPiE('_', I, _ => exports.VType), r => exports.VAbsE('i', I, i => exports.velimprim('InterpI', d, [I, r, i])))));
        if (t.name === 'AllI')
            return exports.VAbsE('I', exports.VType, I => exports.VAbsE('d', exports.videsc(I), d => exports.VAbsE('X', exports.VPiE('_', I, _ => exports.VType), X => exports.VAbsE('P', exports.VPiE('i', I, i => exports.VPiE('_', exports.vappE(X, i), _ => exports.VType)), P => exports.VAbsE('i', I, i => exports.VAbsE('xs', exports.vInterpI(I, d, X, i), xs => exports.velimprim('AllI', d, [I, X, P, i, xs])))))));
        if (t.name === 'allI') {
            return exports.VAbsEE('I', exports.VType, I => exports.VAbsE('d', exports.videsc(I), d => exports.VAbsEE('X', exports.VPiE('_', I, _ => exports.VType), X => exports.VAbsEE('P', exports.VPiE('i', I, i => exports.VPiE('_', exports.vappE(X, i), _ => exports.VType)), P => exports.VAbsE('p', exports.VPiEE('i', I, i => exports.VPiE('x', exports.vappE(X, i), x => exports.vappEs([P, i, x]))), p => exports.VAbsEE('i', I, i => exports.VAbsE('xs', exports.vInterpI(I, d, X, i), xs => exports.velimprim('allI', d, [I, X, P, p, i, xs]))))))));
        }
        if (t.name === 'indI') {
            return exports.VAbsEE('I', exports.VType, I => exports.VAbsE('d', exports.videsc(I), d => exports.VAbsEE('P', exports.VPiE('i', I, i => exports.VPiE('_', exports.vidata(I, d, i), _ => exports.VType)), P => exports.VAbsE('h', exports.VPiEE('i', I, i => exports.VPiE('y', exports.vInterpI(I, d, exports.vappEs([exports.VIData, I, d]), i), y => exports.VPiE('_', exports.vAllI(I, d, exports.vappEs([exports.VIData, I,]), P, i, y), _ => exports.vappEs([P, i, exports.vicon(I, d, i, y)])))), h => exports.VAbsEE('i', I, i => exports.VAbsE('x', exports.vidata(I, d, i), x => exports.velimprim('indI', x, [I, d, P, h, i])))))));
        }
        return exports.VPrim(t.name);
    }
    return t;
};
exports.evaluate = evaluate;
const quoteHead = (h, k) => {
    if (h.tag === 'HVar')
        return core_1.Var(k - (h.index + 1));
    if (h.tag === 'HPrim')
        return core_1.Prim(h.name);
    if (h.tag === 'HMeta')
        return core_1.Meta(h.index);
    return h;
};
const quoteElim = (t, e, k, full) => {
    if (e.tag === 'EApp')
        return core_1.App(t, e.mode, exports.quote(e.right, k, full));
    if (e.tag === 'EProj')
        return core_1.Proj(e.proj, t);
    if (e.tag === 'EPrim') {
        if (e.name === 'InterpI' || e.name === 'AllI' || e.name === 'allI') {
            const first = exports.quote(e.args[0], k, full);
            return e.args.slice(1).reduce((x, y) => core_1.AppE(x, exports.quote(y, k, full)), core_1.AppE(core_1.AppE(core_1.Prim(e.name), first), t));
        }
        return core_1.AppE(e.args.reduce((x, y) => core_1.AppE(x, exports.quote(y, k, full)), core_1.Prim(e.name)), t);
    }
    return e;
};
const quote = (v_, k, full = false) => {
    const v = exports.force(v_, false);
    if (v.tag === 'VNe')
        return list_1.foldr((x, y) => quoteElim(y, x, k, full), quoteHead(v.head, k), v.spine);
    if (v.tag === 'VGlobal') {
        if (full || config_1.config.unfold.includes(v.head))
            return exports.quote(lazy_1.forceLazy(v.val), k, full);
        return list_1.foldr((x, y) => quoteElim(y, x, k, full), core_1.Global(v.head), v.args);
    }
    if (v.tag === 'VPair')
        return core_1.Pair(exports.quote(v.fst, k, full), exports.quote(v.snd, k, full), exports.quote(v.type, k, full));
    if (v.tag === 'VAbs')
        return core_1.Abs(v.mode, v.erased, v.name, exports.quote(v.type, k, full), exports.quote(exports.vinst(v, exports.VVar(k)), k + 1, full));
    if (v.tag === 'VPi')
        return core_1.Pi(v.mode, v.erased, v.name, exports.quote(v.type, k, full), exports.quote(exports.vinst(v, exports.VVar(k)), k + 1, full));
    if (v.tag === 'VSigma')
        return core_1.Sigma(v.erased, v.name, exports.quote(v.type, k, full), exports.quote(exports.vinst(v, exports.VVar(k)), k + 1, full));
    if (v.tag === 'VData')
        return core_1.DataDef(exports.quote(v.index, k, full), v.cons.map(x => exports.quote(x, k, full)));
    if (v.tag === 'VTCon')
        return core_1.TCon(exports.quote(v.data, k, full), v.args.map(x => exports.quote(x, k, full)));
    return v;
};
exports.quote = quote;
const normalize = (t, full = false) => exports.quote(exports.evaluate(t, list_1.Nil), 0, full);
exports.normalize = normalize;
const zonkSpine = (tm, vs, k, full) => {
    if (tm.tag === 'Meta') {
        const s = context_1.getMeta(tm.index);
        if (s.tag === 'Unsolved')
            return [true, exports.zonk(tm, vs, k, full)];
        return [false, s.val];
    }
    if (tm.tag === 'App') {
        const spine = zonkSpine(tm.left, vs, k, full);
        return spine[0] ?
            [true, core_1.App(spine[1], tm.mode, exports.zonk(tm.right, vs, k, full))] :
            [false, exports.vapp(spine[1], tm.mode, exports.evaluate(tm.right, vs))];
    }
    return [true, exports.zonk(tm, vs, k, full)];
};
const zonk = (tm, vs = list_1.Nil, k = 0, full = false) => {
    if (tm.tag === 'Meta') {
        const s = context_1.getMeta(tm.index);
        return s.tag === 'Solved' ? exports.quote(s.val, k, full) : tm;
    }
    if (tm.tag === 'Pi')
        return core_1.Pi(tm.mode, tm.erased, tm.name, exports.zonk(tm.type, vs, k, full), exports.zonk(tm.body, list_1.Cons(exports.VVar(k), vs), k + 1, full));
    if (tm.tag === 'Sigma')
        return core_1.Sigma(tm.erased, tm.name, exports.zonk(tm.type, vs, k, full), exports.zonk(tm.body, list_1.Cons(exports.VVar(k), vs), k + 1, full));
    if (tm.tag === 'Data')
        return core_1.DataDef(exports.zonk(tm.index, vs, k, full), tm.cons.map(x => exports.zonk(x, vs, k, full)));
    if (tm.tag === 'TCon')
        return core_1.TCon(exports.zonk(tm.data, vs, k, full), tm.args.map(x => exports.zonk(x, vs, k, full)));
    if (tm.tag === 'Let')
        return core_1.Let(tm.erased, tm.name, exports.zonk(tm.type, vs, k, full), exports.zonk(tm.val, vs, k, full), exports.zonk(tm.body, list_1.Cons(exports.VVar(k), vs), k + 1, full));
    if (tm.tag === 'Abs')
        return core_1.Abs(tm.mode, tm.erased, tm.name, exports.zonk(tm.type, vs, k, full), exports.zonk(tm.body, list_1.Cons(exports.VVar(k), vs), k + 1, full));
    if (tm.tag === 'Pair')
        return core_1.Pair(exports.zonk(tm.fst, vs, k, full), exports.zonk(tm.snd, vs, k, full), exports.zonk(tm.type, vs, k, full));
    if (tm.tag === 'Proj')
        return core_1.Proj(tm.proj, exports.zonk(tm.term, vs, k, full));
    if (tm.tag === 'App') {
        const spine = zonkSpine(tm.left, vs, k, full);
        return spine[0] ?
            core_1.App(spine[1], tm.mode, exports.zonk(tm.right, vs, k, full)) :
            exports.quote(exports.vapp(spine[1], tm.mode, exports.evaluate(tm.right, vs)), k, full);
    }
    return tm;
};
exports.zonk = zonk;
const showVal = (v, k = 0, full = false) => core_1.show(exports.quote(v, k, full));
exports.showVal = showVal;
const showValZ = (v, vs = list_1.Nil, k = 0, full = false) => core_1.show(exports.zonk(exports.quote(v, k, full), vs, k, full));
exports.showValZ = showValZ;

},{"./base":1,"./config":2,"./context":3,"./core":5,"./globals":10,"./utils/lazy":19,"./utils/list":20,"./utils/utils":21}],23:[function(require,module,exports){
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
addResult('repl');
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

},{"./repl":14}],24:[function(require,module,exports){

},{}]},{},[23]);
