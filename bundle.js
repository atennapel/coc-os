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
const util_1 = require("../util");
const list_1 = require("../list");
const values_1 = require("./values");
const terms_1 = require("./terms");
exports.cvapp = (a, b) => {
    if (a.tag === 'CVAbs')
        return a.body(b);
    if (a.tag === 'CVNe')
        return values_1.CVNe(a.head, list_1.Cons(b, a.args));
    return util_1.impossible('cvapp');
};
exports.cevaluate = (t, henv, vs = list_1.Nil) => {
    if (t.tag === 'CType')
        return t;
    if (t.tag === 'CVar') {
        const v = list_1.index(vs, t.index);
        return v || util_1.impossible('evaluate cvar');
    }
    if (t.tag === 'CApp')
        return exports.cvapp(exports.cevaluate(t.left, henv, vs), exports.cevaluate(t.right, henv, vs));
    if (t.tag === 'CAbs')
        return values_1.CVAbs(exports.cevaluate(t.type, henv, vs), v => exports.cevaluate(t.body, henv, list_1.Cons(v, vs)));
    if (t.tag === 'CPi')
        return values_1.CVPi(exports.cevaluate(t.type, henv, vs), v => exports.cevaluate(t.body, henv, list_1.Cons(v, vs)));
    if (t.tag === 'CLet')
        return exports.cevaluate(t.body, henv, list_1.Cons(exports.cevaluate(t.value, henv, vs), vs));
    if (t.tag === 'CHash') {
        const r = henv[t.hash];
        if (!r)
            return util_1.impossible(`no val of hash: #${t.hash}`);
        return r.opaque ? values_1.CVNe(t) : r.value;
    }
    return util_1.impossible('cevaluate');
};
exports.cquote = (v, k = 0) => {
    if (v.tag === 'CType')
        return v;
    if (v.tag === 'CVNe')
        return list_1.foldr((x, y) => terms_1.CApp(y, x), v.head.tag === 'CHash' ? v.head : terms_1.CVar(k - (v.head.index + 1)), list_1.map(v.args, x => exports.cquote(x, k)));
    if (v.tag === 'CVAbs')
        return terms_1.CAbs(exports.cquote(v.type, k), exports.cquote(v.body(values_1.CVVar(k)), k + 1));
    if (v.tag === 'CVPi')
        return terms_1.CPi(exports.cquote(v.type, k), exports.cquote(v.body(values_1.CVVar(k)), k + 1));
    return util_1.impossible('cquote');
};
exports.cnormalize = (t, henv, vs = list_1.Nil, k = 0) => exports.cquote(exports.cevaluate(t, henv, vs), k);

},{"../list":14,"../util":17,"./terms":3,"./values":5}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util");
exports.CVar = (index) => ({ tag: 'CVar', index });
exports.CAbs = (type, body) => ({ tag: 'CAbs', type, body });
exports.CApp = (left, right) => ({ tag: 'CApp', left, right });
exports.CLet = (type, value, body) => ({ tag: 'CLet', type, value, body });
exports.CPi = (type, body) => ({ tag: 'CPi', type, body });
exports.CType = { tag: 'CType' };
exports.CHash = (hash) => ({ tag: 'CHash', hash });
exports.showCore = (t) => {
    if (t.tag === 'CVar')
        return `${t.index}`;
    if (t.tag === 'CAbs')
        return `(\\${exports.showCore(t.type)}. ${exports.showCore(t.body)})`;
    if (t.tag === 'CApp')
        return `(${exports.showCore(t.left)} ${exports.showCore(t.right)})`;
    if (t.tag === 'CLet')
        return `(let ${exports.showCore(t.type)} = ${exports.showCore(t.value)} in ${exports.showCore(t.body)})`;
    if (t.tag === 'CPi')
        return `(${exports.showCore(t.type)} -> ${exports.showCore(t.body)})`;
    if (t.tag === 'CType')
        return '*';
    if (t.tag === 'CHash')
        return `#${t.hash}`;
    return util_1.impossible('showCore');
};

},{"../util":17}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const values_1 = require("./values");
const util_1 = require("../util");
const nbe_1 = require("./nbe");
const terms_1 = require("./terms");
const list_1 = require("../list");
const cheadeq = (a, b) => {
    if (a === b)
        return true;
    if (a.tag === 'CVar')
        return b.tag === 'CVar' && a.index === b.index;
    if (a.tag === 'CHash')
        return b.tag === 'CHash' && a.hash === b.hash;
    return false;
};
exports.eqtype = (k, a, b) => {
    if (a.tag === 'CType' && b.tag === 'CType')
        return;
    if (a.tag === 'CVAbs' && b.tag === 'CVAbs') {
        exports.eqtype(k, a.type, b.type);
        const v = values_1.CVVar(k);
        return exports.eqtype(k + 1, a.body(v), a.body(v));
    }
    if (a.tag === 'CVAbs') {
        const v = values_1.CVVar(k);
        return exports.eqtype(k + 1, a.body(v), nbe_1.cvapp(b, v));
    }
    if (b.tag === 'CVAbs') {
        const v = values_1.CVVar(k);
        return exports.eqtype(k + 1, nbe_1.cvapp(a, v), b.body(v));
    }
    if (a.tag === 'CVPi' && b.tag === 'CVPi') {
        exports.eqtype(k, a.type, b.type);
        const v = values_1.CVVar(k);
        return exports.eqtype(k + 1, a.body(v), a.body(v));
    }
    if (a.tag === 'CVNe' && b.tag === 'CVNe' && cheadeq(a.head, b.head))
        return list_1.zipWith_((x, y) => exports.eqtype(k, x, y), a.args, b.args);
    return util_1.terr(`typecheck failed: ${terms_1.showCore(nbe_1.cquote(b, k))} ~ ${terms_1.showCore(nbe_1.cquote(a, k))}`);
};
const check = (henv, tenv, venv, k, t, ty) => {
    if (t.tag === 'CLet') {
        check(henv, tenv, venv, k, t.type, terms_1.CType);
        const vty = nbe_1.cevaluate(t.type, henv, venv);
        check(henv, tenv, venv, k, t.value, vty);
        check(henv, list_1.Cons(vty, tenv), list_1.Cons(nbe_1.cevaluate(t.value, henv, venv), venv), k + 1, t.body, ty);
        return;
    }
    const ty2 = synth(henv, tenv, venv, k, t);
    exports.eqtype(k, ty2, ty);
};
const synth = (henv, tenv, venv, k, t) => {
    if (t.tag === 'CType')
        return terms_1.CType;
    if (t.tag === 'CVar')
        return list_1.index(tenv, t.index) || util_1.terr(`var out of scope ${t.index}`);
    if (t.tag === 'CAbs') {
        check(henv, tenv, venv, k, t.type, terms_1.CType);
        const type = nbe_1.cevaluate(t.type, henv, venv);
        const rt = synth(henv, list_1.Cons(type, tenv), list_1.Cons(values_1.CVVar(k), venv), k + 1, t.body);
        return nbe_1.cevaluate(terms_1.CPi(t.type, nbe_1.cquote(rt, k + 1)), henv, venv);
    }
    if (t.tag === 'CPi') {
        check(henv, tenv, venv, k, t.type, terms_1.CType);
        check(henv, list_1.Cons(nbe_1.cevaluate(t.type, henv, venv), tenv), list_1.Cons(values_1.CVVar(k), venv), k + 1, t.body, terms_1.CType);
        return terms_1.CType;
    }
    if (t.tag === 'CApp') {
        const ta = synth(henv, tenv, venv, k, t.left);
        return synthapp(henv, tenv, venv, k, ta, t.right);
    }
    if (t.tag === 'CLet') {
        check(henv, tenv, venv, k, t.type, terms_1.CType);
        const vty = nbe_1.cevaluate(t.type, henv, venv);
        check(henv, tenv, venv, k, t.value, vty);
        return synth(henv, list_1.Cons(vty, tenv), list_1.Cons(nbe_1.cevaluate(t.value, henv, venv), venv), k + 1, t.body);
    }
    if (t.tag === 'CHash') {
        const r = henv[t.hash];
        if (!r)
            return util_1.terr(`undefined hash ${terms_1.showCore(t)}`);
        return r.type;
    }
    return util_1.terr(`cannot synth ${terms_1.showCore(t)}`);
};
const synthapp = (henv, tenv, venv, k, ta, b) => {
    if (ta.tag === 'CVPi') {
        check(henv, tenv, venv, k, b, ta.type);
        return ta.body(nbe_1.cevaluate(b, henv, venv));
    }
    return util_1.terr(`invalid type in synthapp: ${terms_1.showCore(nbe_1.cquote(ta, k))}`);
};
exports.typecheck = (henv, t) => {
    const ty = synth(henv, list_1.Nil, list_1.Nil, 0, t);
    return nbe_1.cquote(ty);
};

},{"../list":14,"../util":17,"./nbe":2,"./terms":3,"./values":5}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const terms_1 = require("./terms");
const list_1 = require("../list");
exports.CVNe = (head, args = list_1.Nil) => ({ tag: 'CVNe', head, args });
exports.CVVar = (index) => exports.CVNe(terms_1.CVar(index), list_1.Nil);
exports.CVHash = (hash) => exports.CVNe(terms_1.CHash(hash), list_1.Nil);
exports.CVAbs = (type, body) => ({ tag: 'CVAbs', type, body });
exports.CVPi = (type, body) => ({ tag: 'CVPi', type, body });

},{"../list":14,"./terms":3}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./env");
const terms_1 = require("./terms");
const values_1 = require("./values");
const util_1 = require("../util");
const list_1 = require("../list");
const nbe_1 = require("./nbe");
const unify_1 = require("./unify");
const config_1 = require("../config");
;
const check = (henv, env, tm, ty_) => {
    config_1.log(() => `check ${terms_1.showTerm(tm)} : ${terms_1.showTerm(nbe_1.quote(ty_, env.vals))} in ${env_1.showEnvT(env.types)}`);
    const ty = nbe_1.force(ty_);
    if (tm.tag === 'Abs' && !tm.type && ty.tag === 'VPi') {
        const x = env_1.fresh(env.vals, tm.name);
        const v = values_1.VVar(x);
        return terms_1.Abs(x, check(henv, {
            vals: list_1.Cons(env_1.DefV(x, v), env.vals),
            types: list_1.Cons(env_1.BoundT(x, ty.type), env.types),
        }, tm.body, ty.body(v)), nbe_1.quote(ty.type, env.vals));
    }
    if (tm.tag === 'Let') {
        const [val, tty, vty] = synthLetValue(henv, env, tm.value, tm.type);
        const body = check(henv, {
            vals: list_1.Cons(env_1.DefV(tm.name, nbe_1.evaluate(val, henv, env.vals)), env.vals),
            types: list_1.Cons(env_1.DefT(tm.name, vty), env.types),
        }, tm.body, ty);
        return terms_1.Let(tm.name, val, body, tty);
    }
    if (tm.tag === 'Hole')
        return unify_1.newMeta(env.types);
    const [etm, ity] = synth(henv, env, tm);
    unify_1.unify(env.vals, ity, ty);
    return etm;
};
const synth = (henv, env, tm) => {
    config_1.log(() => `synth ${terms_1.showTerm(tm)} in ${env_1.showEnvT(env.types)}`);
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
        const ty = check(henv, env, tm.type, terms_1.Type);
        const vty = nbe_1.evaluate(ty, henv, env.vals);
        const term = check(henv, {
            vals: list_1.Cons(env_1.BoundV(tm.name), env.vals),
            types: list_1.Cons(env_1.BoundT(tm.name, vty), env.types),
        }, tm.body, terms_1.Type);
        return [terms_1.Pi(tm.name, ty, term), terms_1.Type];
    }
    if (tm.tag === 'Ann') {
        const ty = check(henv, env, tm.type, terms_1.Type);
        const vty = nbe_1.evaluate(ty, henv, env.vals);
        const term = check(henv, env, tm.term, vty);
        return [term, vty];
    }
    if (tm.tag === 'App') {
        const [l, ty] = synth(henv, env, tm.left);
        const [r, rty] = synthapp(henv, env, ty, tm.right);
        return [terms_1.App(l, r), rty];
    }
    if (tm.tag === 'Abs' && tm.type) {
        const ty = check(henv, env, tm.type, terms_1.Type);
        const vty = nbe_1.evaluate(ty, henv, env.vals);
        const venv = list_1.Cons(env_1.BoundV(tm.name), env.vals);
        const [body, rty] = synth(henv, {
            vals: venv,
            types: list_1.Cons(env_1.BoundT(tm.name, vty), env.types),
        }, tm.body);
        return [
            terms_1.Abs(tm.name, body, ty),
            nbe_1.evaluate(terms_1.Pi(tm.name, ty, nbe_1.quote(rty, venv)), henv, env.vals),
        ];
    }
    if (tm.tag === 'Abs' && !tm.type) {
        const ty = unify_1.newMeta(env.types);
        const vty = nbe_1.evaluate(ty, henv, env.vals);
        const rty = unify_1.newMeta(list_1.Cons(env_1.BoundT(tm.name, vty), env.types));
        const tpi = nbe_1.evaluate(terms_1.Pi(tm.name, ty, rty), henv, env.vals);
        const term = check(henv, env, tm, tpi);
        return [term, tpi];
    }
    if (tm.tag === 'Let') {
        const [val, ty, vty] = synthLetValue(henv, env, tm.value, tm.type);
        const [body, rty] = synth(henv, {
            vals: list_1.Cons(env_1.DefV(tm.name, nbe_1.evaluate(val, henv, env.vals)), env.vals),
            types: list_1.Cons(env_1.DefT(tm.name, vty), env.types),
        }, tm.body);
        return [terms_1.Let(tm.name, val, body, ty), rty];
    }
    if (tm.tag === 'Hash') {
        const r = henv[tm.hash];
        if (!r)
            return util_1.terr(`undefined hash ${terms_1.showTerm(tm)}`);
        return [tm, r.type];
    }
    if (tm.tag === 'Hole')
        return [unify_1.newMeta(env.types), nbe_1.evaluate(unify_1.newMeta(env.types), henv, env.vals)];
    return util_1.terr(`cannot synth ${terms_1.showTerm(tm)}`);
};
const synthLetValue = (henv, env, val, ty) => {
    if (ty) {
        const ety = check(henv, env, ty, terms_1.Type);
        const vty = nbe_1.evaluate(ety, henv, env.vals);
        const ev = check(henv, env, val, vty);
        return [ev, ety, vty];
    }
    else {
        const [ev, vty] = synth(henv, env, val);
        return [ev, nbe_1.quote(vty, env.vals), vty];
    }
};
const synthapp = (henv, env, ty_, tm) => {
    config_1.log(() => `synthapp ${terms_1.showTerm(nbe_1.quote(ty_, env.vals))} @ ${terms_1.showTerm(tm)} in ${env_1.showEnvT(env.types)}`);
    const ty = nbe_1.force(ty_);
    if (ty.tag === 'VPi') {
        const arg = check(henv, env, tm, ty.type);
        const varg = nbe_1.evaluate(arg, henv, env.vals);
        return [arg, ty.body(varg)];
    }
    return util_1.terr(`expected a function type but got ${terms_1.showTerm(nbe_1.quote(ty, env.vals))}`);
};
exports.elaborate = (henv, tm, env = { vals: list_1.Nil, types: list_1.Nil }) => {
    terms_1.resetMetaId();
    const [etm, ty] = synth(henv, env, tm);
    return [
        unify_1.zonk(etm, {}, env.vals),
        unify_1.zonk(nbe_1.quote(nbe_1.force(ty), env.vals), {}, env.vals),
    ];
};

},{"../config":1,"../list":14,"../util":17,"./env":7,"./nbe":8,"./terms":10,"./unify":12,"./values":13}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const names_1 = require("../names");
const list_1 = require("../list");
const terms_1 = require("./terms");
const nbe_1 = require("./nbe");
exports.BoundV = (name) => ({ tag: 'BoundV', name });
exports.DefV = (name, value) => ({ tag: 'DefV', name, value });
exports.BoundT = (name, type) => ({ tag: 'BoundT', name, type });
exports.DefT = (name, type) => ({ tag: 'DefT', name, type });
exports.fresh = (e, x) => names_1.freshName(list_1.map(e, y => y.name), x);
exports.lookupV = (l, x) => list_1.first(l, e => e.name === x);
exports.lookupT = (l, x) => list_1.first(l, e => e.name === x);
exports.showEnvT = (l, vs = list_1.Nil) => list_1.toString(l, e => `${e.tag === 'BoundT' ? '' : ':'}${e.name} : ${terms_1.showTerm(nbe_1.quote(e.type, vs))}`);

},{"../list":14,"../names":15,"./nbe":8,"./terms":10}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const values_1 = require("./values");
const util_1 = require("../util");
const list_1 = require("../list");
const env_1 = require("./env");
const terms_1 = require("./terms");
exports.vapp = (a, b) => {
    if (a.tag === 'VAbs')
        return a.body(b);
    if (a.tag === 'VNe')
        return values_1.VNe(a.head, list_1.Cons(b, a.args));
    return util_1.impossible('vapp');
};
exports.force = (v) => {
    if (v.tag === 'VNe' && v.head.tag === 'Meta' && v.head.term)
        return exports.force(list_1.foldr((x, y) => exports.vapp(y, x), v.head.term, v.args));
    return v;
};
exports.evaluate = (t, henv, vs = list_1.Nil) => {
    if (t.tag === 'Type')
        return t;
    if (t.tag === 'Var') {
        const v = env_1.lookupV(vs, t.name);
        return v ? (v.tag === 'DefV' ? v.value : values_1.VNe(t)) :
            util_1.impossible('evaluate var');
    }
    if (t.tag === 'App')
        return exports.vapp(exports.evaluate(t.left, henv, vs), exports.evaluate(t.right, henv, vs));
    if (t.tag === 'Abs')
        // TODO: fix when meta solving considers types
        return values_1.VAbs(t.name, t.type ? exports.evaluate(t.type, henv, vs) : terms_1.Type, v => exports.evaluate(t.body, henv, list_1.Cons(env_1.DefV(t.name, v), vs)));
    if (t.tag === 'Pi')
        return values_1.VPi(t.name, exports.evaluate(t.type, henv, vs), v => exports.evaluate(t.body, henv, list_1.Cons(env_1.DefV(t.name, v), vs)));
    if (t.tag === 'Let')
        return exports.evaluate(t.body, henv, list_1.Cons(env_1.DefV(t.name, exports.evaluate(t.value, henv, vs)), vs));
    if (t.tag === 'Meta')
        return t.term || values_1.VNe(t);
    if (t.tag === 'Hash') {
        const r = henv[t.hash];
        if (!r)
            return util_1.impossible(`no val of hash: #${t.hash}`);
        return r.opaque ? values_1.VNe(t) : r.value;
    }
    return util_1.impossible('evaluate');
};
exports.quote = (v_, vs = list_1.Nil) => {
    const v = exports.force(v_);
    if (v.tag === 'Type')
        return v;
    if (v.tag === 'VNe')
        return list_1.foldr((v, a) => terms_1.App(a, exports.quote(v, vs)), v.head, v.args);
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
exports.normalize = (t, henv, vs = list_1.Nil) => exports.quote(exports.evaluate(t, henv, vs), vs);

},{"../list":14,"../util":17,"./env":7,"./terms":10,"./values":13}],9:[function(require,module,exports){
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
            if (ts.length < 3)
                return err(`invalid let`);
            const x = ts[1];
            if (x.tag !== 'Name')
                return err(`invalid let name`);
            const rest = exprs(ts.slice(3));
            return terms_1.Let(x.name, expr(ts[2]), rest);
        }
        if (x === 'lett') {
            if (ts.length < 4)
                return err(`invalid lett`);
            const x = ts[1];
            if (x.tag !== 'Name')
                return err(`invalid let name`);
            const rest = exprs(ts.slice(4));
            return terms_1.Let(x.name, expr(ts[3]), rest, expr(ts[2]));
        }
    }
    return terms_1.appFrom(ts.map(expr));
};
const expr = (t) => {
    if (t.tag === 'List')
        return exprs(t.list);
    const x = t.name;
    if (x[0] === '#')
        return terms_1.Hash(x.slice(1));
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

},{"./terms":10}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util");
exports.Var = (name) => ({ tag: 'Var', name });
exports.Abs = (name, body, type) => ({ tag: 'Abs', name, body, type });
exports.abs = (ns, body) => ns.reduceRight((b, x) => exports.Abs(x, b), body);
exports.absty = (ns, body) => ns.reduceRight((b, [x, t]) => exports.Abs(x, b, t), body);
exports.App = (left, right) => ({ tag: 'App', left, right });
exports.appFrom = (ts) => ts.reduce(exports.App);
exports.app = (...ts) => exports.appFrom(ts);
exports.app1 = (f, as) => as.reduce(exports.App, f);
exports.Let = (name, value, body, type) => ({ tag: 'Let', name, value, body, type });
exports.Ann = (term, type) => ({ tag: 'Ann', term, type });
exports.Pi = (name, type, body) => ({ tag: 'Pi', name, type, body });
exports.funFrom = (ts) => ts.reduceRight((x, y) => exports.Pi('_', y, x));
exports.fun = (...ts) => exports.funFrom(ts);
exports.Type = { tag: 'Type' };
exports.Hash = (hash) => ({ tag: 'Hash', hash });
exports.Hole = { tag: 'Hole' };
let metaId = 0;
exports.resetMetaId = () => { metaId = 0; };
exports.freshMeta = () => ({ tag: 'Meta', id: metaId++, term: null });
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
    if (t.tag === 'Hole')
        return '_';
    if (t.tag === 'Meta')
        return `?${t.term ? '!' : ''}${t.id}`;
    if (t.tag === 'Hash')
        return `#${t.hash}`;
    return util_1.impossible('showTerm');
};

},{"../util":17}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const terms_1 = require("./terms");
const terms_2 = require("../core/terms");
const util_1 = require("../util");
const list_1 = require("../list");
exports.toCore = (t, k = 0, ns = list_1.Nil) => {
    if (t.tag === 'Type')
        return terms_2.CType;
    if (t.tag === 'Hash')
        return terms_2.CHash(t.hash);
    if (t.tag === 'Var') {
        const i = list_1.lookup(ns, t.name);
        return i === null ? util_1.impossible('toCore var') : terms_2.CVar(k - i - 1);
    }
    if (t.tag === 'Abs' && t.type)
        return terms_2.CAbs(exports.toCore(t.type, k, ns), exports.toCore(t.body, k + 1, list_1.Cons([t.name, k], ns)));
    if (t.tag === 'Pi')
        return terms_2.CPi(exports.toCore(t.type, k, ns), exports.toCore(t.body, k + 1, list_1.Cons([t.name, k], ns)));
    if (t.tag === 'App')
        return terms_2.CApp(exports.toCore(t.left, k, ns), exports.toCore(t.right, k, ns));
    if (t.tag === 'Let' && t.type)
        return terms_2.CLet(exports.toCore(t.type, k, ns), exports.toCore(t.value, k, ns), exports.toCore(t.body, k + 1, list_1.Cons([t.name, k], ns)));
    if (t.tag === 'Abs')
        return util_1.impossible(`untyped abstraction in toCore: ${terms_1.showTerm(t)}`);
    if (t.tag === 'Let')
        return util_1.impossible(`untyped let in toCore: ${terms_1.showTerm(t)}`);
    if (t.tag === 'Hole')
        return util_1.impossible(`hole in toCore: ${terms_1.showTerm(t)}`);
    if (t.tag === 'Ann')
        return util_1.impossible(`annotation in toCore: ${terms_1.showTerm(t)}`);
    if (t.tag === 'Meta')
        return util_1.impossible(`meta in toCore: ${terms_1.showTerm(t)}`);
    return util_1.impossible('toCore');
};

},{"../core/terms":3,"../list":14,"../util":17,"./terms":10}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./env");
const values_1 = require("./values");
const util_1 = require("../util");
const terms_1 = require("./terms");
const nbe_1 = require("./nbe");
const list_1 = require("../list");
const config_1 = require("../config");
const checkSpine = (sp) => list_1.map(sp, x_ => {
    const x = nbe_1.force(x_);
    return x.tag === 'VNe' && x.head.tag === 'Var' && x.args.tag === 'Nil' ?
        x.head.name : util_1.terr(`non-var in meta spine`);
});
const checkSolution = (m, sp, t) => {
    if (t.tag === 'Type')
        return;
    if (t.tag === 'Var') {
        if (!list_1.contains(sp, t.name))
            return util_1.terr(`scope error: ${t.name}`);
        return;
    }
    if (t.tag === 'App') {
        checkSolution(m, sp, t.left);
        checkSolution(m, sp, t.right);
        return;
    }
    if (t.tag === 'Abs') {
        checkSolution(m, list_1.Cons(t.name, sp), t.body);
        if (t.type)
            checkSolution(m, sp, t.type);
        return;
    }
    if (t.tag === 'Pi') {
        checkSolution(m, list_1.Cons(t.name, sp), t.body);
        checkSolution(m, sp, t.type);
        return;
    }
    if (t.tag === 'Meta') {
        if (t === m)
            return util_1.terr(`occurs failed: ${terms_1.showTerm(m)}`);
        return;
    }
    return util_1.impossible('checkSolution');
};
const solve = (vs, m, sp_, rhs_) => {
    const sp = checkSpine(sp_);
    const rhs = nbe_1.quote(rhs_, vs);
    const sparr = list_1.toArray(sp, x => x).reverse();
    config_1.log(() => `try (${terms_1.showTerm(m)} ${sparr.join(' ')}) := ${terms_1.showTerm(rhs)}`);
    checkSolution(m, sp, rhs);
    // TODO: add types to the parameters of the solution
    const sol = terms_1.abs(sparr, rhs);
    config_1.log(() => `${terms_1.showTerm(m)} := ${terms_1.showTerm(terms_1.abs(sparr, rhs))}`);
    m.term = nbe_1.evaluate(sol, {});
};
const eqHead = (a, b) => {
    if (a === b)
        return true;
    if (a.tag === 'Var')
        return b.tag === 'Var' && a.name === b.name;
    if (a.tag === 'Hash')
        return b.tag === 'Hash' && a.hash === b.hash;
    return false;
};
exports.unify = (vs, a_, b_) => {
    config_1.log(() => `unify ${terms_1.showTerm(nbe_1.quote(a_, vs))} ~ ${terms_1.showTerm(nbe_1.quote(b_, vs))}`);
    const a = nbe_1.force(a_);
    const b = nbe_1.force(b_);
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
    if (a.tag === 'VNe' && b.tag === 'VNe' && eqHead(a.head, b.head))
        return list_1.zipWith_((x, y) => exports.unify(vs, x, y), a.args, b.args);
    if (a.tag === 'VNe' && a.head.tag === 'Meta')
        return solve(vs, a.head, a.args, b);
    if (b.tag === 'VNe' && b.head.tag === 'Meta')
        return solve(vs, b.head, b.args, a);
    return util_1.terr(`cannot unify ${terms_1.showTerm(nbe_1.quote(a, vs))} ~ ${terms_1.showTerm(nbe_1.quote(b, vs))}`);
};
exports.newMeta = (ts) => terms_1.app1(terms_1.freshMeta(), list_1.toArray(ts, x => x).reverse().filter(e => e.tag === 'BoundT')
    .map(e => terms_1.Var(e.name)));
