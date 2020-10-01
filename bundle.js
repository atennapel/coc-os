(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.setConfig = exports.config = void 0;
exports.config = {
    debug: false,
    showEnvs: false,
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
exports.contextSolved = exports.amountOfProblems = exports.allProblems = exports.problemsBlockedBy = exports.postpone = exports.solveMeta = exports.isMetaSolved = exports.getMeta = exports.freshMeta = exports.resetContext = exports.Solved = exports.Unsolved = void 0;
const utils_1 = require("./utils/utils");
exports.Unsolved = (type) => ({ tag: 'Unsolved', type });
exports.Solved = (val, type) => ({ tag: 'Solved', val, type });
const Blocked = (k, a, b, blockedBy) => ({ k, a, b, blockedBy });
const Context = (metas = [], blocked = []) => ({ metas, blocked });
let context = Context();
exports.resetContext = () => {
    context = Context();
};
exports.freshMeta = (type) => {
    const id = context.metas.length;
    context.metas[id] = exports.Unsolved(type);
    return id;
};
exports.getMeta = (id) => {
    const s = context.metas[id];
    if (!s)
        return utils_1.impossible(`undefined meta ?${id} in metaGet`);
    return s;
};
exports.isMetaSolved = (id) => exports.getMeta(id).tag === 'Solved';
exports.solveMeta = (id, val) => {
    const s = exports.getMeta(id);
    if (s.tag === 'Solved')
        return utils_1.impossible(`meta already solved: ?${id}`);
    context.metas[id] = exports.Solved(val, s.type);
};
exports.postpone = (k, a, b, blockedBy) => {
    context.blocked.push(Blocked(k, a, b, blockedBy));
};
exports.problemsBlockedBy = (m) => {
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
exports.allProblems = () => {
    const blocked = context.blocked;
    context.blocked = [];
    return blocked;
};
exports.amountOfProblems = () => context.blocked.length;
exports.contextSolved = () => context.metas.every(s => s.tag === 'Solved') && context.blocked.length === 0;

},{"./utils/utils":13}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conv = exports.eqHead = void 0;
const config_1 = require("./config");
const list_1 = require("./utils/list");
const utils_1 = require("./utils/utils");
const values_1 = require("./values");
exports.eqHead = (a, b) => {
    if (a === b)
        return true;
    if (a.tag === 'HVar')
        return b.tag === 'HVar' && a.index === b.index;
    if (a.tag === 'HMeta')
        return b.tag === 'HMeta' && a.index === b.index;
    return a;
};
const convElim = (k, a, b, x, y) => {
    if (a === b)
        return;
    if (a.tag === 'EApp' && b.tag === 'EApp' && a.mode === b.mode)
        return exports.conv(k, a.right, b.right);
    if (a.tag === 'EProj' && b.tag === 'EProj' && a.proj === b.proj)
        return;
    return utils_1.terr(`conv failed (${k}): ${values_1.showVal(x, k)} ~ ${values_1.showVal(y, k)}`);
};
exports.conv = (k, a, b) => {
    config_1.log(() => `conv(${k}): ${values_1.showVal(a, k)} ~ ${values_1.showVal(b, k)}`);
    if (a === b)
        return;
    if (a.tag === 'VType' && b.tag === 'VType')
        return;
    if (a.tag === 'VPi' && b.tag === 'VPi' && a.mode === b.mode) {
        exports.conv(k, a.type, b.type);
        const v = values_1.VVar(k);
        return exports.conv(k + 1, values_1.vinst(a, v), values_1.vinst(b, v));
    }
    if (a.tag === 'VSigma' && b.tag === 'VSigma') {
        exports.conv(k, a.type, b.type);
        const v = values_1.VVar(k);
        return exports.conv(k + 1, values_1.vinst(a, v), values_1.vinst(b, v));
    }
    if (a.tag === 'VAbs' && b.tag === 'VAbs' && a.mode === b.mode) {
        const v = values_1.VVar(k);
        return exports.conv(k + 1, values_1.vinst(a, v), values_1.vinst(b, v));
    }
    if (a.tag === 'VPair' && b.tag === 'VPair') {
        exports.conv(k, a.fst, b.fst);
        return exports.conv(k, a.snd, b.snd);
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
    if (a.tag === 'VNe' && b.tag === 'VNe' && exports.eqHead(a.head, b.head))
        return list_1.zipWithR_((x, y) => convElim(k, x, y, a, b), a.spine, b.spine);
    return utils_1.terr(`conv failed (${k}): ${values_1.showVal(a, k)} ~ ${values_1.showVal(b, k)}`);
};

},{"./config":1,"./utils/list":12,"./utils/utils":13,"./values":14}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eq = exports.show = exports.showMode = exports.Meta = exports.Sigma = exports.Pi = exports.Type = exports.Let = exports.Proj = exports.Pair = exports.Abs = exports.App = exports.Var = exports.ImplUnif = exports.Expl = void 0;
exports.Expl = 'Expl';
exports.ImplUnif = 'ImplUnif';
exports.Var = (index) => ({ tag: 'Var', index });
exports.App = (left, mode, right) => ({ tag: 'App', left, mode, right });
exports.Abs = (mode, name, type, body) => ({ tag: 'Abs', name, mode, type, body });
exports.Pair = (fst, snd, type) => ({ tag: 'Pair', fst, snd, type });
exports.Proj = (proj, term) => ({ tag: 'Proj', proj, term });
exports.Let = (name, type, val, body) => ({ tag: 'Let', name, type, val, body });
exports.Type = { tag: 'Type' };
exports.Pi = (mode, name, type, body) => ({ tag: 'Pi', mode, name, type, body });
exports.Sigma = (name, type, body) => ({ tag: 'Sigma', name, type, body });
exports.Meta = (index) => ({ tag: 'Meta', index });
exports.showMode = (m) => m === 'ImplUnif' ? 'impl' : '';
exports.show = (t) => {
    if (t.tag === 'Type')
        return '*';
    if (t.tag === 'Var')
        return `${t.index}`;
    if (t.tag === 'Meta')
        return `?${t.index}`;
    if (t.tag === 'App')
        return `(${exports.show(t.left)} ${t.mode === exports.ImplUnif ? '{' : ''}${exports.show(t.right)}${t.mode === exports.ImplUnif ? '}' : ''})`;
    if (t.tag === 'Abs')
        return `(${t.mode === exports.ImplUnif ? '{' : '('}${t.name} : ${exports.show(t.type)}${t.mode === exports.ImplUnif ? '}' : ')'} -> ${exports.show(t.body)})`;
    if (t.tag === 'Pair')
        return `(${exports.show(t.fst)}, ${exports.show(t.snd)} : ${exports.show(t.type)})`;
    if (t.tag === 'Proj')
        return `(${t.proj} ${exports.show(t.term)})`;
    if (t.tag === 'Let')
        return `(let ${t.name} : ${exports.show(t.type)} = ${exports.show(t.val)} in ${exports.show(t.body)})`;
    if (t.tag === 'Pi')
        return `(/${t.mode === exports.ImplUnif ? '{' : '('}${t.name} : ${exports.show(t.type)}${t.mode === exports.ImplUnif ? '}' : ')'}. ${exports.show(t.body)})`;
    if (t.tag === 'Sigma')
        return `((${t.name} : ${exports.show(t.type)}) ** ${exports.show(t.body)})`;
    return t;
};
exports.eq = (t, o) => {
    if (t.tag === 'Type')
        return o.tag === 'Type';
    if (t.tag === 'Var')
        return o.tag === 'Var' && t.index === o.index;
    if (t.tag === 'Meta')
        return o.tag === 'Meta' && t.index === o.index;
    if (t.tag === 'App')
        return o.tag === 'App' && exports.eq(t.left, o.left) && exports.eq(t.right, o.right);
    if (t.tag === 'Abs')
        return o.tag === 'Abs' && exports.eq(t.type, o.type) && exports.eq(t.body, o.body);
    if (t.tag === 'Pair')
        return o.tag === 'Pair' && exports.eq(t.fst, o.snd) && exports.eq(t.fst, o.snd);
    if (t.tag === 'Proj')
        return o.tag === 'Proj' && t.proj === o.proj && exports.eq(t.term, o.term);
    if (t.tag === 'Let')
        return o.tag === 'Let' && exports.eq(t.type, o.type) && exports.eq(t.val, o.val) && exports.eq(t.body, o.body);
    if (t.tag === 'Pi')
        return o.tag === 'Pi' && exports.eq(t.type, o.type) && exports.eq(t.body, o.body);
    if (t.tag === 'Sigma')
        return o.tag === 'Sigma' && exports.eq(t.type, o.type) && exports.eq(t.body, o.body);
    return t;
};

},{}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.elaborate = void 0;
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
const EntryT = (type, bound, mode, inserted) => ({ type, bound, mode, inserted });
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
const Local = (index, ns, nsSurface, ts, vs) => ({ index, ns, nsSurface, ts, vs });
const localEmpty = Local(0, list_1.Nil, list_1.Nil, list_1.Nil, list_1.Nil);
const localExtend = (local, name, ty, mode, bound = true, inserted = false, val = values_1.VVar(local.index)) => Local(local.index + 1, list_1.Cons(name, local.ns), inserted ? local.nsSurface : list_1.Cons(name, local.nsSurface), list_1.Cons(EntryT(ty, bound, mode, inserted), local.ts), list_1.Cons(val, local.vs));
const showVal = (local, val) => S.showValZ(val, local.vs, local.index, local.ns);
const selectName = (a, b) => a === '_' ? b : a;
const constructMetaType = (l, b, k) => l.tag === 'Cons' ? core_1.Pi(l.head[2].mode, l.head[1], values_1.quote(l.head[2].type, k), constructMetaType(l.tail, b, k + 1)) : values_1.quote(b, k);
const newMeta = (local, ty) => {
    const zipped = list_1.zipWithIndex((x, y, i) => [i, x, y], local.ns, local.ts);
    const boundOnly = list_1.filter(zipped, ([_, __, ty]) => ty.bound);
    config_1.log(() => `new meta spine: ${list_1.listToString(boundOnly, ([i, x, entry]) => `${i} | ${x} | ${showVal(local, entry.type)}`)}`);
    const spine = list_1.map(boundOnly, x => [x[2].mode, core_1.Var(x[0])]);
    config_1.log(() => `new meta spine: ${list_1.listToString(spine, ([m, t]) => m === C.ImplUnif ? `{${C.show(t)}}` : C.show(t))}`);
    config_1.log(() => `${local.index}`);
    const mty = constructMetaType(list_1.reverse(boundOnly), ty, local.index - list_1.length(spine));
    config_1.log(() => `new meta type: ${C.show(mty)}`);
    const vmty = values_1.evaluate(mty, list_1.Nil);
    return list_1.foldr(([m, x], y) => core_1.App(y, m, x), core_1.Meta(context_1.freshMeta(vmty)), spine);
};
const inst = (local, ty_) => {
    const ty = values_1.force(ty_);
    if (ty.tag === 'VPi' && ty.mode === C.ImplUnif) {
        const m = newMeta(local, ty.type);
        const vm = values_1.evaluate(m, local.vs);
        const [res, args] = inst(local, values_1.vinst(ty, vm));
        return [res, list_1.Cons(m, args)];
    }
    return [ty, list_1.Nil];
};
const check = (local, tm, ty) => {
    config_1.log(() => `check ${surface_1.show(tm)} : ${showVal(local, ty)}`);
    if (tm.tag === 'Hole') {
        const x = newMeta(local, ty);
        return x;
    }
    const fty = values_1.force(ty);
    if (tm.tag === 'Abs' && !tm.type && fty.tag === 'VPi' && tm.mode === fty.mode) {
        const v = values_1.VVar(local.index);
        const x = selectName(tm.name, fty.name);
        const body = check(localExtend(local, x, fty.type, tm.mode, true, false, v), tm.body, values_1.vinst(fty, v));
        return core_1.Abs(tm.mode, x, values_1.quote(fty.type, local.index), body);
    }
    if (fty.tag === 'VPi' && fty.mode === C.ImplUnif) {
        const v = values_1.VVar(local.index);
        const term = check(localExtend(local, fty.name, fty.type, fty.mode, true, true, v), tm, values_1.vinst(fty, v));
        return core_1.Abs(fty.mode, fty.name, values_1.quote(fty.type, local.index), term);
    }
    if (tm.tag === 'Pair' && fty.tag === 'VSigma') {
        const fst = check(local, tm.fst, fty.type);
        const snd = check(local, tm.snd, values_1.vinst(fty, values_1.evaluate(fst, local.vs)));
        return core_1.Pair(fst, snd, values_1.quote(ty, local.index));
    }
    if (tm.tag === 'Let') {
        let type;
        let ty;
        let val;
        if (tm.type) {
            type = check(local, tm.type, values_1.VType);
            ty = values_1.evaluate(type, local.vs);
            val = check(local, tm.val, ty);
        }
        else {
            [val, ty] = synth(local, tm.val);
            type = values_1.quote(ty, local.index);
        }
        const v = values_1.evaluate(val, local.vs);
        const body = check(localExtend(local, tm.name, ty, C.Expl, false, false, v), tm.body, ty);
        return core_1.Let(tm.name, type, val, body);
    }
    const [term, ty2] = synth(local, tm);
    const [ty2inst, ms] = inst(local, ty2);
    return utils_1.tryT(() => {
        config_1.log(() => `unify ${showVal(local, ty2inst)} ~ ${showVal(local, ty)}`);
        unification_1.unify(local.index, ty2inst, ty);
        return list_1.foldl((a, m) => core_1.App(a, C.ImplUnif, m), term, ms);
    }, e => utils_1.terr(`check failed (${surface_1.show(tm)}): ${showVal(local, ty2)} ~ ${showVal(local, ty)}: ${e}`));
};
const freshPi = (local, mode, x) => {
    const a = newMeta(local, values_1.VType);
    const va = values_1.evaluate(a, local.vs);
    const b = newMeta(localExtend(local, '_', va, mode), values_1.VType);
    return values_1.evaluate(core_1.Pi(mode, x, a, b), local.vs);
};
const synth = (local, tm) => {
    config_1.log(() => `synth ${surface_1.show(tm)}`);
    if (tm.tag === 'Type')
        return [core_1.Type, values_1.VType];
    if (tm.tag === 'Var') {
        const i = list_1.indexOf(local.nsSurface, tm.name);
        const [entry, j] = indexT(local.ts, i) || utils_1.terr(`var out of scope ${surface_1.show(tm)}`);
        return [core_1.Var(j), entry.type];
    }
    if (tm.tag === 'App') {
        const [left, ty] = synth(local, tm.left);
        const [right, rty, ms] = synthapp(local, ty, tm.mode, tm.right);
        return [core_1.App(list_1.foldl((f, a) => core_1.App(f, C.ImplUnif, a), left, ms), tm.mode, right), rty];
    }
    if (tm.tag === 'Abs' && tm.type) {
        if (tm.type) {
            const type = check(local, tm.type, values_1.VType);
            const ty = values_1.evaluate(type, local.vs);
            const [body, rty] = synth(localExtend(local, tm.name, ty, tm.mode), tm.body);
            const pi = values_1.evaluate(core_1.Pi(tm.mode, tm.name, type, values_1.quote(rty, local.index + 1)), local.vs);
            return [core_1.Abs(tm.mode, tm.name, type, body), pi];
        }
        else {
            const pi = freshPi(local, tm.mode, tm.name);
            const term = check(local, tm, pi);
            return [term, pi];
        }
    }
    if (tm.tag === 'Pair') {
        const [fst, fstty] = synth(local, tm.fst);
        const [snd, sndty] = synth(local, tm.snd);
        const ty = core_1.Sigma('_', values_1.quote(fstty, local.index), values_1.quote(sndty, local.index + 1));
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
            return [core_1.Proj('fst', c), t.type];
        }
    }
    if (tm.tag === 'Pi') {
        const type = check(local, tm.type, values_1.VType);
        const ty = values_1.evaluate(type, local.vs);
        const body = check(localExtend(local, tm.name, ty, tm.mode), tm.body, values_1.VType);
        return [core_1.Pi(tm.mode, tm.name, type, body), values_1.VType];
    }
    if (tm.tag === 'Sigma') {
        const type = check(local, tm.type, values_1.VType);
        const ty = values_1.evaluate(type, local.vs);
        const body = check(localExtend(local, tm.name, ty, C.Expl), tm.body, values_1.VType);
        return [core_1.Sigma(tm.name, type, body), values_1.VType];
    }
    if (tm.tag === 'Let') {
        let type;
        let ty;
        let val;
        if (tm.type) {
            type = check(local, tm.type, values_1.VType);
            ty = values_1.evaluate(type, local.vs);
            val = check(local, tm.val, ty);
        }
        else {
            [val, ty] = synth(local, tm.val);
            type = values_1.quote(ty, local.index);
        }
        const v = values_1.evaluate(val, local.vs);
        const [body, rty] = synth(localExtend(local, tm.name, ty, C.Expl, false, false, v), tm.body);
        return [core_1.Let(tm.name, type, val, body), rty];
    }
    if (tm.tag === 'Hole') {
        const t = newMeta(local, values_1.VType);
        const vt = values_1.evaluate(newMeta(local, values_1.evaluate(t, local.vs)), local.vs);
        return [t, vt];
    }
    return utils_1.terr(`unable to synth ${surface_1.show(tm)}`);
};
const synthapp = (local, ty, mode, tm) => {
    config_1.log(() => `synthapp ${showVal(local, ty)} @${mode === C.ImplUnif ? 'impl' : ''} ${surface_1.show(tm)}`);
    const fty = values_1.force(ty);
    if (fty.tag === 'VPi' && fty.mode === mode) {
        const term = check(local, tm, fty.type);
        const v = values_1.evaluate(term, local.vs);
        return [term, values_1.vinst(fty, v), list_1.Nil];
    }
    if (fty.tag === 'VPi' && fty.mode === C.ImplUnif && mode === C.Expl) {
        const m = newMeta(local, fty.type);
        const vm = values_1.evaluate(m, local.vs);
        const [rest, rt, l] = synthapp(local, values_1.vinst(fty, vm), mode, tm);
        return [rest, rt, list_1.Cons(m, l)];
    }
    if (ty.tag === 'VNe' && ty.head.tag === 'HMeta') {
        const mty = context_1.getMeta(ty.head.index).type;
        const a = context_1.freshMeta(mty);
        const b = context_1.freshMeta(mty);
        const pi = values_1.evaluate(core_1.Pi(mode, '_', values_1.quote(values_1.VNe(values_1.HMeta(a), ty.spine), local.index), values_1.quote(values_1.VNe(values_1.HMeta(b), ty.spine), local.index + 1)), local.vs);
        unification_1.unify(local.index, ty, pi);
        return synthapp(local, pi, mode, tm);
    }
    return utils_1.terr(`not a correct pi type in synthapp: ${showVal(local, ty)} @${mode === C.ImplUnif ? 'impl' : ''} ${surface_1.show(tm)}`);
};
const tryToSolveBlockedProblems = () => {
    if (context_1.amountOfProblems() > 0) {
        let changed = true;
        while (changed) {
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
exports.elaborate = (t) => {
    context_1.resetContext();
    const [tm, ty] = synth(localEmpty, t);
    tryToSolveBlockedProblems();
    const ztm = values_1.zonk(tm);
    const zty = values_1.zonk(values_1.quote(ty, 0));
    if (!context_1.contextSolved())
        return utils_1.terr(`not all metas are solved: ${S.showCore(ztm)} : ${S.showCore(zty)}`);
    return [ztm, zty];
};

},{"./config":1,"./context":2,"./core":4,"./surface":9,"./unification":11,"./utils/list":12,"./utils/utils":13,"./values":14}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chooseName = exports.nextName = void 0;
const list_1 = require("./utils/list");
exports.nextName = (x) => {
    if (x === '_')
        return x;
    const s = x.split('$');
    if (s.length === 2)
        return `${s[0]}\$${+s[1] + 1}`;
    return `${x}\$0`;
};
exports.chooseName = (x, ns) => x === '_' ? x : list_1.contains(ns, x) ? exports.chooseName(exports.nextName(x), ns) : x;

},{"./utils/list":12}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = void 0;
const utils_1 = require("./utils/utils");
const surface_1 = require("./surface");
const core_1 = require("./core");
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
const SYM1 = ['\\', ':', '*', '=', ','];
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
            else if (/[\.\?\@\#\%\_a-z]/i.test(c))
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
const tunit = surface_1.Var('UnitType');
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
        if (x === '_')
            return [surface_1.Hole, false];
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
            if (c.tag === 'Name' && c.name === 'in') {
                found = true;
                break;
            }
            vals.push(c);
        }
        if (!found)
            return utils_1.serr(`no in after let`);
        if (vals.length === 0)
            return utils_1.serr(`empty val in let`);
        const val = exprs(vals, '(');
        const body = exprs(ts.slice(i + 1), '(');
        if (ty)
            return surface_1.Let(name, ty, val, body);
        return surface_1.Let(name, null, val, body);
    }
    const i = ts.findIndex(x => isName(x, ':'));
    if (i >= 0) {
        const a = ts.slice(0, i);
        const b = ts.slice(i + 1);
        return surface_1.Let('x', exprs(b, '('), exprs(a, '('), surface_1.Var('x'));
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
        return args.reduceRight((x, [name, impl, ty]) => surface_1.Abs(impl ? core_1.ImplUnif : core_1.Expl, name, ty, x), body);
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
        return args.reduceRight((x, [name, impl, ty]) => surface_1.Pi(impl ? core_1.ImplUnif : core_1.Expl, name, ty, x), body);
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
        return args.slice(0, -2).reduceRight((x, [y, p]) => surface_1.Pair(y, x), lastitem);
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
        const lastitem = surface_1.Sigma(last[0], last[2], body[0]);
        return args.slice(0, -1).reduceRight((x, [name, impl, ty]) => surface_1.Sigma(name, ty, x), lastitem);
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
exports.parse = (s) => {
    const ts = tokenize(s);
    const ex = exprs(ts, '(');
    return ex;
};

},{"./core":4,"./surface":9,"./utils/utils":13}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runREPL = exports.initREPL = void 0;
const config_1 = require("./config");
const elaboration_1 = require("./elaboration");
const parser_1 = require("./parser");
const surface_1 = require("./surface");
const C = require("./core");
const typecheck_1 = require("./typecheck");
const values_1 = require("./values");
exports.initREPL = () => {
};
exports.runREPL = (s, cb) => {
    try {
        if (s === ':d' || s === ':debug') {
            const d = !config_1.config.debug;
            config_1.setConfig({ debug: d });
            return cb(`debug: ${d}`);
        }
        const term = parser_1.parse(s);
        config_1.log(() => surface_1.show(term));
        config_1.log(() => 'ELABORATE');
        const [eterm, etype] = elaboration_1.elaborate(term);
        config_1.log(() => C.show(eterm));
        config_1.log(() => surface_1.showCore(eterm));
        config_1.log(() => C.show(etype));
        config_1.log(() => surface_1.showCore(etype));
        config_1.log(() => 'TYPECHECK');
        const ttype = typecheck_1.typecheck(eterm);
        config_1.log(() => C.show(ttype));
        config_1.log(() => surface_1.showCore(ttype));
        config_1.log(() => 'NORMALIZE');
        const norm = values_1.normalize(eterm);
        config_1.log(() => C.show(norm));
        config_1.log(() => surface_1.showCore(norm));
        return cb(`term: ${surface_1.show(term)}\ntype: ${surface_1.showCore(etype)}\netrm: ${surface_1.showCore(eterm)}\nnorm: ${surface_1.showCore(norm)}`);
    }
    catch (err) {
        return cb(`${err}`, true);
    }
};

},{"./config":1,"./core":4,"./elaboration":5,"./parser":7,"./surface":9,"./typecheck":10,"./values":14}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showValZ = exports.showCoreZ = exports.showVal = exports.showCore = exports.toSurface = exports.show = exports.flattenPair = exports.flattenSigma = exports.flattenPi = exports.flattenAbs = exports.flattenApp = exports.Hole = exports.Meta = exports.Sigma = exports.Pi = exports.Type = exports.Let = exports.Proj = exports.Pair = exports.Abs = exports.App = exports.Var = exports.PCore = exports.PIndex = exports.PName = void 0;
const names_1 = require("./names");
const C = require("./core");
const values_1 = require("./values");
const list_1 = require("./utils/list");
const utils_1 = require("./utils/utils");
exports.PName = (name) => ({ tag: 'PName', name });
exports.PIndex = (index) => ({ tag: 'PIndex', index });
exports.PCore = (proj) => ({ tag: 'PCore', proj });
exports.Var = (name) => ({ tag: 'Var', name });
exports.App = (left, mode, right) => ({ tag: 'App', left, mode, right });
exports.Abs = (mode, name, type, body) => ({ tag: 'Abs', mode, name, type, body });
exports.Pair = (fst, snd) => ({ tag: 'Pair', fst, snd });
exports.Proj = (proj, term) => ({ tag: 'Proj', proj, term });
exports.Let = (name, type, val, body) => ({ tag: 'Let', name, type, val, body });
exports.Type = { tag: 'Type' };
exports.Pi = (mode, name, type, body) => ({ tag: 'Pi', mode, name, type, body });
exports.Sigma = (name, type, body) => ({ tag: 'Sigma', name, type, body });
exports.Meta = (index) => ({ tag: 'Meta', index });
exports.Hole = { tag: 'Hole' };
exports.flattenApp = (t) => {
    const r = [];
    while (t.tag === 'App') {
        r.push([t.mode, t.right]);
        t = t.left;
    }
    return [t, r.reverse()];
};
exports.flattenAbs = (t) => {
    const r = [];
    while (t.tag === 'Abs') {
        r.push([t.name, t.mode, t.type]);
        t = t.body;
    }
    return [r, t];
};
exports.flattenPi = (t) => {
    const r = [];
    while (t.tag === 'Pi') {
        r.push([t.name, t.mode, t.type]);
        t = t.body;
    }
    return [r, t];
};
exports.flattenSigma = (t) => {
    const r = [];
    while (t.tag === 'Sigma') {
        r.push([t.name, t.type]);
        t = t.body;
    }
    return [r, t];
};
exports.flattenPair = (t) => {
    const r = [];
    while (t.tag === 'Pair') {
        r.push(t.fst);
        t = t.snd;
    }
    r.push(t);
    return r;
};
const showP = (b, t) => b ? `(${exports.show(t)})` : exports.show(t);
const isSimple = (t) => t.tag === 'Var' || t.tag === 'Type' || t.tag === 'Meta' || t.tag === 'Hole' || (t.tag === 'Proj' && isSimple(t.term));
exports.show = (t) => {
    if (t.tag === 'Var')
        return t.name;
    if (t.tag === 'Type')
        return '*';
    if (t.tag === 'Meta')
        return `?${t.index}`;
    if (t.tag === 'Hole')
        return '_';
    if (t.tag === 'App') {
        const [f, as] = exports.flattenApp(t);
        return `${showP(!isSimple(f), f)} ${as.map(([m, t], i) => m === C.ImplUnif ? `{${exports.show(t)}}` : showP(!isSimple(t) && !(t.tag === 'Abs' && i >= as.length), t)).join(' ')}`;
    }
    if (t.tag === 'Abs') {
        const [as, b] = exports.flattenAbs(t);
        return `\\${as.map(([x, m, t]) => !t ?
            (m === C.ImplUnif ? `{${x}}` : x) :
            `${m === C.ImplUnif ? '{' : '('}${x} : ${exports.show(t)}${m === C.ImplUnif ? '}' : ')'}`).join(' ')}. ${exports.show(b)}`;
    }
    if (t.tag === 'Pi') {
        const [as, b] = exports.flattenPi(t);
        return `${as.map(([x, m, t]) => x === '_' ?
            (m === C.ImplUnif ? `{${exports.show(t)}}` : showP(!isSimple(t) && t.tag !== 'App', t)) :
            `${m === C.ImplUnif ? '{' : '('}${x} : ${exports.show(t)}${m === C.ImplUnif ? '}' : ')'}`).join(' -> ')} -> ${exports.show(b)}`;
    }
    if (t.tag === 'Let')
        return `let ${t.name}${t.type ? ` : ${showP(t.type.tag === 'Let', t.type)}` : ''} = ${showP(t.val.tag === 'Let', t.val)} in ${exports.show(t.body)}`;
    if (t.tag === 'Sigma') {
        const [as, b] = exports.flattenSigma(t);
        return `${as.map(([x, t]) => x === '_' ? showP(t.tag === 'Abs' || t.tag === 'Let' || t.tag === 'Pi' || t.tag === 'Sigma', t) : `${x} : ${showP(t.tag === 'Let', t)}`).join(' ** ')} ** ${showP(b.tag === 'Let', b)}`;
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
    return t;
};
exports.toSurface = (t, ns = list_1.Nil) => {
    if (t.tag === 'Type')
        return exports.Type;
    if (t.tag === 'Meta')
        return exports.Meta(t.index);
    if (t.tag === 'Var')
        return exports.Var(list_1.index(ns, t.index) || utils_1.impossible(`toSurface: index out of scope: ${t.index}`));
    if (t.tag === 'App')
        return exports.App(exports.toSurface(t.left, ns), t.mode, exports.toSurface(t.right, ns));
    if (t.tag === 'Pair')
        return exports.Pair(exports.toSurface(t.fst, ns), exports.toSurface(t.snd, ns));
    if (t.tag === 'Proj')
        return exports.Proj(exports.PCore(t.proj), exports.toSurface(t.term, ns));
    if (t.tag === 'Abs') {
        const x = names_1.chooseName(t.name, ns);
        return exports.Abs(t.mode, x, exports.toSurface(t.type, ns), exports.toSurface(t.body, list_1.Cons(x, ns)));
    }
    if (t.tag === 'Pi') {
        const x = names_1.chooseName(t.name, ns);
        return exports.Pi(t.mode, x, exports.toSurface(t.type, ns), exports.toSurface(t.body, list_1.Cons(x, ns)));
    }
    if (t.tag === 'Sigma') {
        const x = names_1.chooseName(t.name, ns);
        return exports.Sigma(x, exports.toSurface(t.type, ns), exports.toSurface(t.body, list_1.Cons(x, ns)));
    }
    if (t.tag === 'Let') {
        const x = names_1.chooseName(t.name, ns);
        return exports.Let(x, exports.toSurface(t.type, ns), exports.toSurface(t.val, ns), exports.toSurface(t.body, list_1.Cons(x, ns)));
    }
    return t;
};
exports.showCore = (t, ns = list_1.Nil) => exports.show(exports.toSurface(t, ns));
exports.showVal = (v, k = 0, ns = list_1.Nil) => exports.show(exports.toSurface(values_1.quote(v, k), ns));
exports.showCoreZ = (t, vs = list_1.Nil, k = 0, ns = list_1.Nil) => exports.show(exports.toSurface(values_1.zonk(t, vs, k), ns));
exports.showValZ = (v, vs = list_1.Nil, k = 0, ns = list_1.Nil) => exports.show(exports.toSurface(values_1.zonk(values_1.quote(v, k), vs, k), ns));

},{"./core":4,"./names":6,"./utils/list":12,"./utils/utils":13,"./values":14}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typecheck = void 0;
const config_1 = require("./config");
const conversion_1 = require("./conversion");
const core_1 = require("./core");
const list_1 = require("./utils/list");
const utils_1 = require("./utils/utils");
const values_1 = require("./values");
const Local = (index, ts, vs) => ({ index, ts, vs });
const localEmpty = Local(0, list_1.Nil, list_1.Nil);
const localExtend = (local, ty, val = values_1.VVar(local.index)) => Local(local.index + 1, list_1.Cons(ty, local.ts), list_1.Cons(val, local.vs));
const showVal = (local, val) => values_1.showValZ(val, local.vs, local.index);
const check = (local, tm, ty) => {
    config_1.log(() => `check ${core_1.show(tm)} : ${showVal(local, ty)}`);
    const ty2 = synth(local, tm);
    utils_1.tryT(() => conversion_1.conv(local.index, ty2, ty), e => utils_1.terr(`check failed (${core_1.show(tm)}): ${showVal(local, ty2)} ~ ${showVal(local, ty)}: ${e}`));
};
const synth = (local, tm) => {
    config_1.log(() => `synth ${core_1.show(tm)}`);
    if (tm.tag === 'Type')
        return values_1.VType;
    if (tm.tag === 'Var') {
        const ty = list_1.index(local.ts, tm.index);
        if (!ty)
            return utils_1.terr(`undefined index ${tm.index}`);
        return ty;
    }
    if (tm.tag === 'App') {
        const ty = synth(local, tm.left);
        return synthapp(local, ty, tm.mode, tm.right);
    }
    if (tm.tag === 'Abs') {
        check(local, tm.type, values_1.VType);
        const ty = values_1.evaluate(tm.type, local.vs);
        const rty = synth(localExtend(local, ty), tm.body);
        return values_1.evaluate(core_1.Pi(tm.mode, tm.name, tm.type, values_1.quote(rty, local.index + 1)), local.vs);
    }
    if (tm.tag === 'Pair') {
        check(local, tm.type, values_1.VType);
        const ty = values_1.evaluate(tm.type, local.vs);
        if (ty.tag !== 'VSigma')
            return utils_1.terr(`not a sigma type in pair: ${core_1.show(tm)}`);
        check(local, tm.fst, ty.type);
        check(local, tm.snd, values_1.vinst(ty, values_1.evaluate(tm.fst, local.vs)));
        return ty;
    }
    if (tm.tag === 'Proj') {
        const fty = synth(local, tm.term);
        if (fty.tag !== 'VSigma')
            return utils_1.terr(`not a sigma type in ${tm.proj}: ${core_1.show(tm)}: ${showVal(local, fty)}`);
        return tm.proj === 'fst' ? fty.type : values_1.vinst(fty, values_1.vproj('fst', values_1.evaluate(tm.term, local.vs)));
    }
    if (tm.tag === 'Pi') {
        check(local, tm.type, values_1.VType);
        const ty = values_1.evaluate(tm.type, local.vs);
        check(localExtend(local, ty), tm.body, values_1.VType);
        return values_1.VType;
    }
    if (tm.tag === 'Sigma') {
        check(local, tm.type, values_1.VType);
        const ty = values_1.evaluate(tm.type, local.vs);
        check(localExtend(local, ty), tm.body, values_1.VType);
        return values_1.VType;
    }
    if (tm.tag === 'Let') {
        check(local, tm.type, values_1.VType);
        const ty = values_1.evaluate(tm.type, local.vs);
        check(local, tm.val, ty);
        const val = values_1.evaluate(tm.val, local.vs);
        return synth(localExtend(local, ty, val), tm.body);
    }
    return utils_1.terr(`synth failed: ${core_1.show(tm)}`);
};
const synthapp = (local, ty, mode, tm) => {
    config_1.log(() => `synthapp ${showVal(local, ty)} @${mode === core_1.ImplUnif ? 'impl' : ''} ${core_1.show(tm)}`);
    if (ty.tag === 'VPi' && ty.mode === mode) {
        check(local, tm, ty.type);
        const v = values_1.evaluate(tm, local.vs);
        return values_1.vinst(ty, v);
    }
    return utils_1.terr(`not a correct pi type in synthapp: ${showVal(local, ty)} @${mode === core_1.ImplUnif ? 'impl' : ''} ${core_1.show(tm)}`);
};
exports.typecheck = (t) => {
    const ty = synth(localEmpty, t);
    return values_1.quote(ty, 0);
};

},{"./config":1,"./conversion":3,"./core":4,"./utils/list":12,"./utils/utils":13,"./values":14}],11:[function(require,module,exports){
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
const unifyElim = (k, a, b, x, y) => {
    if (a === b)
        return;
    if (a.tag === 'EApp' && b.tag === 'EApp' && a.mode === b.mode)
        return exports.unify(k, a.right, b.right);
    if (a.tag === 'EProj' && b.tag === 'EProj' && a.proj === b.proj)
        return;
    return utils_1.terr(`unify failed (${k}): ${values_1.showVal(x, k)} ~ ${values_1.showVal(y, k)}`);
};
exports.unify = (k, a_, b_) => {
    const a = values_1.force(a_);
    const b = values_1.force(b_);
    config_1.log(() => `unify(${k}): ${values_1.showVal(a, k)} ~ ${values_1.showVal(b, k)}`);
    if (a === b)
        return;
    if (a.tag === 'VType' && b.tag === 'VType')
        return;
    if (a.tag === 'VPi' && b.tag === 'VPi' && a.mode === b.mode) {
        exports.unify(k, a.type, b.type);
        const v = values_1.VVar(k);
        return exports.unify(k + 1, values_1.vinst(a, v), values_1.vinst(b, v));
    }
    if (a.tag === 'VSigma' && b.tag === 'VSigma') {
        exports.unify(k, a.type, b.type);
        const v = values_1.VVar(k);
        return exports.unify(k + 1, values_1.vinst(a, v), values_1.vinst(b, v));
    }
    if (a.tag === 'VAbs' && b.tag === 'VAbs' && a.mode === b.mode) {
        const v = values_1.VVar(k);
        return exports.unify(k + 1, values_1.vinst(a, v), values_1.vinst(b, v));
    }
    if (a.tag === 'VPair' && b.tag === 'VPair') {
        exports.unify(k, a.fst, b.fst);
        return exports.unify(k, a.snd, b.snd);
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
    return utils_1.terr(`unify failed (${k}): ${values_1.showVal(a, k)} ~ ${values_1.showVal(b, k)}`);
};
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
        if (utils_1.hasDuplicates(list_1.toArray(spinex, x => x)))
            return utils_1.terr(`meta spine contains duplicates`);
        const rhs = values_1.quote(val, k);
        const body = checkSolution(k, m, spinex, rhs);
        config_1.log(() => `spine ${list_1.listToString(spinex, s => `${s}`)}`);
        const meta = context_1.getMeta(m);
        const type = meta.type;
        config_1.log(() => `meta type: ${values_1.showVal(type, 0)}`);
        const solution = constructSolution(0, type, body);
        config_1.log(() => `solution ?${m} := ${core_1.show(solution)}`);
        const vsolution = values_1.evaluate(solution, list_1.Nil);
        return context_1.solveMeta(m, vsolution);
    }, err => utils_1.terr(`failed to solve meta ${V.showVal(values_1.VMeta(m, spine), k)} := ${values_1.showVal(val, k)}: ${err.message}`));
    // try to solve blocked problems for the meta
    context_1.problemsBlockedBy(m).forEach(p => exports.unify(p.k, p.a, p.b));
};
const constructSolution = (k, ty_, body) => {
    const ty = values_1.force(ty_);
    if (ty.tag === 'VPi') {
        const v = values_1.VVar(k);
        return core_1.Abs(ty.mode, ty.name, values_1.quote(ty.type, k), constructSolution(k + 1, values_1.vinst(ty, v), body));
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
const checkSolution = (k, m, is, t) => {
    if (t.tag === 'Type')
        return t;
    if (t.tag === 'Var') {
        const i = k - t.index - 1;
        if (list_1.contains(is, i))
            return core_1.Var(list_1.indexOf(is, i));
        return utils_1.terr(`scope error ${t.index} (${i})`);
    }
    if (t.tag === 'Meta') {
        if (m === t.index)
            return utils_1.terr(`occurs check failed: ${core_1.show(t)}`);
        return t;
    }
    if (t.tag === 'App') {
        const l = checkSolution(k, m, is, t.left);
        const r = checkSolution(k, m, is, t.right);
        return core_1.App(l, t.mode, r);
    }
    if (t.tag === 'Pair') {
        const fst = checkSolution(k, m, is, t.fst);
        const snd = checkSolution(k, m, is, t.snd);
        const type = checkSolution(k, m, is, t.type);
        return core_1.Pair(fst, snd, type);
    }
    if (t.tag === 'Proj') {
        const x = checkSolution(k, m, is, t.term);
        return core_1.Proj(t.proj, x);
    }
    if (t.tag === 'Abs') {
        const ty = checkSolution(k, m, is, t.type);
        const body = checkSolution(k + 1, m, list_1.Cons(k, is), t.body);
        return core_1.Abs(t.mode, t.name, ty, body);
    }
    if (t.tag === 'Pi') {
        const ty = checkSolution(k, m, is, t.type);
        const body = checkSolution(k + 1, m, list_1.Cons(k, is), t.body);
        return core_1.Pi(t.mode, t.name, ty, body);
    }
    if (t.tag === 'Sigma') {
        const ty = checkSolution(k, m, is, t.type);
        const body = checkSolution(k + 1, m, list_1.Cons(k, is), t.body);
        return core_1.Sigma(t.name, ty, body);
    }
    return utils_1.impossible(`checkSolution ?${m}: non-normal term: ${core_1.show(t)}`);
};

},{"./config":1,"./context":2,"./conversion":3,"./core":4,"./utils/list":12,"./utils/utils":13,"./values":14}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.last = exports.max = exports.contains = exports.range = exports.and = exports.zipWithR_ = exports.zipWith_ = exports.zipWithIndex = exports.zipWith = exports.foldlprim = exports.foldrprim = exports.foldl = exports.foldr = exports.lookup = exports.extend = exports.take = exports.indecesOf = exports.dropWhile = exports.takeWhile = exports.indexOf = exports.index = exports.mapIndex = exports.map = exports.consAll = exports.append = exports.toArrayFilter = exports.toArray = exports.reverse = exports.isEmpty = exports.length = exports.each = exports.first = exports.filter = exports.listToString = exports.list = exports.listFrom = exports.Cons = exports.Nil = void 0;
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
exports.isEmpty = (l) => l.tag === 'Nil';
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
exports.takeWhile = (l, fn) => l.tag === 'Cons' && fn(l.head) ? exports.Cons(l.head, exports.takeWhile(l.tail, fn)) : exports.Nil;
exports.dropWhile = (l, fn) => l.tag === 'Cons' && fn(l.head) ? exports.dropWhile(l.tail, fn) : l;
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
exports.take = (l, n) => n <= 0 || l.tag === 'Nil' ? exports.Nil : exports.Cons(l.head, exports.take(l.tail, n - 1));
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
exports.foldr = (f, i, l, j = 0) => l.tag === 'Nil' ? i : f(l.head, exports.foldr(f, i, l.tail, j + 1), j);
exports.foldl = (f, i, l) => l.tag === 'Nil' ? i : exports.foldl(f, f(i, l.head), l.tail);
exports.foldrprim = (f, i, l, ind = 0) => l.tag === 'Nil' ? i : f(l.head, exports.foldrprim(f, i, l.tail, ind + 1), l, ind);
exports.foldlprim = (f, i, l, ind = 0) => l.tag === 'Nil' ? i : exports.foldlprim(f, f(l.head, i, l, ind), l.tail, ind + 1);
exports.zipWith = (f, la, lb) => la.tag === 'Nil' || lb.tag === 'Nil' ? exports.Nil :
    exports.Cons(f(la.head, lb.head), exports.zipWith(f, la.tail, lb.tail));
exports.zipWithIndex = (f, la, lb, i = 0) => la.tag === 'Nil' || lb.tag === 'Nil' ? exports.Nil :
    exports.Cons(f(la.head, lb.head, i), exports.zipWithIndex(f, la.tail, lb.tail, i + 1));
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
exports.last = (l) => {
    let c = l;
    while (c.tag === 'Cons')
        if (c.tail.tag === 'Nil')
            return c.head;
    return null;
};

},{}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tryT = exports.hasDuplicates = exports.range = exports.loadFile = exports.serr = exports.terr = exports.impossible = void 0;
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
exports.range = (n) => {
    const a = Array(n);
    for (let i = 0; i < n; i++)
        a[i] = i;
    return a;
};
exports.hasDuplicates = (x) => {
    const m = {};
    for (let i = 0; i < x.length; i++) {
        const y = `${x[i]}`;
        if (m[y])
            return true;
        m[y] = true;
    }
    return false;
};
exports.tryT = (v, e, throwErr = false) => {
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

},{"fs":16}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showValZ = exports.showVal = exports.zonk = exports.normalize = exports.quote = exports.evaluate = exports.vproj = exports.vapp = exports.force = exports.vinst = exports.VMeta = exports.VVar = exports.VSigma = exports.VPi = exports.VType = exports.VPair = exports.VAbs = exports.VNe = exports.Clos = exports.EProj = exports.EApp = exports.HMeta = exports.HVar = void 0;
const context_1 = require("./context");
const core_1 = require("./core");
const list_1 = require("./utils/list");
const utils_1 = require("./utils/utils");
exports.HVar = (index) => ({ tag: 'HVar', index });
exports.HMeta = (index) => ({ tag: 'HMeta', index });
exports.EApp = (mode, right) => ({ tag: 'EApp', mode, right });
exports.EProj = (proj) => ({ tag: 'EProj', proj });
exports.Clos = (env, body) => ({ env, body });
exports.VNe = (head, spine) => ({ tag: 'VNe', head, spine });
exports.VAbs = (mode, name, type, clos) => ({ tag: 'VAbs', mode, name, type, clos });
exports.VPair = (fst, snd, type) => ({ tag: 'VPair', fst, snd, type });
exports.VType = { tag: 'VType' };
exports.VPi = (mode, name, type, clos) => ({ tag: 'VPi', mode, name, type, clos });
exports.VSigma = (name, type, clos) => ({ tag: 'VSigma', name, type, clos });
exports.VVar = (index) => exports.VNe(exports.HVar(index), list_1.Nil);
exports.VMeta = (index, spine = list_1.Nil) => exports.VNe(exports.HMeta(index), spine);
const cinst = (clos, arg) => exports.evaluate(clos.body, list_1.Cons(arg, clos.env));
exports.vinst = (val, arg) => cinst(val.clos, arg);
exports.force = (v) => {
    if (v.tag === 'VNe' && v.head.tag === 'HMeta') {
        const val = context_1.getMeta(v.head.index);
        if (val.tag === 'Unsolved')
            return v;
        return exports.force(list_1.foldr((elim, y) => elim.tag === 'EProj' ? exports.vproj(elim.proj, y) :
            exports.vapp(y, elim.mode, elim.right), val.val, v.spine));
    }
    return v;
};
exports.vapp = (left, mode, right) => {
    if (left.tag === 'VAbs')
        return exports.vinst(left, right);
    if (left.tag === 'VNe')
        return exports.VNe(left.head, list_1.Cons(exports.EApp(mode, right), left.spine));
    return utils_1.impossible(`vapp: ${left.tag}`);
};
exports.vproj = (proj, v) => {
    if (v.tag === 'VPair')
        return proj === 'fst' ? v.fst : v.snd;
    if (v.tag === 'VNe')
        return exports.VNe(v.head, list_1.Cons(exports.EProj(proj), v.spine));
    return utils_1.impossible(`vproj: ${v.tag}`);
};
exports.evaluate = (t, vs) => {
    if (t.tag === 'Type')
        return exports.VType;
    if (t.tag === 'Abs')
        return exports.VAbs(t.mode, t.name, exports.evaluate(t.type, vs), exports.Clos(vs, t.body));
    if (t.tag === 'Pair')
        return exports.VPair(exports.evaluate(t.fst, vs), exports.evaluate(t.snd, vs), exports.evaluate(t.type, vs));
    if (t.tag === 'Pi')
        return exports.VPi(t.mode, t.name, exports.evaluate(t.type, vs), exports.Clos(vs, t.body));
    if (t.tag === 'Sigma')
        return exports.VSigma(t.name, exports.evaluate(t.type, vs), exports.Clos(vs, t.body));
    if (t.tag === 'Meta') {
        const s = context_1.getMeta(t.index);
        return s.tag === 'Solved' ? s.val : exports.VMeta(t.index);
    }
    if (t.tag === 'Var')
        return list_1.index(vs, t.index) || utils_1.impossible(`evaluate: var ${t.index} has no value`);
    if (t.tag === 'App')
        return exports.vapp(exports.evaluate(t.left, vs), t.mode, exports.evaluate(t.right, vs));
    if (t.tag === 'Let')
        return exports.evaluate(t.body, list_1.Cons(exports.evaluate(t.val, vs), vs));
    if (t.tag === 'Proj')
        return exports.vproj(t.proj, exports.evaluate(t.term, vs));
    return t;
};
const quoteHead = (h, k) => {
    if (h.tag === 'HVar')
        return core_1.Var(k - (h.index + 1));
    if (h.tag === 'HMeta')
        return core_1.Meta(h.index);
    return h;
};
const quoteElim = (t, e, k) => {
    if (e.tag === 'EApp')
        return core_1.App(t, e.mode, exports.quote(e.right, k));
    if (e.tag === 'EProj')
        return core_1.Proj(e.proj, t);
    return e;
};
exports.quote = (v_, k) => {
    const v = exports.force(v_);
    if (v.tag === 'VType')
        return core_1.Type;
    if (v.tag === 'VNe')
        return list_1.foldr((x, y) => quoteElim(y, x, k), quoteHead(v.head, k), v.spine);
    if (v.tag === 'VPair')
        return core_1.Pair(exports.quote(v.fst, k), exports.quote(v.snd, k), exports.quote(v.type, k));
    if (v.tag === 'VAbs')
        return core_1.Abs(v.mode, v.name, exports.quote(v.type, k), exports.quote(exports.vinst(v, exports.VVar(k)), k + 1));
    if (v.tag === 'VPi')
        return core_1.Pi(v.mode, v.name, exports.quote(v.type, k), exports.quote(exports.vinst(v, exports.VVar(k)), k + 1));
    if (v.tag === 'VSigma')
        return core_1.Sigma(v.name, exports.quote(v.type, k), exports.quote(exports.vinst(v, exports.VVar(k)), k + 1));
    return v;
};
exports.normalize = (t) => exports.quote(exports.evaluate(t, list_1.Nil), 0);
const zonkSpine = (tm, vs, k) => {
    if (tm.tag === 'Meta') {
        const s = context_1.getMeta(tm.index);
        if (s.tag === 'Unsolved')
            return [true, exports.zonk(tm, vs, k)];
        return [false, s.val];
    }
    if (tm.tag === 'App') {
        const spine = zonkSpine(tm.left, vs, k);
        return spine[0] ?
            [true, core_1.App(spine[1], tm.mode, exports.zonk(tm.right, vs, k))] :
            [false, exports.vapp(spine[1], tm.mode, exports.evaluate(tm.right, vs))];
    }
    return [true, exports.zonk(tm, vs, k)];
};
exports.zonk = (tm, vs = list_1.Nil, k = 0) => {
    if (tm.tag === 'Meta') {
        const s = context_1.getMeta(tm.index);
        return s.tag === 'Solved' ? exports.quote(s.val, k) : tm;
    }
    if (tm.tag === 'Pi')
        return core_1.Pi(tm.mode, tm.name, exports.zonk(tm.type, vs, k), exports.zonk(tm.body, list_1.Cons(exports.VVar(k), vs), k + 1));
    if (tm.tag === 'Sigma')
        return core_1.Sigma(tm.name, exports.zonk(tm.type, vs, k), exports.zonk(tm.body, list_1.Cons(exports.VVar(k), vs), k + 1));
    if (tm.tag === 'Let')
        return core_1.Let(tm.name, exports.zonk(tm.type, vs, k), exports.zonk(tm.val, vs, k), exports.zonk(tm.body, list_1.Cons(exports.VVar(k), vs), k + 1));
    if (tm.tag === 'Abs')
        return core_1.Abs(tm.mode, tm.name, exports.zonk(tm.type, vs, k), exports.zonk(tm.body, list_1.Cons(exports.VVar(k), vs), k + 1));
    if (tm.tag === 'Pair')
        return core_1.Pair(exports.zonk(tm.fst, vs, k), exports.zonk(tm.snd, vs, k), exports.zonk(tm.type, vs, k));
    if (tm.tag === 'Proj')
        return core_1.Proj(tm.proj, exports.zonk(tm.term, vs, k));
    if (tm.tag === 'App') {
        const spine = zonkSpine(tm.left, vs, k);
        return spine[0] ?
            core_1.App(spine[1], tm.mode, exports.zonk(tm.right, vs, k)) :
            exports.quote(exports.vapp(spine[1], tm.mode, exports.evaluate(tm.right, vs)), k);
    }
    return tm;
};
exports.showVal = (v, k) => core_1.show(exports.quote(v, k));
exports.showValZ = (v, vs = list_1.Nil, k) => core_1.show(exports.zonk(exports.quote(v, k), vs, k));

},{"./context":2,"./core":4,"./utils/list":12,"./utils/utils":13}],15:[function(require,module,exports){
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

},{"./repl":8}],16:[function(require,module,exports){

},{}]},{},[15]);