const L = (v) => [false, v];
const R = (v) => [true, v];
const either = (e, l, r) => e[0] ? r(e[1]) : l(e[1]);
const zonkApp = (henv, vs, t) => {
    if (t.tag === 'Meta')
        return t.term ? L(t.term) : R(t);
    if (t.tag === 'App')
        return either(zonkApp(henv, vs, t.left), x => L(nbe_1.vapp(x, nbe_1.evaluate(t.right, henv, vs))), x => R(terms_1.App(x, exports.zonk(t.right, henv, vs))));
    return R(exports.zonk(t, henv, vs));
};
exports.zonk = (tm, henv, vs = list_1.Nil) => {
    if (tm.tag === 'Var')
        return tm;
    if (tm.tag === 'Meta')
        return tm.term ? nbe_1.quote(tm.term, vs) : tm;
    if (tm.tag === 'Type')
        return tm;
    if (tm.tag === 'Abs')
        return terms_1.Abs(tm.name, exports.zonk(tm.body, henv, list_1.Cons(env_1.BoundV(tm.name), vs)), tm.type && exports.zonk(tm.type, henv, vs));
    if (tm.tag === 'Pi')
        return terms_1.Pi(tm.name, exports.zonk(tm.type, henv, vs), exports.zonk(tm.body, henv, list_1.Cons(env_1.BoundV(tm.name), vs)));
    if (tm.tag === 'Let')
        return terms_1.Let(tm.name, exports.zonk(tm.value, henv, vs), exports.zonk(tm.body, henv, list_1.Cons(env_1.BoundV(tm.name), vs)), tm.type && exports.zonk(tm.type, henv, vs));
    if (tm.tag === 'App')
        return either(zonkApp(henv, vs, tm.left), x => nbe_1.quote(nbe_1.vapp(x, nbe_1.evaluate(tm.right, henv, vs)), vs), x => terms_1.App(x, exports.zonk(tm.right, henv, vs)));
    if (tm.tag === 'Hash')
        return tm;
    return util_1.impossible(`zonk`);
};

},{"../config":1,"../list":14,"../util":17,"./env":7,"./nbe":8,"./terms":10,"./values":13}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const terms_1 = require("./terms");
const list_1 = require("../list");
exports.VNe = (head, args = list_1.Nil) => ({ tag: 'VNe', head, args });
exports.VVar = (name) => exports.VNe(terms_1.Var(name), list_1.Nil);
exports.VHash = (hash) => exports.VNe(terms_1.Hash(hash), list_1.Nil);
exports.VAbs = (name, type, body) => ({ tag: 'VAbs', name, type, body });
exports.VPi = (name, type, body) => ({ tag: 'VPi', name, type, body });

},{"../list":14,"./terms":10}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const list_1 = require("./list");
exports.splitName = (x) => {
    const s = x.split('$');
    return [s[0], +s[1]];
};
exports.freshName = (l, x) => {
    if (x === '_')
        return x;
    const map = {};
    list_1.each(l, x => map[x] = true);
    let y = exports.splitName(x)[0];
    while (map[y]) {
        if (y.indexOf('$') >= 0) {
            const [z, n] = exports.splitName(y);
            y = `${z}\$${n + 1}`;
        }
        else {
            y = `${y}\$0`;
        }
    }
    return x;
};

},{"./list":14}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nbe_1 = require("./language/nbe");
const elaborate_1 = require("./language/elaborate");
const parser_1 = require("./language/parser");
const terms_1 = require("./language/terms");
const config_1 = require("./config");
const terms_2 = require("./core/terms");
const translation_1 = require("./language/translation");
const typecheck_1 = require("./core/typecheck");
const nbe_2 = require("./core/nbe");
const util_1 = require("./util");
const v = terms_1.Var;
exports.replenv = {
    Nat: {
        value: terms_1.Pi('t', terms_1.Type, terms_1.fun(v('t'), terms_1.fun(v('t'), v('t')), v('t'))),
        type: terms_1.Type,
        opaque: true,
    },
    z: {
        value: terms_1.absty([['t', terms_1.Type], ['z', v('t')], ['s', terms_1.fun(v('t'), v('t'))]], v('z')),
        type: terms_1.Hash('Nat'),
    },
    s: {
        value: terms_1.absty([['n', terms_1.Hash('Nat')], ['t', terms_1.Type], ['z', v('t')], ['s', terms_1.fun(v('t'), v('t'))]], terms_1.app(v('s'), terms_1.app(v('n'), v('t'), v('z'), v('s')))),
        type: terms_1.fun(terms_1.Hash('Nat'), terms_1.Hash('Nat')),
    },
    iterNat: {
        value: terms_1.absty([['x', terms_1.Hash('Nat')]], v('x')),
        type: terms_1.fun(terms_1.Hash('Nat'), terms_1.Pi('t', terms_1.Type, terms_1.fun(v('t'), terms_1.fun(v('t'), v('t')), v('t')))),
    },
};
exports.henv = util_1.mapobj(exports.replenv, ({ value, type, opaque }, e) => ({
    value: nbe_1.evaluate(value, e),
    type: nbe_1.evaluate(type, e),
    opaque,
}));
exports.chenv = util_1.mapobj(exports.replenv, ({ value, type, opaque }, e) => ({
    value: nbe_2.cevaluate(translation_1.toCore(value), e),
    type: nbe_2.cevaluate(translation_1.toCore(type), e),
    opaque,
}));
exports.initREPL = () => { };
exports.runREPL = (_s, _cb) => {
    try {
        if (_s === ':debug') {
            config_1.config.debug = !config_1.config.debug;
            return _cb(`debug is now ${config_1.config.debug}`);
        }
        const tm = parser_1.parse(_s);
        console.log(`inpt: ${terms_1.showTerm(tm)}`);
        const [term, type] = elaborate_1.elaborate(exports.henv, tm);
        console.log(`term: ${terms_1.showTerm(term)}`);
        console.log(`type: ${terms_1.showTerm(type)}`);
        const nf = nbe_1.normalize(term, exports.henv);
        console.log(`nmfm: ${terms_1.showTerm(nf)}`);
        const core = translation_1.toCore(term);
        const cty = typecheck_1.typecheck(exports.chenv, core);
        console.log(`core: ${terms_2.showCore(core)} : ${terms_2.showCore(cty)}`);
        const cnf = nbe_2.cnormalize(core, exports.chenv);
        console.log(`conf: ${terms_2.showCore(cnf)}`);
        return _cb(`${terms_1.showTerm(term)} : ${terms_1.showTerm(type)} ~>\n${terms_1.showTerm(nf)} ~>\n${terms_2.showCore(core)} : ${terms_2.showCore(cty)} ~>\n${terms_2.showCore(cnf)}`);
    }
    catch (err) {
        return _cb('' + err, true);
    }
};

},{"./config":1,"./core/nbe":2,"./core/terms":3,"./core/typecheck":4,"./language/elaborate":6,"./language/nbe":8,"./language/parser":9,"./language/terms":10,"./language/translation":11,"./util":17}],17:[function(require,module,exports){
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
        n[k] = f(o[k], n);
    return n;
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

},{"./repl":16}]},{},[18]);
