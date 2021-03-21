(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.setConfig = exports.config = void 0;
exports.config = {
    debug: false,
    showEnvs: false,
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

},{}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.liftType = exports.subst = exports.substVar = exports.shift = exports.show = exports.flattenPair = exports.flattenApp = exports.flattenAbs = exports.flattenSigma = exports.flattenPi = exports.InsertedMeta = exports.Meta = exports.Lower = exports.LiftTerm = exports.Lift = exports.ElimEnum = exports.EnumLit = exports.Enum = exports.Proj = exports.Pair = exports.Sigma = exports.App = exports.Abs = exports.Pi = exports.Let = exports.Global = exports.Type = exports.Var = void 0;
const utils_1 = require("./utils/utils");
const Var = (index) => ({ tag: 'Var', index });
exports.Var = Var;
const Type = (index) => ({ tag: 'Type', index });
exports.Type = Type;
const Global = (name, lift) => ({ tag: 'Global', name, lift });
exports.Global = Global;
const Let = (erased, name, type, val, body) => ({ tag: 'Let', erased, name, type, val, body });
exports.Let = Let;
const Pi = (erased, name, type, u1, body, u2) => ({ tag: 'Pi', erased, name, type, u1, body, u2 });
exports.Pi = Pi;
const Abs = (erased, name, type, body) => ({ tag: 'Abs', erased, name, type, body });
exports.Abs = Abs;
const App = (fn, erased, arg) => ({ tag: 'App', fn, erased, arg });
exports.App = App;
const Sigma = (erased, name, type, u1, body, u2) => ({ tag: 'Sigma', erased, name, type, u1, body, u2 });
exports.Sigma = Sigma;
const Pair = (erased, fst, snd, type) => ({ tag: 'Pair', erased, fst, snd, type });
exports.Pair = Pair;
const Proj = (proj, term) => ({ tag: 'Proj', proj, term });
exports.Proj = Proj;
const Enum = (num) => ({ tag: 'Enum', num });
exports.Enum = Enum;
const EnumLit = (val, num) => ({ tag: 'EnumLit', val, num });
exports.EnumLit = EnumLit;
const ElimEnum = (num, lift, motive, scrut, cases) => ({ tag: 'ElimEnum', num, lift, motive, scrut, cases });
exports.ElimEnum = ElimEnum;
const Lift = (type) => ({ tag: 'Lift', type });
exports.Lift = Lift;
const LiftTerm = (term) => ({ tag: 'LiftTerm', term });
exports.LiftTerm = LiftTerm;
const Lower = (term) => ({ tag: 'Lower', term });
exports.Lower = Lower;
const Meta = (id) => ({ tag: 'Meta', id });
exports.Meta = Meta;
const InsertedMeta = (id, spine) => ({ tag: 'InsertedMeta', id, spine });
exports.InsertedMeta = InsertedMeta;
const flattenPi = (t) => {
    const params = [];
    let c = t;
    while (c.tag === 'Pi') {
        params.push([c.erased, c.name, c.type]);
        c = c.body;
    }
    return [params, c];
};
exports.flattenPi = flattenPi;
const flattenSigma = (t) => {
    const params = [];
    let c = t;
    while (c.tag === 'Sigma') {
        params.push([c.erased, c.name, c.type]);
        c = c.body;
    }
    return [params, c];
};
exports.flattenSigma = flattenSigma;
const flattenAbs = (t) => {
    const params = [];
    let c = t;
    while (c.tag === 'Abs') {
        params.push([c.erased, c.name, c.type]);
        c = c.body;
    }
    return [params, c];
};
exports.flattenAbs = flattenAbs;
const flattenApp = (t) => {
    const args = [];
    let c = t;
    while (c.tag === 'App') {
        args.push([c.erased, c.arg]);
        c = c.fn;
    }
    return [c, args.reverse()];
};
exports.flattenApp = flattenApp;
const flattenPair = (t) => {
    const ps = [];
    let c = t;
    while (c.tag === 'Pair') {
        ps.push([c.erased, c.fst]);
        c = c.snd;
    }
    return [ps, c];
};
exports.flattenPair = flattenPair;
const showP = (b, t) => b ? `(${exports.show(t)})` : exports.show(t);
const isSimple = (t) => t.tag === 'Var' || t.tag === 'Global' || t.tag === 'Type' || t.tag === 'Meta' || t.tag === 'InsertedMeta' || t.tag === 'Enum' || t.tag === 'EnumLit' || t.tag === 'Pair';
const showS = (t) => showP(!isSimple(t), t);
const show = (t) => {
    if (t.tag === 'Var')
        return `'${t.index}`;
    if (t.tag === 'Global')
        return `${t.name}${t.lift === 0 ? '' : t.lift === 1 ? '^' : `^${t.lift}`}`;
    if (t.tag === 'Type')
        return `*${t.index > 0 ? t.index : ''}`;
    if (t.tag === 'Meta')
        return `?${t.id}`;
    if (t.tag === 'InsertedMeta')
        return `?*${t.id}`;
    if (t.tag === 'Enum')
        return `#${t.num}`;
    if (t.tag === 'ElimEnum')
        return `?${t.num}${t.lift === 0 ? '' : t.lift === 1 ? '^' : `^${t.lift}`} {${exports.show(t.motive)}} ${showS(t.scrut)}${t.cases.length > 0 ? ' ' : ''}${t.cases.map(showS).join(' ')}`;
    if (t.tag === 'EnumLit')
        return `@${t.val}/${t.num}`;
    if (t.tag === 'Pi') {
        const [params, ret] = exports.flattenPi(t);
        return `${params.map(([e, x, t]) => !e && x === '_' ? showP(t.tag === 'Pi' || t.tag === 'Let', t) : `${e ? '{' : '('}${x} : ${exports.show(t)}${e ? '}' : ')'}`).join(' -> ')} -> ${exports.show(ret)}`;
    }
    if (t.tag === 'Abs') {
        const [params, body] = exports.flattenAbs(t);
        return `\\${params.map(([e, x, t]) => `${e ? '{' : '('}${x} : ${exports.show(t)}${e ? '}' : ')'}`).join(' ')}. ${exports.show(body)}`;
    }
    if (t.tag === 'App') {
        const [fn, args] = exports.flattenApp(t);
        return `${showS(fn)} ${args.map(([e, a]) => e ? `{${exports.show(a)}}` : showS(a)).join(' ')}`;
    }
    if (t.tag === 'Sigma') {
        const [params, ret] = exports.flattenSigma(t);
        return `${params.map(([e, x, t]) => !e && x === '_' ? showP(t.tag === 'Sigma' || t.tag === 'Let', t) : `${e ? '{' : '('}${x} : ${exports.show(t)}${e ? '}' : ')'}`).join(' ** ')} ** ${exports.show(ret)}`;
    }
    if (t.tag === 'Pair') {
        const [ps, ret] = exports.flattenPair(t);
        return `(${ps.map(([e, x]) => e ? `{${exports.show(x)}}` : `${exports.show(x)}`).join(', ')}, ${exports.show(ret)}) : ${exports.show(t.type)}`;
    }
    if (t.tag === 'Let')
        return `let ${t.erased ? '{' : ''}${t.name}${t.erased ? '}' : ''} : ${showP(t.type.tag === 'Let', t.type)} = ${showP(t.val.tag === 'Let', t.val)}; ${exports.show(t.body)}`;
    if (t.tag === 'Lift')
        return `Lift ${showS(t.type)}`;
    if (t.tag === 'LiftTerm')
        return `lift ${showS(t.term)}`;
    if (t.tag === 'Lower')
        return `lower ${showS(t.term)}`;
    if (t.tag === 'Proj')
        return `${t.proj} ${showS(t.term)}`;
    return t;
};
exports.show = show;
const shift = (d, c, t) => {
    if (t.tag === 'Var')
        return t.index < c ? t : exports.Var(t.index + d);
    if (t.tag === 'App')
        return exports.App(exports.shift(d, c, t.fn), t.erased, exports.shift(d, c, t.arg));
    if (t.tag === 'Abs')
        return exports.Abs(t.erased, t.name, exports.shift(d, c, t.type), exports.shift(d, c + 1, t.body));
    if (t.tag === 'Let')
        return exports.Let(t.erased, t.name, exports.shift(d, c, t.type), exports.shift(d, c, t.val), exports.shift(d, c + 1, t.body));
    if (t.tag === 'Pi')
        return exports.Pi(t.erased, t.name, exports.shift(d, c, t.type), t.u1, exports.shift(d, c + 1, t.body), t.u2);
    if (t.tag === 'Sigma')
        return exports.Sigma(t.erased, t.name, exports.shift(d, c, t.type), t.u1, exports.shift(d, c + 1, t.body), t.u2);
    if (t.tag === 'Pair')
        return exports.Pair(t.erased, exports.shift(d, c, t.fst), exports.shift(d, c, t.snd), exports.shift(d, c, t.type));
    if (t.tag === 'ElimEnum')
        return exports.ElimEnum(t.num, t.lift, exports.shift(d, c, t.motive), exports.shift(d, c, t.scrut), t.cases.map(x => exports.shift(d, c, x)));
    if (t.tag === 'Lift')
        return exports.Lift(exports.shift(d, c, t.type));
    if (t.tag === 'LiftTerm')
        return exports.LiftTerm(exports.shift(d, c, t.term));
    if (t.tag === 'Lower')
        return exports.Lower(exports.shift(d, c, t.term));
    if (t.tag === 'Proj')
        return exports.Proj(t.proj, exports.shift(d, c, t.term));
    return t;
};
exports.shift = shift;
const substVar = (j, s, t) => {
    if (t.tag === 'Var')
        return t.index === j ? s : t;
    if (t.tag === 'App')
        return exports.App(exports.substVar(j, s, t.fn), t.erased, exports.substVar(j, s, t.arg));
    if (t.tag === 'Abs')
        return exports.Abs(t.erased, t.name, exports.substVar(j, s, t.type), exports.substVar(j + 1, exports.shift(1, 0, s), t.body));
    if (t.tag === 'Let')
        return exports.Let(t.erased, t.name, exports.substVar(j, s, t.type), exports.substVar(j, s, t.val), exports.substVar(j + 1, exports.shift(1, 0, s), t.body));
    if (t.tag === 'Pi')
        return exports.Pi(t.erased, t.name, exports.substVar(j, s, t.type), t.u1, exports.substVar(j + 1, exports.shift(1, 0, s), t.body), t.u2);
    if (t.tag === 'Sigma')
        return exports.Sigma(t.erased, t.name, exports.substVar(j, s, t.type), t.u1, exports.substVar(j + 1, exports.shift(1, 0, s), t.body), t.u2);
    if (t.tag === 'Pair')
        return exports.Pair(t.erased, exports.substVar(j, s, t.fst), exports.substVar(j, s, t.snd), exports.substVar(j, s, t.type));
    if (t.tag === 'ElimEnum')
        return exports.ElimEnum(t.num, t.lift, exports.substVar(j, s, t.motive), exports.substVar(j, s, t.scrut), t.cases.map(x => exports.substVar(j, s, x)));
    if (t.tag === 'Lift')
        return exports.Lift(exports.substVar(j, s, t.type));
    if (t.tag === 'LiftTerm')
        return exports.LiftTerm(exports.substVar(j, s, t.term));
    if (t.tag === 'Lower')
        return exports.Lower(exports.substVar(j, s, t.term));
    if (t.tag === 'Proj')
        return exports.Proj(t.proj, exports.substVar(j, s, t.term));
    return t;
};
exports.substVar = substVar;
const subst = (t, u) => exports.shift(-1, 0, exports.substVar(0, exports.shift(1, 0, u), t));
exports.subst = subst;
const liftType = (l, t) => {
    if (t.tag === 'Type')
        return exports.Type(t.index + l);
    if (t.tag === 'Abs')
        return exports.Abs(t.erased, t.name, exports.liftType(l, t.type), exports.liftType(l, t.body));
    if (t.tag === 'Pi')
        return exports.Pi(t.erased, t.name, exports.liftType(l, t.type), t.u1 + 1, exports.liftType(l, t.body), t.u2 + 1);
    if (t.tag === 'Sigma')
        return exports.Sigma(t.erased, t.name, exports.liftType(l, t.type), t.u1 + 1, exports.liftType(l, t.body), t.u2 + 1);
    if (t.tag === 'App')
        return exports.App(exports.liftType(l, t.fn), t.erased, exports.liftType(l, t.arg));
    if (t.tag === 'Let')
        return exports.Let(t.erased, t.name, exports.liftType(l, t.type), exports.liftType(l, t.val), exports.liftType(l, t.body));
    if (t.tag === 'Global')
        return exports.Global(t.name, t.lift + l);
    if (t.tag === 'Enum')
        return exports.Lift(exports.Enum(t.num));
    if (t.tag === 'ElimEnum')
        return exports.ElimEnum(t.num, t.lift + l, exports.liftType(l, t.motive), exports.liftType(l, t.scrut), t.cases.map(x => exports.liftType(l, x)));
    if (t.tag === 'EnumLit')
        return exports.LiftTerm(exports.EnumLit(t.val, t.num));
    if (t.tag === 'Pair')
        return exports.Pair(t.erased, exports.liftType(l, t.fst), exports.liftType(l, t.snd), exports.liftType(l, t.type));
    if (t.tag === 'Meta')
        return utils_1.impossible(`meta in liftType: ${exports.show(t)}`);
    if (t.tag === 'InsertedMeta')
        return utils_1.impossible(`meta in liftType: ${exports.show(t)}`);
    if (t.tag === 'Lift')
        return exports.Lift(exports.Lift(t.type));
    if (t.tag === 'LiftTerm')
        return exports.LiftTerm(exports.LiftTerm(t.term));
    if (t.tag === 'Lower')
        return t.term;
    if (t.tag === 'Proj')
        return exports.Proj(t.proj, exports.liftType(l, t.term));
    return t;
};
exports.liftType = liftType;

},{"./utils/utils":15}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.elaborateDefs = exports.elaborateDef = exports.elaborate = void 0;
const core_1 = require("./core");
const local_1 = require("./local");
const metas_1 = require("./metas");
const surface_1 = require("./surface");
const List_1 = require("./utils/List");
const values_1 = require("./values");
const S = require("./surface");
const config_1 = require("./config");
const utils_1 = require("./utils/utils");
const unification_1 = require("./unification");
const globals_1 = require("./globals");
const typecheck_1 = require("./typecheck");
const showV = (local, val) => S.showVal(val, local.level, false, local.ns);
const newMeta = (local, universe) => {
    const id = metas_1.freshMeta(universe);
    const bds = local.ts.map(e => e.bound);
    return core_1.InsertedMeta(id, bds);
};
const inst = (local, ty_) => {
    const ty = values_1.force(ty_);
    if (ty.tag === 'VPi' && ty.erased) {
        const m = newMeta(local, ty.u1);
        const vm = values_1.evaluate(m, local.vs);
        const [res, args] = inst(local, values_1.vinst(ty, vm));
        return [res, List_1.cons(m, args)];
    }
    return [ty_, List_1.nil];
};
const check = (local, tm, ty, u) => {
    config_1.log(() => `check(*${u}) ${surface_1.show(tm)} : ${showV(local, ty)}`);
    if (tm.tag === 'Hole') {
        const x = newMeta(local, 0); // TODO: is 0 fine here?
        if (tm.name) {
            if (holes[tm.name])
                return utils_1.terr(`duplicate hole ${tm.name}`);
            holes[tm.name] = [values_1.evaluate(x, local.vs), ty, local];
        }
        return x;
    }
    const fty = values_1.force(ty);
    config_1.log(() => `check(full) ${surface_1.show(tm)} : ${showV(local, fty)}`);
    if (tm.tag === 'Abs' && !tm.type && fty.tag === 'VPi' && tm.erased === fty.erased) {
        const v = values_1.VVar(local.level);
        const x = tm.name;
        const body = check(local.bind(fty.erased, x, fty.type, fty.u1), tm.body, values_1.vinst(fty, v), fty.u2);
        return core_1.Abs(fty.erased, x, values_1.quote(fty.type, local.level), body);
    }
    if (fty.tag === 'VPi' && fty.erased) {
        const v = values_1.VVar(local.level);
        const term = check(local.insert(true, fty.name, fty.type, fty.u1), tm, values_1.vinst(fty, v), u);
        return core_1.Abs(fty.erased, fty.name, values_1.quote(fty.type, local.level), term);
    }
    if (fty.tag === 'VLift' && tm.tag === 'EnumLit') {
        const term = check(local, tm, fty.type, u - 1);
        return core_1.LiftTerm(term);
    }
    if (tm.tag === 'Enum' && fty.tag === 'VType') {
        if (!local.erased)
            return utils_1.terr(`enum type in non-type context: ${surface_1.show(tm)}`);
        return utils_1.iterate(fty.index, core_1.Enum(tm.num), x => core_1.Lift(x));
    }
    if (tm.tag === 'EnumLit' && fty.tag === 'VEnum' && (tm.num === null || tm.num === fty.num))
        return core_1.EnumLit(tm.val, fty.num);
    if (tm.tag === 'ElimEnum' && !tm.motive) {
        if (tm.cases.length !== tm.num)
            return utils_1.terr(`cases amount mismatch, expected ${tm.num} but got ${tm.cases.length}: ${surface_1.show(tm)}`);
        const lift = tm.lift || 0;
        const vmotive = values_1.VAbs(false, '_', values_1.VEnum(tm.num), _ => ty);
        const motive = values_1.quote(vmotive, local.level);
        const scrut = check(local, tm.scrut, values_1.VEnum(tm.num), 0);
        const cases = tm.cases.map((c, i) => check(local, c, values_1.vapp(vmotive, false, values_1.VEnumLit(i, tm.num)), u));
        return core_1.ElimEnum(tm.num, lift, motive, scrut, cases);
    }
    if (tm.tag === 'Lift' && fty.tag === 'VType' && fty.index > 0) {
        if (!local.erased)
            return utils_1.terr(`Lift type in non-type context: ${surface_1.show(tm)}`);
        const type = check(local, tm.type, values_1.VType(fty.index - 1), u - 1);
        return core_1.Lift(type);
    }
    if (tm.tag === 'LiftTerm' && fty.tag === 'VLift') {
        const term = check(local, tm.term, fty.type, u - 1);
        return core_1.LiftTerm(term);
    }
    if (tm.tag === 'Pair') {
        if (fty.tag !== 'VSigma')
            return utils_1.terr(`not a sigma type in pair (${surface_1.show(tm)}): ${showV(local, ty)}`);
        if (tm.erased !== fty.erased)
            return utils_1.terr(`erasure mismatch in pair (${surface_1.show(tm)}): ${showV(local, ty)}`);
        const fst = check(tm.erased ? local.inType() : local, tm.fst, fty.type, u);
        const snd = check(local, tm.snd, values_1.vinst(fty, values_1.evaluate(fst, local.vs)), u);
        return core_1.Pair(tm.erased, fst, snd, values_1.quote(ty, local.level));
    }
    if (tm.tag === 'Let') {
        let vtype;
        let vty;
        let val;
        let ul;
        if (tm.type) {
            [vtype, ul] = synthType(local.inType(), tm.type);
            vty = values_1.evaluate(vtype, local.vs);
            val = check(tm.erased ? local.inType() : local, tm.val, ty, ul);
        }
        else {
            [val, vty, ul] = synth(tm.erased ? local.inType() : local, tm.val);
            vtype = values_1.quote(vty, local.level);
        }
        const v = values_1.evaluate(val, local.vs);
        const body = check(local.define(tm.erased, tm.name, vty, v, ul), tm.body, ty, u);
        return core_1.Let(tm.erased, tm.name, vtype, val, body);
    }
    const [term, ty2, u2] = synth(local, tm);
    if (u2 !== u)
        return utils_1.terr(`check failed (${surface_1.show(tm)}): ${showV(local, ty2)} ~ ${showV(local, ty)}, universe mismatch: *${u2} ~ *${u}`);
    const [ty2inst, ms] = inst(local, ty2);
    return utils_1.tryT(() => {
        config_1.log(() => `unify ${showV(local, ty2inst)} ~ ${showV(local, ty)}`);
        config_1.log(() => `for check ${surface_1.show(tm)} : ${showV(local, ty)}`);
        unification_1.unify(local.level, ty2inst, ty);
        return ms.foldl((a, m) => core_1.App(a, true, m), term);
    }, e => utils_1.terr(`check failed (${surface_1.show(tm)}): ${showV(local, ty2)} ~ ${showV(local, ty)}: ${e}`));
};
const freshPi = (local, erased, x) => {
    const a = newMeta(local, 0); // TODO: is 0 fine here?
    const va = values_1.evaluate(a, local.vs);
    const b = newMeta(local.bind(erased, '_', va, 0), 0);
    return values_1.evaluate(core_1.Pi(erased, x, a, 0, b, 0), local.vs);
};
const synthType = (local, tm) => {
    const [type, ty] = synth(local, tm);
    const fty = values_1.force(ty);
    if (fty.tag !== 'VType')
        return utils_1.terr(`expected type but got ${showV(local, ty)}, while synthesizing ${surface_1.show(tm)}`);
    return [type, fty.index];
};
const synth = (local, tm) => {
    config_1.log(() => `synth ${surface_1.show(tm)}`);
    if (tm.tag === 'Type') {
        if (!local.erased)
            return utils_1.terr(`type in non-type context: ${surface_1.show(tm)}`);
        return [core_1.Type(tm.index), values_1.VType(tm.index + 1), 2];
    }
    if (tm.tag === 'Var') {
        const i = local.nsSurface.indexOf(tm.name);
        if (i < 0) {
            const entry = globals_1.getGlobal(tm.name);
            if (!entry)
                return utils_1.terr(`global ${tm.name} not found`);
            if (entry.erased && !local.erased)
                return utils_1.terr(`erased global used: ${surface_1.show(tm)}`);
            let ty;
            if (tm.lift === 0) {
                ty = entry.type;
            }
            else {
                ty = values_1.evaluate(core_1.liftType(tm.lift, entry.etype), local.vs);
            }
            return [core_1.Global(tm.name, tm.lift), ty, entry.universe];
        }
        else {
            if (tm.lift > 0)
                return utils_1.terr(`local variables cannot be lifted: ${surface_1.show(tm)}`);
            const [entry, j] = local_1.indexEnvT(local.ts, i) || utils_1.terr(`var out of scope ${surface_1.show(tm)}`);
            if (entry.erased && !local.erased)
                return utils_1.terr(`erased var used: ${surface_1.show(tm)}`);
            return [core_1.Var(j), entry.type, entry.universe];
        }
    }
    if (tm.tag === 'App') {
        const [fn, fnty, u1] = synth(local, tm.fn);
        const [arg, rty, ms, u] = synthapp(local, fnty, u1, tm.erased, tm.arg, tm);
        return [core_1.App(ms.foldl((a, m) => core_1.App(a, true, m), fn), tm.erased, arg), rty, u];
    }
    if (tm.tag === 'Abs') {
        if (tm.type) {
            const [type, u1] = synthType(local.inType(), tm.type);
            const ty = values_1.evaluate(type, local.vs);
            const [body, rty, u2] = synth(local.bind(tm.erased, tm.name, ty, u1), tm.body);
            const u = Math.max(u1, u2);
            const qpi = core_1.Pi(tm.erased, tm.name, type, u1, values_1.quote(rty, local.level + 1), u);
            const pi = values_1.evaluate(qpi, local.vs);
            return [core_1.Abs(tm.erased, tm.name, type, body), pi, u];
        }
        else {
            const pi = freshPi(local, tm.erased, tm.name);
            const term = check(local, tm, pi, 0);
            return [term, pi, 0];
        }
    }
    if (tm.tag === 'Pi') {
        if (!local.erased)
            return utils_1.terr(`pi type in non-type context: ${surface_1.show(tm)}`);
        const [type, s1] = synthType(local.inType(), tm.type);
        const ty = values_1.evaluate(type, local.vs);
        const [body, s2] = synthType(local.inType().bind(tm.erased, tm.name, ty, s1), tm.body);
        const u = Math.max(s1, s2);
        const pi = core_1.Pi(tm.erased, tm.name, type, s1, body, u);
        config_1.log(() => `Pi synth done (${u} : ${u + 1}): ${S.showCore(pi, local.ns)}`);
        return [pi, values_1.VType(u), u + 1];
    }
    if (tm.tag === 'Sigma') {
        if (!local.erased)
            return utils_1.terr(`sigma type in non-type context: ${surface_1.show(tm)}`);
        const [type, s1] = synthType(local.inType(), tm.type);
        const ty = values_1.evaluate(type, local.vs);
        const [body, s2] = synthType(local.inType().bind(tm.erased, tm.name, ty, s1), tm.body);
        const u = Math.max(s1, s2);
        return [core_1.Sigma(tm.erased, tm.name, type, s1, body, u), values_1.VType(u), u + 1];
    }
    if (tm.tag === 'Proj') {
        const [term, ty, u] = synth(local, tm.term);
        const fty = values_1.force(ty);
        if (fty.tag !== 'VSigma')
            return utils_1.terr(`not a sigma type in proj (${surface_1.show(tm)}): ${showV(local, ty)}`);
        return [core_1.Proj(tm.proj, term), tm.proj === 'fst' ? fty.type : values_1.vinst(fty, values_1.vproj('fst', values_1.evaluate(term, local.vs))), u];
    }
    if (tm.tag === 'Let') {
        let type;
        let ty;
        let val;
        let uni;
        if (tm.type) {
            [type, uni] = synthType(local.inType(), tm.type);
            ty = values_1.evaluate(type, local.vs);
            val = check(tm.erased ? local.inType() : local, tm.val, ty, uni);
        }
        else {
            [val, ty, uni] = synth(tm.erased ? local.inType() : local, tm.val);
            type = values_1.quote(ty, local.level);
        }
        const v = values_1.evaluate(val, local.vs);
        const [body, rty, u] = synth(local.define(tm.erased, tm.name, ty, v, uni), tm.body);
        return [core_1.Let(tm.erased, tm.name, type, val, body), rty, u];
    }
    if (tm.tag === 'Hole') {
        const t = newMeta(local, 0); // is 0 fine here?
        const vt = values_1.evaluate(newMeta(local, 0), local.vs);
        if (tm.name) {
            if (holes[tm.name])
                return utils_1.terr(`duplicate hole ${tm.name}`);
            holes[tm.name] = [values_1.evaluate(t, local.vs), vt, local];
        }
        return [t, vt, 0];
    }
    if (tm.tag === 'Pair') {
        const [fst, fstty, u1] = synth(tm.erased ? local.inType() : local, tm.fst);
        const [snd, sndty, u2] = synth(local, tm.snd);
        const u = Math.max(u1, u2);
        const ty = core_1.Sigma(false, '_', values_1.quote(fstty, local.level), u1, values_1.quote(sndty, local.level + 1), u);
        return [core_1.Pair(tm.erased, fst, snd, ty), values_1.evaluate(ty, local.vs), u];
    }
    if (tm.tag === 'Enum') {
        if (!local.erased)
            return utils_1.terr(`enum type in non-type context: ${surface_1.show(tm)}`);
        return [core_1.Enum(tm.num), values_1.VType(0), 1];
    }
    if (tm.tag === 'EnumLit' && tm.num !== null) {
        if (tm.val >= tm.num)
            return utils_1.terr(`invalid enum literal: ${surface_1.show(tm)}`);
        return [core_1.EnumLit(tm.val, tm.num), values_1.VEnum(tm.num), 0];
    }
    if (tm.tag === 'ElimEnum') {
        if (tm.cases.length !== tm.num)
            return utils_1.terr(`cases amount mismatch, expected ${tm.num} but got ${tm.cases.length}: ${surface_1.show(tm)}`);
        const lift = tm.lift || 0;
        let premotive;
        if (!tm.motive) {
            premotive = S.App(S.Abs(false, 't', S.Type(lift), S.Abs(false, '_', S.Enum(tm.num), S.Var('t', 0))), false, S.Hole(null));
            // TODO: universe variable
        }
        else
            premotive = tm.motive;
        const u = lift + 1;
        const motive = check(local.inType(), premotive, values_1.VPi(false, '_', values_1.VEnum(tm.num), 0, _ => values_1.VType(lift), u), u);
        const vmotive = values_1.evaluate(motive, local.vs);
        const scrut = check(local, tm.scrut, values_1.VEnum(tm.num), 0);
        const vscrut = values_1.evaluate(scrut, local.vs);
        const cases = tm.cases.map((c, i) => check(local, c, values_1.vapp(vmotive, false, values_1.VEnumLit(i, tm.num)), lift));
        return [core_1.ElimEnum(tm.num, lift, motive, scrut, cases), values_1.vapp(vmotive, false, vscrut), lift];
    }
    if (tm.tag === 'Lift') {
        if (!local.erased)
            return utils_1.terr(`Lift type in non-type context: ${surface_1.show(tm)}`);
        /*
        t : *k
        -------------------
        Lift t : *(k + 1)
        */
        const [type, ty] = synth(local, tm.type);
        const vty = values_1.force(ty);
        if (vty.tag !== 'VType')
            return utils_1.terr(`not a type in ${surface_1.show(tm)}: ${showV(local, ty)}`);
        return [core_1.Lift(type), values_1.VType(vty.index + 1), vty.index + 2];
    }
    if (tm.tag === 'LiftTerm') {
        /*
        t : A
        -------------------
        lift t : Lift A
        */
        const [term, ty, u] = synth(local, tm.term);
        return [core_1.LiftTerm(term), values_1.VLift(ty), u + 1];
    }
    if (tm.tag === 'Lower') {
        /*
        t : Lift^l A
        -------------------
        lower t : A
        */
        const [term, ty, u] = synth(local, tm.term);
        const vty = values_1.force(ty);
        if (vty.tag !== 'VLift')
            return utils_1.terr(`not a Lift type in ${surface_1.show(tm)}: ${showV(local, ty)}`);
        return [core_1.Lower(term), vty.type, u - 1];
    }
    return utils_1.terr(`unable to synth ${surface_1.show(tm)}`);
};
const synthapp = (local, ty_, ul, erased, tm, tmall) => {
    config_1.log(() => `synthapp ${showV(local, ty_)} ${erased ? '-' : ''}@ ${surface_1.show(tm)}`);
    const ty = values_1.force(ty_);
    if (ty.tag === 'VPi' && ty.erased && !erased) {
        const m = newMeta(local, ty.u1);
        const vm = values_1.evaluate(m, local.vs);
        const [rest, rt, l, u] = synthapp(local, values_1.vinst(ty, vm), ul, erased, tm, tmall);
        return [rest, rt, List_1.cons(m, l), u];
    }
    if (ty.tag === 'VPi' && ty.erased === erased) {
        const right = check(erased ? local.inType() : local, tm, ty.type, ty.u1);
        const rt = values_1.vinst(ty, values_1.evaluate(right, local.vs));
        return [right, rt, List_1.nil, ty.u2];
    }
    if (ty.tag === 'VFlex') {
        const a = metas_1.freshMeta(0); // TODO: is 0 fine here?
        const b = metas_1.freshMeta(0);
        const pi = values_1.VPi(erased, '_', values_1.VFlex(a, ty.spine), 0, () => values_1.VFlex(b, ty.spine), 0);
        unification_1.unify(local.level, ty, pi);
        return synthapp(local, pi, ul, erased, tm, tmall);
    }
    return utils_1.terr(`invalid type or plicity mismatch in synthapp in ${surface_1.show(tmall)}: ${showV(local, ty)} ${erased ? '-' : ''}@ ${surface_1.show(tm)}`);
};
let holes = {};
const showValSZ = (local, v) => S.showCore(values_1.zonk(values_1.quote(v, local.level, false), local.vs, local.level, false), local.ns);
const showHoles = (tm, ty) => {
    const holeprops = Object.entries(holes);
    if (holeprops.length === 0)
        return;
    const strtype = S.showCore(ty);
    const strterm = S.showCore(tm);
    const str = holeprops.map(([x, [t, v, local]]) => {
        const fst = local.ns.zipWith(local.vs, (x, v) => [x, v]);
        const all = fst.zipWith(local.ts, ([x, v], { bound: def, type: ty, inserted, erased }) => [x, v, def, ty, inserted, erased]);
        const allstr = all.toMappedArray(([x, v, b, t, _, p]) => `${p ? `{${x}}` : x} : ${showValSZ(local, t)}${b ? '' : ` = ${showValSZ(local, v)}`}`).join('\n');
        return `\n_${x} : ${showValSZ(local, v)} = ${showValSZ(local, t)}\nlocal:\n${allstr}\n`;
    }).join('\n');
    return utils_1.terr(`unsolved holes\ntype: ${strtype}\nterm: ${strterm}\n${str}`);
};
const elaborate = (t, erased = false) => {
    holes = {};
    metas_1.resetMetas();
    const [tm, ty, u] = synth(erased ? local_1.Local.empty().inType() : local_1.Local.empty(), t);
    const ztm = values_1.zonk(tm);
    const zty = values_1.zonk(values_1.quote(ty, 0));
    showHoles(ztm, zty);
    if (!metas_1.allMetasSolved())
        return utils_1.terr(`not all metas are solved: ${S.showCore(ztm)} : ${S.showCore(zty)}`);
    return [ztm, zty, u];
};
exports.elaborate = elaborate;
const elaborateDef = (d) => {
    config_1.log(() => `elaborateDef ${S.showDef(d)}`);
    if (d.tag === 'DDef') {
        utils_1.tryT(() => {
            const [term, type, u] = exports.elaborate(d.value, d.erased);
            config_1.log(() => `elaborated def ${d.name}: ${S.showCore(term)} : ${S.showCore(type)} (*${u})`);
            // verify elaboration
            const [vty] = typecheck_1.typecheck(term, d.erased ? local_1.Local.empty().inType() : local_1.Local.empty());
            config_1.log(() => `verified def ${d.name}: ${S.showCore(vty)}`);
            globals_1.setGlobal(d.name, values_1.evaluate(type, List_1.nil), u, values_1.evaluate(term, List_1.nil), type, term, d.erased);
        }, err => {
            utils_1.terr(`while elaborating definition ${d.name}: ${err}`);
        });
        return;
    }
    return d.tag;
};
exports.elaborateDef = elaborateDef;
const elaborateDefs = (ds) => {
    for (let i = 0, l = ds.length; i < l; i++)
        exports.elaborateDef(ds[i]);
};
exports.elaborateDefs = elaborateDefs;

},{"./config":1,"./core":2,"./globals":4,"./local":5,"./metas":6,"./surface":10,"./typecheck":11,"./unification":12,"./utils/List":14,"./utils/utils":15,"./values":16}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGlobal = exports.setGlobal = exports.getGlobals = exports.getGlobal = exports.resetGlobals = void 0;
const utils_1 = require("./utils/utils");
let globals = {};
const resetGlobals = () => { globals = {}; };
exports.resetGlobals = resetGlobals;
const getGlobal = (name) => {
    const entry = globals[name];
    if (!entry)
        return utils_1.impossible(`undefined global in getGlobal: ${name}`);
    return entry;
};
exports.getGlobal = getGlobal;
const getGlobals = () => globals;
exports.getGlobals = getGlobals;
const setGlobal = (name, type, universe, value, etype, term, erased) => {
    globals[name] = { type, universe, value, etype, term, erased };
};
exports.setGlobal = setGlobal;
const deleteGlobal = (name) => {
    delete globals[name];
};
exports.deleteGlobal = deleteGlobal;

},{"./utils/utils":15}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Local = exports.indexEnvT = exports.EntryT = void 0;
const List_1 = require("./utils/List");
const values_1 = require("./values");
const EntryT = (type, universe, erased, bound, inserted) => ({ type, universe, erased, bound, inserted });
exports.EntryT = EntryT;
const indexEnvT = (ts, ix) => {
    let l = ts;
    let i = 0;
    let erased = 0;
    while (l.isCons()) {
        if (l.head.inserted) {
            l = l.tail;
            i++;
            continue;
        }
        if (ix === 0)
            return [l.head, i, erased];
        if (l.head.erased)
            erased++;
        i++;
        ix--;
        l = l.tail;
    }
    return null;
};
exports.indexEnvT = indexEnvT;
class Local {
    constructor(erased, level, ns, nsSurface, ts, vs) {
        this.erased = erased;
        this.level = level;
        this.ns = ns;
        this.nsSurface = nsSurface;
        this.ts = ts;
        this.vs = vs;
    }
    static empty() {
        if (Local._empty === undefined)
            Local._empty = new Local(false, 0, List_1.nil, List_1.nil, List_1.nil, List_1.nil);
        return Local._empty;
    }
    bind(erased, name, ty, u) {
        return new Local(this.erased, this.level + 1, List_1.cons(name, this.ns), List_1.cons(name, this.nsSurface), List_1.cons(exports.EntryT(ty, u, erased, true, false), this.ts), List_1.cons(values_1.VVar(this.level), this.vs));
    }
    insert(erased, name, ty, u) {
        return new Local(this.erased, this.level + 1, List_1.cons(name, this.ns), this.nsSurface, List_1.cons(exports.EntryT(ty, u, erased, true, true), this.ts), List_1.cons(values_1.VVar(this.level), this.vs));
    }
    define(erased, name, ty, val, u) {
        return new Local(this.erased, this.level + 1, List_1.cons(name, this.ns), List_1.cons(name, this.nsSurface), List_1.cons(exports.EntryT(ty, u, erased, false, false), this.ts), List_1.cons(val, this.vs));
    }
    undo() {
        if (this.level === 0)
            return this;
        return new Local(this.erased, this.level - 1, this.ns.tail, this.nsSurface.tail, this.ts.tail, this.vs.tail);
    }
    inType() {
        return new Local(true, this.level, this.ns, this.nsSurface, this.ts, this.vs);
    }
}
exports.Local = Local;

},{"./utils/List":14,"./values":16}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allMetasSolved = exports.setMeta = exports.getMeta = exports.freshMeta = exports.resetMetas = exports.Solved = exports.Unsolved = void 0;
const utils_1 = require("./utils/utils");
const Unsolved = (universe) => ({ tag: 'Unsolved', universe });
exports.Unsolved = Unsolved;
const Solved = (solution) => ({ tag: 'Solved', solution });
exports.Solved = Solved;
let metas = [];
const resetMetas = () => { metas = []; };
exports.resetMetas = resetMetas;
const freshMeta = (universe) => {
    const id = metas.length;
    metas.push(exports.Unsolved(universe));
    return id;
};
exports.freshMeta = freshMeta;
const getMeta = (id) => {
    const entry = metas[id];
    if (!entry)
        return utils_1.impossible(`getMeta with undefined meta ${id}`);
    return entry;
};
exports.getMeta = getMeta;
const setMeta = (id, solution) => {
    const entry = metas[id];
    if (!entry)
        return utils_1.impossible(`setMeta with undefined meta ${id}`);
    if (entry.tag === 'Solved')
        return utils_1.impossible(`setMeta with solved meta ${id}`);
    metas[id] = exports.Solved(solution);
};
exports.setMeta = setMeta;
const allMetasSolved = () => metas.every(x => x.tag === 'Solved');
exports.allMetasSolved = allMetasSolved;

},{"./utils/utils":15}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chooseName = exports.nextName = void 0;
const nextName = (x) => {
    if (x === '_')
        return x;
    const s = x.split('$');
    if (s.length === 2)
        return `${s[0]}\$${+s[1] + 1}`;
    return `${x}\$0`;
};
exports.nextName = nextName;
const chooseName = (x, ns) => x === '_' ? x : ns.contains(x) ? exports.chooseName(exports.nextName(x), ns) : x;
exports.chooseName = chooseName;

},{}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDefs = exports.parseDef = exports.parse = void 0;
const utils_1 = require("./utils/utils");
const surface_1 = require("./surface");
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
const SYM1 = ['\\', ':', '=', ';', ','];
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
            else if (/[\*\-\.\/\?\@\#\%\_a-z]/i.test(c))
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
            if (!(/[a-z0-9\-\_\/\^]/i.test(c) || (c === '.' && /[a-z0-9]/i.test(next)))) {
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
const tunit = surface_1.Var('UnitType', 0);
const unit = surface_1.Var('Unit', 0);
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
    const s = surface_1.Var('S', 0);
    let c = surface_1.Var('Z', 0);
    for (let i = 0; i < n; i++)
        c = surface_1.App(s, false, c);
    return c;
};
const expr = (t) => {
    if (t.tag === 'List')
        return [exprs(t.list, '('), t.bracket === '{'];
    if (t.tag === 'Str') {
        const s = codepoints(t.str).reverse();
        const Cons = surface_1.Var('Cons', 0);
        const Nil = surface_1.Var('Nil', 0);
        return [s.reduce((t, n) => surface_1.App(surface_1.App(Cons, false, numToNat(n)), false, t), Nil), false];
    }
    if (t.tag === 'Name') {
        const x = t.name;
        if (x === '*')
            return [surface_1.Type(0), false];
        if (x.startsWith('*')) {
            const n = +x.slice(1);
            if (isNaN(n) || Math.floor(n) !== n || n < 0)
                return utils_1.serr(`invalid universe: ${x}`);
            return [surface_1.Type(n), false];
        }
        if (x.startsWith('_')) {
            const rest = x.slice(1);
            return [surface_1.Hole(rest.length > 0 ? rest : null), false];
        }
        if (x.startsWith('#')) {
            const full = x.slice(1);
            const n = +full;
            if (isNaN(n) || Math.floor(n) !== n || n < 0)
                return utils_1.serr(`invalid enum: ${x}`);
            return [surface_1.Enum(n), false];
        }
        if (x.startsWith('@')) {
            const full = x.slice(1);
            if (full.includes('/')) {
                const spl = full.split('/');
                if (spl.length !== 2)
                    return utils_1.serr(`invalid enum literal: ${x}`);
                const m = +spl[0];
                if (isNaN(m) || Math.floor(m) !== m || m < 0)
                    return utils_1.serr(`invalid enum literal: ${x}`);
                if (spl[1] === '')
                    return utils_1.serr(`invalid enum literal: ${x}`);
                const n = +spl[1];
                if (isNaN(n) || Math.floor(n) !== n || n < 0)
                    return utils_1.serr(`invalid enum literal: ${x}`);
                return [surface_1.EnumLit(m, n), false];
            }
            else {
                const n = +full;
                if (isNaN(n) || Math.floor(n) !== n || n < 0)
                    return utils_1.serr(`invalid enum literal: ${x}`);
                return [surface_1.EnumLit(n, null), false];
            }
        }
        if (/[a-z]/i.test(x[0])) {
            if (x.includes('^')) {
                const spl = x.split('^');
                if (spl.length !== 2)
                    return utils_1.serr(`invalid var: ${x}`);
                if (spl[1] === '')
                    return [surface_1.Var(spl[0], 1), false];
                const n = +spl[1];
                if (isNaN(n) || Math.floor(n) !== n || n < 0)
                    return utils_1.serr(`invalid var: ${x}`);
                return [surface_1.Var(spl[0], n), false];
            }
            return [surface_1.Var(x, 0), false];
        }
        return utils_1.serr(`invalid name: ${x}`);
    }
    if (t.tag === 'Num') {
        if (t.num.endsWith('b')) {
            const n = +t.num.slice(0, -1);
            if (isNaN(n))
                return utils_1.serr(`invalid number: ${t.num}`);
            const s0 = surface_1.Var('B0', 0);
            const s1 = surface_1.Var('B1', 0);
            let c = surface_1.Var('BE', 0);
            const s = n.toString(2);
            for (let i = 0; i < s.length; i++)
                c = surface_1.App(s[i] === '0' ? s0 : s1, false, c);
            return [c, false];
        }
        else if (t.num.endsWith('f')) {
            const n = +t.num.slice(0, -1);
            if (isNaN(n))
                return utils_1.serr(`invalid number: ${t.num}`);
            const s = surface_1.Var('FS', 0);
            let c = surface_1.Var('FZ', 0);
            for (let i = 0; i < n; i++)
                c = surface_1.App(s, false, c);
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
        return tunit;
    if (ts.length === 1)
        return expr(ts[0])[0];
    if (isName(ts[0], 'let')) {
        const x = ts[1];
        let name = 'ERROR';
        let erased = false;
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
            erased = true;
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
        if (ty)
            return surface_1.Let(erased, name, ty, val, body);
        return surface_1.Let(erased, name, null, val, body);
    }
    const i = ts.findIndex(x => isName(x, ':'));
    if (i >= 0) {
        const a = ts.slice(0, i);
        const b = ts.slice(i + 1);
        return surface_1.Let(false, 'x', exprs(b, '('), exprs(a, '('), surface_1.Var('x', 0));
    }
    if (ts[0].tag === 'Name' && ts[0].name.startsWith('?')) {
        const prefix = ts[0].name;
        const full = prefix.slice(1);
        let num = -1;
        let lvl = null;
        if (full.includes('^')) {
            const spl = full.split('^');
            if (spl.length !== 2)
                return utils_1.serr(`invalid enum elim: ${prefix}`);
            const m = +spl[0];
            if (isNaN(m) || Math.floor(m) !== m || m < 0)
                return utils_1.serr(`invalid enum elim: ${prefix}`);
            if (spl[1] === '') {
                num = m;
                lvl = 1;
            }
            else {
                const n = +spl[1];
                if (isNaN(n) || Math.floor(n) !== n || n < 0)
                    return utils_1.serr(`invalid enum elim: ${prefix}`);
                num = m;
                lvl = n;
            }
        }
        else {
            num = +full;
        }
        if (isNaN(num) || Math.floor(num) !== num || num < 0)
            return utils_1.serr(`invalid enum elim: ${prefix}`);
        if (!ts[1])
            return utils_1.serr(`enum elim is missing scrut: ${prefix}`);
        let scrut;
        let motive = null;
        const [e1, impl] = expr(ts[1]);
        if (impl) {
            motive = e1;
            if (!ts[2])
                return utils_1.serr(`enum elim is missing scrut: ${prefix}`);
            const [e2, impl] = expr(ts[2]);
            if (impl)
                return utils_1.serr(`enum elim scrutinee cannot be implicit: ${prefix}`);
            scrut = e2;
        }
        else
            scrut = e1;
        const cases = ts.slice(motive === null ? 2 : 3).map(x => {
            const [e, impl] = expr(x);
            if (impl)
                return utils_1.serr(`enum elim case cannot be implicit: ${prefix}`);
            return e;
        });
        return surface_1.ElimEnum(num, lvl, motive, scrut, cases);
    }
    if (isName(ts[0], 'Lift')) {
        const type = exprs(ts.slice(1), '(');
        return surface_1.Lift(type);
    }
    if (isName(ts[0], 'lift')) {
        const term = exprs(ts.slice(1), '(');
        return surface_1.LiftTerm(term);
    }
    if (isName(ts[0], 'lower')) {
        const term = exprs(ts.slice(1), '(');
        return surface_1.Lower(term);
    }
    if (isName(ts[0], 'fst') || isName(ts[0], 'snd')) {
        const term = exprs(ts.slice(1), '(');
        return surface_1.Proj(ts[0].name, term);
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
        return args.reduceRight((x, [name, impl, ty]) => surface_1.Abs(impl, name, ty, x), body);
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
        return args.reduceRight((x, [name, impl, ty]) => surface_1.Pi(impl, name, ty, x), body);
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
            return unit;
        if (args.length === 1) {
            args.push([unit, false]);
        }
        const last1 = args[args.length - 1];
        if (last1[1])
            return utils_1.serr(`second component of pair cannot be erased`);
        const last2 = args[args.length - 2];
        const lastitem = surface_1.Pair(false, last2[0], last1[0]);
        return args.slice(0, -2).reduceRight((x, [y, p]) => surface_1.Pair(p, y, x), lastitem);
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
        const lastitem = surface_1.Sigma(last[1], last[0], last[2], body[0]);
        return args.slice(0, -1).reduceRight((x, [name, impl, ty]) => surface_1.Sigma(impl, name, ty, x), lastitem);
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
    return all.slice(1).reduce((x, [y, impl]) => surface_1.App(x, impl, y), all[0][0]);
};
const parse = (s) => {
    const ts = tokenize(s);
    const ex = exprs(ts, '(');
    return ex;
};
exports.parse = parse;
const parseDef = async (c, importMap) => {
    if (c.length === 0)
        return [];
    if (c[0].tag === 'Name' && c[0].name === 'import') {
        const files = c.slice(1).map(t => {
            if (t.tag !== 'Name')
                return utils_1.serr(`trying to import a non-path`);
            if (importMap[t.name]) {
                config_1.log(() => `skipping import ${t.name}`);
                return null;
            }
            return t.name;
        }).filter(x => x);
        config_1.log(() => `import ${files.join(' ')}`);
        const imps = await Promise.all(files.map(utils_1.loadFile));
        const defs = await Promise.all(imps.map(s => exports.parseDefs(s, importMap)));
        const fdefs = defs.reduce((x, y) => x.concat(y), []);
        fdefs.forEach(t => importMap[t.name] = true);
        config_1.log(() => `imported ${fdefs.map(x => x.name).join(' ')}`);
        return fdefs;
    }
    else if (c[0].tag === 'Name' && c[0].name === 'def') {
        let name = '';
        let erased = false;
        if (c[1].tag === 'Name')
            name = c[1].name;
        else if (c[1].tag === 'List' && c[1].bracket === '{') {
            const xs = c[1].list;
            if (xs.length === 1 && xs[0].tag === 'Name') {
                name = xs[0].name;
                erased = true;
            }
            else
                return utils_1.serr(`invalid name for def`);
        }
        else
            return utils_1.serr(`invalid name for def`);
        const fst = 2;
        const sym = c[fst];
        if (sym.tag !== 'Name')
            return utils_1.serr(`def: after name should be : or =`);
        if (sym.name === '=') {
            return [surface_1.DDef(erased, name, exprs(c.slice(fst + 1), '('))];
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
            return [surface_1.DDef(erased, name, surface_1.Let(false, name, ety, body, surface_1.Var(name, 0)))];
        }
        else
            return utils_1.serr(`def: : or = expected but got ${sym.name}`);
    }
    else
        return utils_1.serr(`def should start with def or import`);
};
exports.parseDef = parseDef;
const parseDefs = async (s, importMap) => {
    const ts = tokenize(s);
    if (ts[0].tag !== 'Name' || (ts[0].name !== 'def' && ts[0].name !== 'import'))
        return utils_1.serr(`def should start with "def" or "import"`);
    const spl = splitTokens(ts, t => t.tag === 'Name' && (t.name === 'def' || t.name === 'import'), true);
    const ds = await Promise.all(spl.map(s => exports.parseDef(s, importMap)));
    return ds.reduce((x, y) => x.concat(y), []);
};
exports.parseDefs = parseDefs;

},{"./config":1,"./surface":10,"./utils/utils":15}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runREPL = exports.initREPL = void 0;
const config_1 = require("./config");
const parser_1 = require("./parser");
const surface_1 = require("./surface");
const C = require("./core");
const typecheck_1 = require("./typecheck");
const globals_1 = require("./globals");
const utils_1 = require("./utils/utils");
const elaboration_1 = require("./elaboration");
const List_1 = require("./utils/List");
const values_1 = require("./values");
const local_1 = require("./local");
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
[:showStackTrace] show stack trace of error
[:showFullNorm] show full normalization
[:t term] elaborate in erased context
`.trim();
let showStackTrace = false;
let showFullNorm = false;
let importMap = {};
const initREPL = () => {
    showStackTrace = false;
    showFullNorm = false;
    importMap = {};
};
exports.initREPL = initREPL;
const runREPL = (s_, cb) => {
    try {
        let s = s_.trim();
        if (s === ':help' || s === ':h')
            return cb(help);
        if (s === ':d' || s === ':debug') {
            const d = !config_1.config.debug;
            config_1.setConfig({ debug: d });
            return cb(`debug: ${d}`);
        }
        if (s === ':showStackTrace') {
            showStackTrace = !showStackTrace;
            return cb(`showStackTrace: ${showStackTrace}`);
        }
        if (s === ':showFullNorm') {
            showFullNorm = !showFullNorm;
            return cb(`showFullNorm: ${showFullNorm}`);
        }
        if (s === ':defs') {
            const gs = globals_1.getGlobals();
            const r = [];
            for (const x in gs)
                r.push(`def ${x} : ${surface_1.showVal(gs[x].type)} = ${surface_1.showCore(gs[x].term)}`);
            return cb(r.length === 0 ? 'no definitions' : r.join('\n'));
        }
        if (s.startsWith(':del')) {
            const names = s.slice(4).trim().split(/\s+/g);
            names.forEach(x => globals_1.deleteGlobal(x));
            return cb(`deleted ${names.join(' ')}`);
        }
        if (s.startsWith(':view')) {
            const files = s.slice(5).trim().split(/\s+/g);
            Promise.all(files.map(utils_1.loadFile)).then(ds => {
                return cb(ds.join('\n\n'));
            }).catch(err => cb('' + err, true));
            return;
        }
        if (s.startsWith(':clearImportMap')) {
            importMap = {};
            return cb(`cleared import map`);
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
            return cb(surface_1.showVal(res.type, 0, true));
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
            return cb(surface_1.showVal(res.value));
        }
        if (s.startsWith(':gnorm')) {
            const name = s.slice(6).trim();
            const res = globals_1.getGlobal(name);
            if (!res)
                return cb(`undefined global: ${name}`, true);
            return cb(surface_1.showVal(res.value, 0, true));
        }
        if (s.startsWith(':lift')) {
            const name = s.slice(5).trim();
            const res = globals_1.getGlobal(name);
            if (!res)
                return cb(`undefined global: ${name}`, true);
            const eterm = C.liftType(1, res.term);
            const [type] = typecheck_1.typecheck(eterm, local_1.Local.empty().inType());
            return cb(`term: ${surface_1.showCore(eterm)}\ntype: ${surface_1.showCore(type)}`);
        }
        let inType = false;
        if (s.startsWith(':t')) {
            inType = true;
            s = s.slice(2);
        }
        if (s.startsWith(':'))
            return cb(`invalid command: ${s}`, true);
        if (['def', 'import'].some(x => s.startsWith(x))) {
            parser_1.parseDefs(s, importMap).then(ds => {
                elaboration_1.elaborateDefs(ds); // TODO: show which items were defined
                return cb(`done`);
            }).catch(err => cb(`${err}`, true));
            return;
        }
        const term = parser_1.parse(s);
        config_1.log(() => surface_1.show(term));
        config_1.log(() => 'ELABORATE');
        const [eterm, etype] = elaboration_1.elaborate(term, inType);
        config_1.log(() => C.show(eterm));
        config_1.log(() => surface_1.showCore(eterm));
        config_1.log(() => C.show(etype));
        config_1.log(() => surface_1.showCore(etype));
        config_1.log(() => 'TYPECHECK');
        const [ttype] = typecheck_1.typecheck(eterm, inType ? local_1.Local.empty().inType() : local_1.Local.empty());
        config_1.log(() => C.show(ttype));
        config_1.log(() => surface_1.showCore(ttype));
        config_1.log(() => 'NORMALIZE');
        const norm = values_1.normalize(eterm);
        config_1.log(() => surface_1.showCore(norm));
        const fnorm = values_1.normalize(eterm, 0, List_1.nil, true);
        config_1.log(() => surface_1.showCore(fnorm));
        return cb(`term: ${surface_1.show(term)}\ntype: ${surface_1.showCore(etype)}\netrm: ${surface_1.showCore(eterm)}\nnorm: ${surface_1.showCore(norm)}${showFullNorm ? `\nnorf: ${surface_1.showCore(fnorm)}` : ''}`);
    }
    catch (err) {
        if (showStackTrace)
            console.error(err);
        return cb(`${err}`, true);
    }
};
exports.runREPL = runREPL;

},{"./config":1,"./core":2,"./elaboration":3,"./globals":4,"./local":5,"./parser":8,"./surface":10,"./typecheck":11,"./utils/List":14,"./utils/utils":15,"./values":16}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showDefs = exports.showDef = exports.DDef = exports.showVal = exports.showCore = exports.toSurface = exports.show = exports.flattenPair = exports.flattenApp = exports.flattenAbs = exports.flattenSigma = exports.flattenPi = exports.Hole = exports.Meta = exports.Lower = exports.LiftTerm = exports.Lift = exports.EnumLit = exports.ElimEnum = exports.Enum = exports.Proj = exports.Pair = exports.Sigma = exports.App = exports.Abs = exports.Pi = exports.Let = exports.Type = exports.Var = void 0;
const names_1 = require("./names");
const List_1 = require("./utils/List");
const utils_1 = require("./utils/utils");
const values_1 = require("./values");
const Var = (name, lift) => ({ tag: 'Var', name, lift });
exports.Var = Var;
const Type = (index) => ({ tag: 'Type', index });
exports.Type = Type;
const Let = (erased, name, type, val, body) => ({ tag: 'Let', erased, name, type, val, body });
exports.Let = Let;
const Pi = (erased, name, type, body) => ({ tag: 'Pi', erased, name, type, body });
exports.Pi = Pi;
const Abs = (erased, name, type, body) => ({ tag: 'Abs', erased, name, type, body });
exports.Abs = Abs;
const App = (fn, erased, arg) => ({ tag: 'App', fn, erased, arg });
exports.App = App;
const Sigma = (erased, name, type, body) => ({ tag: 'Sigma', erased, name, type, body });
exports.Sigma = Sigma;
const Pair = (erased, fst, snd) => ({ tag: 'Pair', erased, fst, snd });
exports.Pair = Pair;
const Proj = (proj, term) => ({ tag: 'Proj', proj, term });
exports.Proj = Proj;
const Enum = (num) => ({ tag: 'Enum', num });
exports.Enum = Enum;
const ElimEnum = (num, lift, motive, scrut, cases) => ({ tag: 'ElimEnum', num, lift, motive, scrut, cases });
exports.ElimEnum = ElimEnum;
const EnumLit = (val, num) => ({ tag: 'EnumLit', val, num });
exports.EnumLit = EnumLit;
const Lift = (type) => ({ tag: 'Lift', type });
exports.Lift = Lift;
const LiftTerm = (term) => ({ tag: 'LiftTerm', term });
exports.LiftTerm = LiftTerm;
const Lower = (term) => ({ tag: 'Lower', term });
exports.Lower = Lower;
const Meta = (id) => ({ tag: 'Meta', id });
exports.Meta = Meta;
const Hole = (name) => ({ tag: 'Hole', name });
exports.Hole = Hole;
const flattenPi = (t) => {
    const params = [];
    let c = t;
    while (c.tag === 'Pi') {
        params.push([c.erased, c.name, c.type]);
        c = c.body;
    }
    return [params, c];
};
exports.flattenPi = flattenPi;
const flattenSigma = (t) => {
    const params = [];
    let c = t;
    while (c.tag === 'Sigma') {
        params.push([c.erased, c.name, c.type]);
        c = c.body;
    }
    return [params, c];
};
exports.flattenSigma = flattenSigma;
const flattenAbs = (t) => {
    const params = [];
    let c = t;
    while (c.tag === 'Abs') {
        params.push([c.erased, c.name, c.type]);
        c = c.body;
    }
    return [params, c];
};
exports.flattenAbs = flattenAbs;
const flattenApp = (t) => {
    const args = [];
    let c = t;
    while (c.tag === 'App') {
        args.push([c.erased, c.arg]);
        c = c.fn;
    }
    return [c, args.reverse()];
};
exports.flattenApp = flattenApp;
const flattenPair = (t) => {
    const ps = [];
    let c = t;
    while (c.tag === 'Pair') {
        ps.push([c.erased, c.fst]);
        c = c.snd;
    }
    return [ps, c];
};
exports.flattenPair = flattenPair;
const showP = (b, t) => b ? `(${exports.show(t)})` : exports.show(t);
const isSimple = (t) => t.tag === 'Var' || t.tag === 'Meta' || t.tag === 'Type' || t.tag === 'Enum' || t.tag === 'EnumLit' || t.tag === 'Hole' || t.tag === 'Pair';
const showS = (t) => showP(!isSimple(t), t);
const show = (t) => {
    if (t.tag === 'Var')
        return `${t.name}${t.lift === 0 ? '' : t.lift === 1 ? '^' : `^${t.lift}`}`;
    if (t.tag === 'Type')
        return `*${t.index > 0 ? t.index : ''}`;
    if (t.tag === 'Meta')
        return `?${t.id}`;
    if (t.tag === 'Hole')
        return `_${t.name || ''}`;
    if (t.tag === 'Enum')
        return `#${t.num}`;
    if (t.tag === 'ElimEnum')
        return `?${t.num}${t.lift === null ? '' : t.lift === 0 ? '' : t.lift === 1 ? '^' : `^${t.lift}`}${t.motive ? ` {${exports.show(t.motive)}}` : ''} ${showS(t.scrut)}${t.cases.length > 0 ? ' ' : ''}${t.cases.map(showS).join(' ')}`;
    if (t.tag === 'EnumLit')
        return `@${t.val}${t.num === null ? '' : `/${t.num}`}`;
    if (t.tag === 'Pi') {
        const [params, ret] = exports.flattenPi(t);
        return `${params.map(([e, x, t]) => !e && x === '_' ? showP(t.tag === 'Pi' || t.tag === 'Let', t) : `${e ? '{' : '('}${x} : ${exports.show(t)}${e ? '}' : ')'}`).join(' -> ')} -> ${exports.show(ret)}`;
    }
    if (t.tag === 'Abs') {
        const [params, body] = exports.flattenAbs(t);
        return `\\${params.map(([e, x, t]) => !t ? `${e ? '{' : ''}${x}${e ? '}' : ''}` : `${e ? '{' : '('}${x} : ${exports.show(t)}${e ? '}' : ')'}`).join(' ')}. ${exports.show(body)}`;
    }
    if (t.tag === 'App') {
        const [fn, args] = exports.flattenApp(t);
        return `${showS(fn)} ${args.map(([e, a]) => e ? `{${exports.show(a)}}` : showS(a)).join(' ')}`;
    }
    if (t.tag === 'Sigma') {
        const [params, ret] = exports.flattenSigma(t);
        return `${params.map(([e, x, t]) => !e && x === '_' ? showP(t.tag === 'Sigma' || t.tag === 'Let', t) : `${e ? '{' : '('}${x} : ${exports.show(t)}${e ? '}' : ')'}`).join(' ** ')} ** ${exports.show(ret)}`;
    }
    if (t.tag === 'Pair') {
        const [ps, ret] = exports.flattenPair(t);
        return `(${ps.map(([e, x]) => e ? `{${exports.show(x)}}` : `${exports.show(x)}`).join(', ')}, ${exports.show(ret)})`;
    }
    if (t.tag === 'Let')
        return `let ${t.erased ? '{' : ''}${t.name}${t.erased ? '}' : ''}${!t.type ? '' : ` : ${showP(t.type.tag === 'Let', t.type)}`} = ${showP(t.val.tag === 'Let', t.val)}; ${exports.show(t.body)}`;
    if (t.tag === 'Lift')
        return `Lift ${showS(t.type)}`;
    if (t.tag === 'LiftTerm')
        return `lift ${showS(t.term)}`;
    if (t.tag === 'Lower')
        return `lower ${showS(t.term)}`;
    if (t.tag === 'Proj')
        return `${t.proj} ${showS(t.term)}`;
    return t;
};
exports.show = show;
const toSurface = (t, ns = List_1.nil) => {
    if (t.tag === 'Global')
        return exports.Var(t.name, t.lift);
    if (t.tag === 'Type')
        return exports.Type(t.index);
    if (t.tag === 'Enum')
        return exports.Enum(t.num);
    if (t.tag === 'ElimEnum')
        return exports.ElimEnum(t.num, t.lift, exports.toSurface(t.motive, ns), exports.toSurface(t.scrut, ns), t.cases.map(x => exports.toSurface(x, ns)));
    if (t.tag === 'EnumLit')
        return exports.EnumLit(t.val, t.num);
    if (t.tag === 'Meta' || t.tag === 'InsertedMeta')
        return exports.Meta(t.id);
    if (t.tag === 'Var')
        return exports.Var(ns.index(t.index) || utils_1.impossible(`var out of range in toSurface: ${t.index}`), 0);
    if (t.tag === 'App')
        return exports.App(exports.toSurface(t.fn, ns), t.erased, exports.toSurface(t.arg, ns));
    if (t.tag === 'Abs') {
        const x = names_1.chooseName(t.name, ns);
        return exports.Abs(t.erased, x, exports.toSurface(t.type, ns), exports.toSurface(t.body, List_1.cons(x, ns)));
    }
    if (t.tag === 'Pi') {
        const x = names_1.chooseName(t.name, ns);
        return exports.Pi(t.erased, x, exports.toSurface(t.type, ns), exports.toSurface(t.body, List_1.cons(x, ns)));
    }
    if (t.tag === 'Sigma') {
        const x = names_1.chooseName(t.name, ns);
        return exports.Sigma(t.erased, x, exports.toSurface(t.type, ns), exports.toSurface(t.body, List_1.cons(x, ns)));
    }
    if (t.tag === 'Pair')
        return exports.Pair(t.erased, exports.toSurface(t.fst, ns), exports.toSurface(t.snd, ns));
    if (t.tag === 'Let') {
        const x = names_1.chooseName(t.name, ns);
        return exports.Let(t.erased, x, exports.toSurface(t.type, ns), exports.toSurface(t.val, ns), exports.toSurface(t.body, List_1.cons(x, ns)));
    }
    if (t.tag === 'Lift')
        return exports.Lift(exports.toSurface(t.type, ns));
    if (t.tag === 'LiftTerm')
        return exports.LiftTerm(exports.toSurface(t.term, ns));
    if (t.tag === 'Lower')
        return exports.Lower(exports.toSurface(t.term, ns));
    if (t.tag === 'Proj')
        return exports.Proj(t.proj, exports.toSurface(t.term, ns));
    return t;
};
exports.toSurface = toSurface;
const showCore = (t, ns = List_1.nil) => exports.show(exports.toSurface(t, ns));
exports.showCore = showCore;
const showVal = (v, k = 0, full = false, ns = List_1.nil) => exports.show(exports.toSurface(values_1.quote(v, k, full), ns));
exports.showVal = showVal;
const DDef = (erased, name, value) => ({ tag: 'DDef', erased, name, value });
exports.DDef = DDef;
const showDef = (d) => {
    if (d.tag === 'DDef')
        return `def ${d.erased ? '{' : ''}${d.name}${d.erased ? '}' : ''} = ${exports.show(d.value)}`;
    return d.tag;
};
exports.showDef = showDef;
const showDefs = (ds) => ds.map(exports.showDef).join('\n');
exports.showDefs = showDefs;

},{"./names":7,"./utils/List":14,"./utils/utils":15,"./values":16}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typecheck = void 0;
const config_1 = require("./config");
const core_1 = require("./core");
const globals_1 = require("./globals");
const local_1 = require("./local");
const utils_1 = require("./utils/utils");
const values_1 = require("./values");
const V = require("./values");
const unification_1 = require("./unification");
const showV = (local, v) => V.show(v, local.level);
const check = (local, tm, ty, u) => {
    config_1.log(() => `check (*${u}) ${core_1.show(tm)} : ${showV(local, ty)}`);
    const [ty2, u2] = synth(local, tm);
    return utils_1.tryT(() => {
        if (u !== u2)
            return utils_1.terr(`universe mismatch: *${u2} ~ *${u}`);
        config_1.log(() => `unify ${showV(local, ty2)} ~ ${showV(local, ty)}`);
        unification_1.unify(local.level, ty2, ty);
        return;
    }, e => utils_1.terr(`check failed (${core_1.show(tm)}): ${showV(local, ty2)} ~ ${showV(local, ty)}: ${e}`));
};
const synthType = (local, tm) => {
    const [ty] = synth(local, tm);
    const fty = values_1.force(ty);
    if (fty.tag !== 'VType')
        return utils_1.terr(`expected type but got ${showV(local, ty)}, while synthesizing ${core_1.show(tm)}`);
    return fty.index;
};
const synth = (local, tm) => {
    config_1.log(() => `synth ${core_1.show(tm)}`);
    if (tm.tag === 'Type') {
        if (!local.erased)
            return utils_1.terr(`type in non-type context: ${core_1.show(tm)}`);
        return [values_1.VType(tm.index + 1), tm.index + 2];
    }
    if (tm.tag === 'Var') {
        const [entry] = local_1.indexEnvT(local.ts, tm.index) || utils_1.terr(`var out of scope ${core_1.show(tm)}`);
        if (entry.erased && !local.erased)
            return utils_1.terr(`erased var used ${core_1.show(tm)}`);
        return [entry.type, entry.universe];
    }
    if (tm.tag === 'Global') {
        const e = globals_1.getGlobal(tm.name);
        if (!e)
            return utils_1.terr(`undefined global ${core_1.show(tm)}`);
        if (e.erased && !local.erased)
            return utils_1.terr(`erased global used: ${core_1.show(tm)}`);
        if (tm.lift === 0) {
            return [e.type, e.universe];
        }
        else {
            return [values_1.evaluate(core_1.liftType(tm.lift, e.etype), local.vs), e.universe + tm.lift];
        }
    }
    if (tm.tag === 'App') {
        const [fnty] = synth(local, tm.fn);
        const rty = synthapp(local, fnty, tm.erased, tm.arg);
        return rty;
    }
    if (tm.tag === 'Abs') {
        const u1 = synthType(local.inType(), tm.type);
        const ty = values_1.evaluate(tm.type, local.vs);
        const [rty, u2] = synth(local.bind(tm.erased, tm.name, ty, u1), tm.body);
        const qpi = core_1.Pi(tm.erased, tm.name, tm.type, u1, values_1.quote(rty, local.level + 1), u2);
        const pi = values_1.evaluate(qpi, local.vs);
        return [pi, Math.max(u1, u2)];
    }
    if (tm.tag === 'Pair') {
        synthType(local.inType(), tm.type);
        const ty = values_1.evaluate(tm.type, local.vs);
        const fty = values_1.force(ty);
        if (fty.tag !== 'VSigma')
            return utils_1.terr(`not a sigma type in pair (${core_1.show(tm)}): ${showV(local, ty)}`);
        if (tm.erased !== fty.erased)
            return utils_1.terr(`erasure mismatch in pair (${core_1.show(tm)}): ${showV(local, ty)}`);
        check(tm.erased ? local.inType() : local, tm.fst, fty.type, fty.u1);
        check(local, tm.snd, values_1.vinst(fty, values_1.evaluate(tm.fst, local.vs)), fty.u2);
        return [ty, fty.u2];
    }
    if (tm.tag === 'Proj') {
        const [ty] = synth(local, tm.term);
        const fty = values_1.force(ty);
        if (fty.tag !== 'VSigma')
            return utils_1.terr(`not a sigma type in proj (${core_1.show(tm)}): ${showV(local, ty)}`);
        return tm.proj === 'fst' ? [fty.type, fty.u1] : [values_1.vinst(fty, V.vproj('fst', values_1.evaluate(tm, local.vs))), fty.u2];
    }
    if (tm.tag === 'Pi') {
        if (!local.erased)
            return utils_1.terr(`pi type in non-type context: ${core_1.show(tm)}`);
        const s1 = synthType(local.inType(), tm.type);
        const ty = values_1.evaluate(tm.type, local.vs);
        const s2 = synthType(local.inType().bind(tm.erased, tm.name, ty, s1), tm.body);
        const u = Math.max(s1, s2);
        return [values_1.VType(u), u + 1];
    }
    if (tm.tag === 'Sigma') {
        if (!local.erased)
            return utils_1.terr(`sigma type in non-type context: ${core_1.show(tm)}`);
        const s1 = synthType(local.inType(), tm.type);
        const ty = values_1.evaluate(tm.type, local.vs);
        const s2 = synthType(local.inType().bind(tm.erased, tm.name, ty, s1), tm.body);
        const u = Math.max(s1, s2);
        return [values_1.VType(u), u + 1];
    }
    if (tm.tag === 'Let') {
        const u1 = synthType(local.inType(), tm.type);
        const ty = values_1.evaluate(tm.type, local.vs);
        check(tm.erased ? local.inType() : local, tm.val, ty, u1);
        const v = values_1.evaluate(tm.val, local.vs);
        const rty = synth(local.define(tm.erased, tm.name, ty, v, u1), tm.body);
        return rty;
    }
    if (tm.tag === 'Enum') {
        if (!local.erased)
            return utils_1.terr(`enum type in non-type context: ${core_1.show(tm)}`);
        return [values_1.VType(0), 1];
    }
    if (tm.tag === 'EnumLit') {
        if (tm.val >= tm.num)
            return utils_1.terr(`invalid enum literal: ${core_1.show(tm)}`);
        return [V.VEnum(tm.num), 0];
    }
    if (tm.tag === 'ElimEnum') {
        if (tm.cases.length !== tm.num)
            return utils_1.terr(`cases amount mismatch, expected ${tm.num} but got ${tm.cases.length}: ${core_1.show(tm)}`);
        /*
        P : #n^l -> *l
        x : #n^l
        ci : P (@i/n^l)
        ----------------------
        ?n^l P x c1 ... cn : P x
        */
        const u = tm.lift + 1;
        check(local.inType(), tm.motive, V.VPi(false, '_', V.VEnum(tm.num), 0, _ => values_1.VType(tm.lift), u), u);
        const motive = values_1.evaluate(tm.motive, local.vs);
        check(local, tm.scrut, V.VEnum(tm.num), 0);
        const scrut = values_1.evaluate(tm.scrut, local.vs);
        tm.cases.forEach((c, i) => check(local, c, V.vapp(motive, false, V.VEnumLit(i, tm.num)), tm.lift));
        return [V.vapp(motive, false, scrut), tm.lift];
    }
    if (tm.tag === 'Lift') {
        if (!local.erased)
            return utils_1.terr(`Lift type in non-type context: ${core_1.show(tm)}`);
        /*
        t : *k : u
        -------------------
        Lift t : *(k + 1) : u + 1
        */
        const [ty, u] = synth(local, tm.type);
        const vty = values_1.force(ty);
        if (vty.tag !== 'VType')
            return utils_1.terr(`not a type in ${core_1.show(tm)}: ${showV(local, ty)}`);
        return [values_1.VType(vty.index + 1), u + 1];
    }
    if (tm.tag === 'LiftTerm') {
        /*
        t : A : u
        -------------------
        lift t : Lift A : u + 1
        */
        const [ty, u] = synth(local, tm.term);
        return [V.VLift(ty), u + 1];
    }
    if (tm.tag === 'Lower') {
        /*
        t : Lift A : u
        -------------------
        lower t : A : u - 1
        */
        const [ty, u] = synth(local, tm.term);
        const vty = values_1.force(ty);
        if (vty.tag !== 'VLift')
            return utils_1.terr(`not a Lift type in ${core_1.show(tm)}: ${showV(local, ty)}`);
        return [vty.type, u - 1];
    }
    if (tm.tag === 'Meta' || tm.tag === 'InsertedMeta')
        return utils_1.impossible(`${tm.tag} in typecheck`);
    return tm;
};
const synthapp = (local, ty_, erased, arg) => {
    config_1.log(() => `synthapp ${showV(local, ty_)} ${erased ? '-' : ''}@ ${core_1.show(arg)}`);
    const ty = values_1.force(ty_);
    if (ty.tag === 'VPi' && ty.erased === erased) {
        check(erased ? local.inType() : local, arg, ty.type, ty.u1);
        const v = values_1.evaluate(arg, local.vs);
        return [values_1.vinst(ty, v), ty.u2];
    }
    return utils_1.terr(`not a correct pi type in synthapp: ${showV(local, ty)} ${erased ? '-' : ''}@ ${core_1.show(arg)}`);
};
const typecheck = (t, local = local_1.Local.empty()) => {
    const [vty, u] = synth(local, t);
    const ty = values_1.quote(vty, local.level);
    return [ty, u];
};
exports.typecheck = typecheck;

},{"./config":1,"./core":2,"./globals":4,"./local":5,"./unification":12,"./utils/utils":15,"./values":16}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unify = void 0;
const config_1 = require("./config");
const core_1 = require("./core");
const metas_1 = require("./metas");
const List_1 = require("./utils/List");
const utils_1 = require("./utils/utils");
const values_1 = require("./values");
const C = require("./core");
const insert = (map, key, value) => ({ ...map, [key]: value });
const PRen = (dom, cod, ren) => ({ dom, cod, ren });
const lift = (pren) => PRen(pren.dom + 1, pren.cod + 1, insert(pren.ren, pren.cod, pren.dom));
const invertSpine = (sp) => sp.foldr((app, [dom, ren]) => {
    if (app.tag !== 'EApp')
        return utils_1.terr(`not a variable in the spine: ${app.tag}`);
    const v = values_1.force(app.arg);
    if (!values_1.isVVar(v))
        return utils_1.terr(`not a variable in the spine`);
    const x = v.head;
    if (typeof ren[x] === 'number')
        return utils_1.terr(`non-linear spine`);
    return [dom + 1, insert(ren, x, dom)];
}, [0, {}]);
const invert = (gamma, sp) => {
    const [dom, ren] = invertSpine(sp);
    return PRen(dom, gamma, ren);
};
const renameElim = (id, pren, t, e) => {
    if (e.tag === 'EApp')
        return core_1.App(t, e.erased, rename(id, pren, e.arg));
    if (e.tag === 'EElimEnum')
        return core_1.ElimEnum(e.num, e.lift, rename(id, pren, e.motive), t, e.cases.map(x => rename(id, pren, x)));
    if (e.tag === 'ELower')
        return C.Lower(t);
    if (e.tag === 'EProj')
        return C.Proj(e.proj, t);
    return e;
};
const renameSpine = (id, pren, t, sp) => sp.foldr((app, fn) => renameElim(id, pren, fn, app), t);
const rename = (id, pren, v_) => {
    const v = values_1.force(v_, false);
    if (v.tag === 'VFlex') {
        if (v.head === id)
            return utils_1.terr(`occurs check failed: ${id}`);
        return renameSpine(id, pren, core_1.Meta(v.head), v.spine);
    }
    if (v.tag === 'VRigid') {
        const x = pren.ren[v.head];
        if (typeof x !== 'number')
            return utils_1.terr(`escaping variable ${v.head}`);
        return renameSpine(id, pren, core_1.Var(pren.dom - x - 1), v.spine);
    }
    if (v.tag === 'VAbs')
        return core_1.Abs(v.erased, v.name, rename(id, pren, v.type), rename(id, lift(pren), values_1.vinst(v, values_1.VVar(pren.cod))));
    if (v.tag === 'VPi')
        return core_1.Pi(v.erased, v.name, rename(id, pren, v.type), v.u1, rename(id, lift(pren), values_1.vinst(v, values_1.VVar(pren.cod))), v.u2);
    if (v.tag === 'VSigma')
        return core_1.Sigma(v.erased, v.name, rename(id, pren, v.type), v.u1, rename(id, lift(pren), values_1.vinst(v, values_1.VVar(pren.cod))), v.u2);
    if (v.tag === 'VType')
        return core_1.Type(v.index);
    if (v.tag === 'VGlobal')
        return renameSpine(id, pren, core_1.Global(v.name, v.lift), v.spine); // TODO: should global be forced?
    if (v.tag === 'VEnum')
        return core_1.Enum(v.num);
    if (v.tag === 'VEnumLit')
        return core_1.EnumLit(v.val, v.num);
    if (v.tag === 'VPair')
        return core_1.Pair(v.erased, rename(id, pren, v.fst), rename(id, pren, v.snd), rename(id, pren, v.type));
    if (v.tag === 'VLift')
        return core_1.Lift(rename(id, pren, v.type));
    if (v.tag === 'VLiftTerm')
        return core_1.LiftTerm(rename(id, pren, v.term));
    return v;
};
const lams = (is, t, n = 0) => is.case(() => t, (i, rest) => core_1.Abs(i, `x${n}`, core_1.Type(0), lams(rest, t, n + 1))); // TODO: lambda type
const solve = (gamma, m, sp, rhs_) => {
    config_1.log(() => `solve ?${m}${sp.reverse().toString(v => v.tag === 'EApp' ? `${v.erased ? '{' : ''}${values_1.show(v.arg, gamma)}${v.erased ? '}' : ''}` : v.tag)} := ${values_1.show(rhs_, gamma)}`);
    const pren = invert(gamma, sp);
    const rhs = rename(m, pren, rhs_);
    const solutionq = lams(sp.reverse().map(app => app.erased), rhs);
    config_1.log(() => `solution: ${C.show(solutionq)}`);
    const solution = values_1.evaluate(solutionq, List_1.nil);
    metas_1.setMeta(m, solution);
};
const unifyElim = (l, a, b) => {
    if (a === b)
        return;
    if (a.tag === 'ELower' && b.tag === 'ELower')
        return;
    if (a.tag === 'EProj' && b.tag === 'EProj' && a.proj === b.proj)
        return;
    if (a.tag === 'EApp' && b.tag === 'EApp')
        return exports.unify(l, a.arg, b.arg);
    if (a.tag === 'EElimEnum' && b.tag === 'EElimEnum' && a.num === b.num && a.cases.length === b.cases.length) {
        exports.unify(l, a.motive, b.motive);
        a.cases.forEach((ca, i) => exports.unify(l, ca, b.cases[i]));
        return;
    }
    return utils_1.terr(`cannot unify elims`);
};
const unifySpines = (l, a, b) => a.zipWithR_(b, (x, y) => unifyElim(l, x, y));
const unify = (l, a_, b_) => {
    const a = values_1.force(a_, false);
    const b = values_1.force(b_, false);
    config_1.log(() => `unify ${values_1.show(a, l)} ~ ${values_1.show(b, l)}`);
    if (a === b)
        return;
    if (a.tag === 'VType' && b.tag === 'VType' && a.index === b.index)
        return;
    if (a.tag === 'VEnum' && b.tag === 'VEnum' && a.num === b.num)
        return;
    if (a.tag === 'VEnumLit' && b.tag === 'VEnumLit' && a.val === b.val && a.num === b.num)
        return;
    if (a.tag === 'VEnumLit' && a.num === 1)
        return;
    if (b.tag === 'VEnumLit' && b.num === 1)
        return;
    if (a.tag === 'VLift' && b.tag === 'VLift')
        return exports.unify(l, a.type, b.type);
    if (a.tag === 'VLiftTerm' && b.tag === 'VLiftTerm')
        return exports.unify(l, a.term, b.term);
    if (a.tag === 'VAbs' && b.tag === 'VAbs') {
        const v = values_1.VVar(l);
        return exports.unify(l + 1, values_1.vinst(a, v), values_1.vinst(b, v));
    }
    if (a.tag === 'VAbs') {
        const v = values_1.VVar(l);
        return exports.unify(l + 1, values_1.vinst(a, v), values_1.vapp(b, a.erased, v));
    }
    if (b.tag === 'VAbs') {
        const v = values_1.VVar(l);
        return exports.unify(l + 1, values_1.vapp(a, b.erased, v), values_1.vinst(b, v));
    }
    if (a.tag === 'VPi' && b.tag === 'VPi' && a.erased === b.erased) {
        exports.unify(l, a.type, b.type);
        const v = values_1.VVar(l);
        return exports.unify(l + 1, values_1.vinst(a, v), values_1.vinst(b, v));
    }
    if (a.tag === 'VSigma' && b.tag === 'VSigma' && a.erased === b.erased) {
        exports.unify(l, a.type, b.type);
        const v = values_1.VVar(l);
        return exports.unify(l + 1, values_1.vinst(a, v), values_1.vinst(b, v));
    }
    if (a.tag === 'VPair' && b.tag === 'VPair' && a.erased === b.erased) {
        exports.unify(l, a.fst, b.fst);
        exports.unify(l, a.snd, b.snd);
        return;
    }
    if (a.tag === 'VPair') {
        exports.unify(l, a.fst, values_1.vproj('fst', b));
        exports.unify(l, a.snd, values_1.vproj('snd', b));
        return;
    }
    if (b.tag === 'VPair') {
        exports.unify(l, values_1.vproj('fst', a), b.fst);
        exports.unify(l, values_1.vproj('snd', a), b.snd);
        return;
    }
    if (a.tag === 'VRigid' && b.tag === 'VRigid' && a.head === b.head)
        return utils_1.tryT(() => unifySpines(l, a.spine, b.spine), e => utils_1.terr(`failed to unify: ${values_1.show(a, l)} ~ ${values_1.show(b, l)}: ${e}`));
    if (a.tag === 'VFlex' && b.tag === 'VFlex' && a.head === b.head)
        return utils_1.tryT(() => unifySpines(l, a.spine, b.spine), e => utils_1.terr(`failed to unify: ${values_1.show(a, l)} ~ ${values_1.show(b, l)}: ${e}`));
    if (a.tag === 'VFlex')
        return solve(l, a.head, a.spine, b);
    if (b.tag === 'VFlex')
        return solve(l, b.head, b.spine, a);
    if (a.tag === 'VGlobal' && b.tag === 'VGlobal' && a.name === b.name && a.lift === b.lift)
        return utils_1.tryT(() => unifySpines(l, a.spine, b.spine), () => exports.unify(l, a.val.get(), b.val.get()));
    if (a.tag === 'VGlobal')
        return exports.unify(l, a.val.get(), b);
    if (b.tag === 'VGlobal')
        return exports.unify(l, a, b.val.get());
    return utils_1.terr(`failed to unify: ${values_1.show(a, l)} ~ ${values_1.show(b, l)}`);
};
exports.unify = unify;

},{"./config":1,"./core":2,"./metas":6,"./utils/List":14,"./utils/utils":15,"./values":16}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lazy = void 0;
class Lazy {
    constructor(fn) {
        this.forced = false;
        this.value = null;
        this.fn = fn;
    }
    static from(fn) {
        return new Lazy(fn);
    }
    static of(val) {
        return Lazy.from(() => val);
    }
    static value(val) {
        const l = new Lazy(() => val);
        l.forced = true;
        l.value = val;
        return l;
    }
    get() {
        if (!this.forced) {
            this.value = this.fn();
            this.forced = true;
        }
        return this.value;
    }
    map(fn) {
        return new Lazy(() => fn(this.get()));
    }
}
exports.Lazy = Lazy;

},{}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cons = exports.nil = exports.Cons = exports.Nil = exports.List = void 0;
const utils_1 = require("./utils");
class List {
    static Nil() {
        if (List._Nil === undefined)
            List._Nil = new Nil();
        return List._Nil;
    }
    static Cons(head, tail) { return new Cons(head, tail); }
    static from(values) {
        let l = List.Nil();
        for (let i = values.length - 1; i >= 0; i--)
            l = List.Cons(values[i], l);
        return l;
    }
    static of(...values) { return List.from(values); }
    static range(n) {
        let l = List.Nil();
        for (let i = 0; i < n; i++)
            l = List.Cons(i, l);
        return l;
    }
    toString(fn = val => `${val}`) {
        return `[${this.toMappedArray(fn).join(', ')}]`;
    }
    contains(val) { return this.indexOf(val) >= 0; }
}
exports.List = List;
class Nil extends List {
    isNil() { return true; }
    isCons() { return false; }
    case(nil, _cons) { return nil(); }
    caseFull(nil, _cons) { return nil(this); }
    toString() { return '[]'; }
    toMappedArray() { return []; }
    toArray() { return []; }
    map() { return this; }
    each() { }
    index() { return null; }
    updateAt() { return this; }
    findIndex() { return -1; }
    find() { return null; }
    indexOf() { return -1; }
    contains() { return false; }
    reverse() { return this; }
    zip() { return this; }
    zipWith() { return this; }
    zipWith_() { }
    zipWithR_() { }
    foldr(_cons, nil) { return nil; }
    foldl(_cons, nil) { return nil; }
    length() { return 0; }
    uncons() { return utils_1.impossible('uncons called on Nil'); }
}
exports.Nil = Nil;
class Cons extends List {
    constructor(head, tail) {
        super();
        this.head = head;
        this.tail = tail;
    }
    isNil() { return false; }
    isCons() { return true; }
    case(_nil, cons) { return cons(this.head, this.tail); }
    caseFull(_nil, cons) { return cons(this); }
    toMappedArray(fn) {
        const r = [];
        let c = this;
        while (c.isCons()) {
            r.push(fn(c.head));
            c = c.tail;
        }
        return r;
    }
    toArray() {
        const r = [];
        let c = this;
        while (c.isCons()) {
            r.push(c.head);
            c = c.tail;
        }
        return r;
    }
    map(fn) {
        return new Cons(fn(this.head), this.tail.map(fn));
    }
    each(fn) {
        let c = this;
        while (c.isCons()) {
            fn(c.head);
            c = c.tail;
        }
    }
    index(ix) {
        if (ix < 0)
            return utils_1.impossible(`index with negative index: ${ix}`);
        if (ix === 0)
            return this.head;
        let i = ix;
        let c = this;
        while (c.isCons()) {
            if (i <= 0)
                return c.head;
            c = c.tail;
            i--;
        }
        return null;
    }
    updateAt(ix, fn) {
        if (ix < 0)
            return utils_1.impossible(`updateAt with negative index: ${ix}`);
        if (ix === 0)
            return new Cons(fn(this.head), this.tail);
        return new Cons(this.head, this.tail.updateAt(ix - 1, fn));
    }
    findIndex(fn) {
        let i = 0;
        let c = this;
        while (c.isCons()) {
            if (fn(c.head))
                return i;
            c = c.tail;
            i++;
        }
        return -1;
    }
    find(fn) {
        let c = this;
        while (c.isCons()) {
            if (fn(c.head))
                return c.head;
            c = c.tail;
        }
        return null;
    }
    indexOf(val) {
        let i = 0;
        let c = this;
        while (c.isCons()) {
            if (c.head === val)
                return i;
            c = c.tail;
            i++;
        }
        return -1;
    }
    reverse() {
        let c = this;
        let r = List.Nil();
        while (c.isCons()) {
            r = new Cons(c.head, r);
            c = c.tail;
        }
        return r;
    }
    zip(b) {
        if (b.isCons())
            return new Cons([this.head, b.head], this.tail.zip(b.tail));
        return List.Nil();
    }
    zipWith(b, fn) {
        if (b.isCons())
            return new Cons(fn(this.head, b.head), this.tail.zipWith(b.tail, fn));
        return List.Nil();
    }
    zipWith_(o, fn) {
        let a = this;
        let b = o;
        while (a.isCons() && b.isCons()) {
            fn(a.head, b.head);
            a = a.tail;
            b = b.tail;
        }
    }
    zipWithR_(o, fn) {
        if (o.isCons()) {
            this.tail.zipWithR_(o.tail, fn);
            fn(this.head, o.head);
        }
    }
    foldr(cons, nil) {
        return cons(this.head, this.tail.foldr(cons, nil));
    }
    foldl(cons, nil) {
        return this.tail.foldl(cons, cons(nil, this.head));
    }
    length() {
        let i = 0;
        let c = this;
        while (c.isCons()) {
            c = c.tail;
            i++;
        }
        return i;
    }
    uncons() {
        return [this.head, this.tail];
    }
}
exports.Cons = Cons;
exports.nil = new Nil();
const cons = (head, tail) => new Cons(head, tail);
exports.cons = cons;

},{"./utils":15}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.iterate = exports.removeAll = exports.remove = exports.pushUniq = exports.eqArr = exports.mapObj = exports.tryTE = exports.tryT = exports.hasDuplicates = exports.range = exports.loadFileSync = exports.loadFile = exports.serr = exports.terr = exports.impossible = void 0;
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
const loadFileSync = (fn) => {
    if (typeof window === 'undefined') {
        try {
            return require('fs').readFileSync(fn, 'utf8');
        }
        catch (err) {
            return err;
        }
    }
    else {
        return new Error(`cannot synchronously retrieve file in browser: ${fn}`);
    }
};
exports.loadFileSync = loadFileSync;
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
const pushUniq = (a, x) => a.includes(x) ? a : (a.push(x), a);
exports.pushUniq = pushUniq;
const remove = (a, x) => {
    const i = a.indexOf(x);
    return i >= 0 ? a.splice(i, 1) : a;
};
exports.remove = remove;
const removeAll = (a, xs) => {
    xs.forEach(x => exports.remove(a, x));
    return a;
};
exports.removeAll = removeAll;
const iterate = (n, x, f) => {
    for (let i = 0; i < n; i++)
        x = f(x);
    return x;
};
exports.iterate = iterate;

},{"fs":18}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zonk = exports.show = exports.normalize = exports.quote = exports.evaluate = exports.velimBD = exports.vproj = exports.vlower = exports.velimenum = exports.vapp = exports.velimSpine = exports.velim = exports.force = exports.isVVar = exports.VMeta = exports.VVar = exports.vinst = exports.VLiftTerm = exports.VLift = exports.VEnumLit = exports.VEnum = exports.VPair = exports.VSigma = exports.VPi = exports.VAbs = exports.VGlobal = exports.VFlex = exports.VRigid = exports.VType = exports.EProj = exports.ELower = exports.EElimEnum = exports.EApp = void 0;
const core_1 = require("./core");
const metas_1 = require("./metas");
const Lazy_1 = require("./utils/Lazy");
const List_1 = require("./utils/List");
const utils_1 = require("./utils/utils");
const globals_1 = require("./globals");
const EApp = (erased, arg) => ({ tag: 'EApp', erased, arg });
exports.EApp = EApp;
const EElimEnum = (num, lift, motive, cases) => ({ tag: 'EElimEnum', num, lift, motive, cases });
exports.EElimEnum = EElimEnum;
exports.ELower = { tag: 'ELower' };
const EProj = (proj) => ({ tag: 'EProj', proj });
exports.EProj = EProj;
const VType = (index) => ({ tag: 'VType', index });
exports.VType = VType;
const VRigid = (head, spine) => ({ tag: 'VRigid', head, spine });
exports.VRigid = VRigid;
const VFlex = (head, spine) => ({ tag: 'VFlex', head, spine });
exports.VFlex = VFlex;
;
const VGlobal = (name, lift, spine, val) => ({ tag: 'VGlobal', name, lift, spine, val });
exports.VGlobal = VGlobal;
const VAbs = (erased, name, type, clos) => ({ tag: 'VAbs', erased, name, type, clos });
exports.VAbs = VAbs;
const VPi = (erased, name, type, u1, clos, u2) => ({ tag: 'VPi', erased, name, type, u1, clos, u2 });
exports.VPi = VPi;
const VSigma = (erased, name, type, u1, clos, u2) => ({ tag: 'VSigma', erased, name, type, u1, clos, u2 });
exports.VSigma = VSigma;
const VPair = (erased, fst, snd, type) => ({ tag: 'VPair', erased, fst, snd, type });
exports.VPair = VPair;
const VEnum = (num) => ({ tag: 'VEnum', num });
exports.VEnum = VEnum;
const VEnumLit = (val, num) => ({ tag: 'VEnumLit', val, num });
exports.VEnumLit = VEnumLit;
const VLift = (type) => ({ tag: 'VLift', type });
exports.VLift = VLift;
const VLiftTerm = (term) => ({ tag: 'VLiftTerm', term });
exports.VLiftTerm = VLiftTerm;
const vinst = (val, arg) => val.clos(arg);
exports.vinst = vinst;
const VVar = (level, spine = List_1.nil) => exports.VRigid(level, spine);
exports.VVar = VVar;
const VMeta = (meta, spine = List_1.nil) => exports.VFlex(meta, spine);
exports.VMeta = VMeta;
const isVVar = (v) => v.tag === 'VRigid' && v.spine.isNil();
exports.isVVar = isVVar;
const force = (v, forceGlobal = true) => {
    if (v.tag === 'VGlobal' && forceGlobal)
        return exports.force(v.val.get(), forceGlobal);
    if (v.tag === 'VFlex') {
        const e = metas_1.getMeta(v.head);
        return e.tag === 'Solved' ? exports.force(exports.velimSpine(e.solution, v.spine), forceGlobal) : v;
    }
    return v;
};
exports.force = force;
const velim = (e, t) => {
    if (e.tag === 'EApp')
        return exports.vapp(t, e.erased, e.arg);
    if (e.tag === 'EElimEnum')
        return exports.velimenum(e.num, e.lift, e.motive, t, e.cases);
    if (e.tag === 'ELower')
        return exports.vlower(t);
    if (e.tag === 'EProj')
        return exports.vproj(e.proj, t);
    return e;
};
exports.velim = velim;
const velimSpine = (t, sp) => sp.foldr(exports.velim, t);
exports.velimSpine = velimSpine;
const vapp = (left, erased, right) => {
    if (left.tag === 'VAbs')
        return exports.vinst(left, right); // TODO: erasure check?
    if (left.tag === 'VRigid')
        return exports.VRigid(left.head, List_1.cons(exports.EApp(erased, right), left.spine));
    if (left.tag === 'VFlex')
        return exports.VFlex(left.head, List_1.cons(exports.EApp(erased, right), left.spine));
    if (left.tag === 'VGlobal')
        return exports.VGlobal(left.name, left.lift, List_1.cons(exports.EApp(erased, right), left.spine), left.val.map(v => exports.vapp(v, erased, right)));
    return utils_1.impossible(`vapp: ${left.tag}`);
};
exports.vapp = vapp;
const velimenum = (num, lift, motive, scrut, cases) => {
    if (scrut.tag === 'VEnumLit')
        return cases[scrut.val];
    if (scrut.tag === 'VLiftTerm')
        return exports.velimenum(num, lift, motive, scrut.term, cases);
    if (scrut.tag === 'VRigid')
        return exports.VRigid(scrut.head, List_1.cons(exports.EElimEnum(num, lift, motive, cases), scrut.spine));
    if (scrut.tag === 'VFlex')
        return exports.VFlex(scrut.head, List_1.cons(exports.EElimEnum(num, lift, motive, cases), scrut.spine));
    if (scrut.tag === 'VGlobal')
        return exports.VGlobal(scrut.name, scrut.lift, List_1.cons(exports.EElimEnum(num, lift, motive, cases), scrut.spine), scrut.val.map(v => exports.velimenum(num, lift, motive, v, cases)));
    return utils_1.impossible(`velimenum: ${scrut.tag}`);
};
exports.velimenum = velimenum;
const vlower = (scrut) => {
    if (scrut.tag === 'VLiftTerm')
        return scrut.term;
    if (scrut.tag === 'VRigid')
        return exports.VRigid(scrut.head, List_1.cons(exports.ELower, scrut.spine));
    if (scrut.tag === 'VFlex')
        return exports.VFlex(scrut.head, List_1.cons(exports.ELower, scrut.spine));
    if (scrut.tag === 'VGlobal')
        return exports.VGlobal(scrut.name, scrut.lift, List_1.cons(exports.ELower, scrut.spine), scrut.val.map(exports.vlower));
    return utils_1.impossible(`vlower: ${scrut.tag}`);
};
exports.vlower = vlower;
const vproj = (proj, scrut) => {
    if (scrut.tag === 'VPair')
        return proj === 'fst' ? scrut.fst : scrut.snd;
    if (scrut.tag === 'VRigid')
        return exports.VRigid(scrut.head, List_1.cons(exports.EProj(proj), scrut.spine));
    if (scrut.tag === 'VFlex')
        return exports.VFlex(scrut.head, List_1.cons(exports.EProj(proj), scrut.spine));
    if (scrut.tag === 'VGlobal')
        return exports.VGlobal(scrut.name, scrut.lift, List_1.cons(exports.EProj(proj), scrut.spine), scrut.val.map(v => exports.vproj(proj, v)));
    return utils_1.impossible(`vproj: ${scrut.tag}`);
};
exports.vproj = vproj;
const velimBD = (env, v, s) => {
    if (env.isNil() && s.isNil())
        return v;
    if (env.isCons() && s.isCons())
        return s.head ? exports.vapp(exports.velimBD(env.tail, v, s.tail), false, env.head) : exports.velimBD(env.tail, v, s.tail); // TODO: erasure?
    return utils_1.impossible('velimBD');
};
exports.velimBD = velimBD;
const evaluate = (t, vs) => {
    if (t.tag === 'Type')
        return exports.VType(t.index);
    if (t.tag === 'Enum')
        return exports.VEnum(t.num);
    if (t.tag === 'EnumLit')
        return exports.VEnumLit(t.val, t.num);
    if (t.tag === 'ElimEnum')
        return exports.velimenum(t.num, t.lift, exports.evaluate(t.motive, vs), exports.evaluate(t.scrut, vs), t.cases.map(x => exports.evaluate(x, vs)));
    if (t.tag === 'Abs')
        return exports.VAbs(t.erased, t.name, exports.evaluate(t.type, vs), v => exports.evaluate(t.body, List_1.cons(v, vs)));
    if (t.tag === 'Pi')
        return exports.VPi(t.erased, t.name, exports.evaluate(t.type, vs), t.u1, v => exports.evaluate(t.body, List_1.cons(v, vs)), t.u2);
    if (t.tag === 'Sigma')
        return exports.VSigma(t.erased, t.name, exports.evaluate(t.type, vs), t.u1, v => exports.evaluate(t.body, List_1.cons(v, vs)), t.u2);
    if (t.tag === 'Var')
        return vs.index(t.index) || utils_1.impossible(`evaluate: var ${t.index} has no value`);
    if (t.tag === 'Meta')
        return exports.VMeta(t.id);
    if (t.tag === 'InsertedMeta')
        return exports.velimBD(vs, exports.VMeta(t.id), t.spine);
    if (t.tag === 'App')
        return exports.vapp(exports.evaluate(t.fn, vs), t.erased, exports.evaluate(t.arg, vs));
    if (t.tag === 'Pair')
        return exports.VPair(t.erased, exports.evaluate(t.fst, vs), exports.evaluate(t.snd, vs), exports.evaluate(t.type, vs));
    if (t.tag === 'Let')
        return exports.evaluate(t.body, List_1.cons(exports.evaluate(t.val, vs), vs));
    if (t.tag === 'Global') {
        const entry = globals_1.getGlobal(t.name);
        if (!entry)
            return utils_1.impossible(`tried to load undefined global ${t.name}`);
        return exports.VGlobal(t.name, t.lift, List_1.nil, Lazy_1.Lazy.from(() => t.lift === 0 ? entry.value : exports.evaluate(core_1.liftType(t.lift, entry.term), vs)));
    }
    if (t.tag === 'Lift')
        return exports.VLift(exports.evaluate(t.type, vs));
    if (t.tag === 'LiftTerm')
        return exports.VLiftTerm(exports.evaluate(t.term, vs));
    if (t.tag === 'Lower')
        return exports.vlower(exports.evaluate(t.term, vs));
    if (t.tag === 'Proj')
        return exports.vproj(t.proj, exports.evaluate(t.term, vs));
    return t;
};
exports.evaluate = evaluate;
const quoteElim = (t, e, k, full) => {
    if (e.tag === 'EApp')
        return core_1.App(t, e.erased, exports.quote(e.arg, k, full));
    if (e.tag === 'EElimEnum')
        return core_1.ElimEnum(e.num, e.lift, exports.quote(e.motive, k, full), t, e.cases.map(x => exports.quote(x, k, full)));
    if (e.tag === 'ELower')
        return core_1.Lower(t);
    if (e.tag === 'EProj')
        return core_1.Proj(e.proj, t);
    return e;
};
const quote = (v_, k, full = false) => {
    const v = exports.force(v_, false);
    if (v.tag === 'VType')
        return core_1.Type(v.index);
    if (v.tag === 'VEnum')
        return core_1.Enum(v.num);
    if (v.tag === 'VEnumLit')
        return core_1.EnumLit(v.val, v.num);
    if (v.tag === 'VRigid')
        return v.spine.foldr((x, y) => quoteElim(y, x, k, full), core_1.Var(k - (v.head + 1)));
    if (v.tag === 'VFlex')
        return v.spine.foldr((x, y) => quoteElim(y, x, k, full), core_1.Meta(v.head));
    if (v.tag === 'VGlobal') {
        if (full)
            return exports.quote(v.val.get(), k, full);
        return v.spine.foldr((x, y) => quoteElim(y, x, k, full), core_1.Global(v.name, v.lift));
    }
    if (v.tag === 'VAbs')
        return core_1.Abs(v.erased, v.name, exports.quote(v.type, k, full), exports.quote(exports.vinst(v, exports.VVar(k)), k + 1, full));
    if (v.tag === 'VPi')
        return core_1.Pi(v.erased, v.name, exports.quote(v.type, k, full), v.u1, exports.quote(exports.vinst(v, exports.VVar(k)), k + 1, full), v.u2);
    if (v.tag === 'VSigma')
        return core_1.Sigma(v.erased, v.name, exports.quote(v.type, k, full), v.u1, exports.quote(exports.vinst(v, exports.VVar(k)), k + 1, full), v.u2);
    if (v.tag === 'VPair')
        return core_1.Pair(v.erased, exports.quote(v.fst, k, full), exports.quote(v.snd, k, full), exports.quote(v.type, k, full));
    if (v.tag === 'VLift')
        return core_1.Lift(exports.quote(v.type, k, full));
    if (v.tag === 'VLiftTerm')
        return core_1.LiftTerm(exports.quote(v.term, k, full));
    return v;
};
exports.quote = quote;
const normalize = (t, k = 0, vs = List_1.nil, full = false) => exports.quote(exports.evaluate(t, vs), k, full);
exports.normalize = normalize;
const show = (v, k = 0, full = false) => core_1.show(exports.quote(v, k, full));
exports.show = show;
const zonkSpine = (tm, vs, k, full) => {
    if (tm.tag === 'Meta') {
        const s = metas_1.getMeta(tm.id);
        if (s.tag === 'Unsolved')
            return [true, exports.zonk(tm, vs, k, full)];
        return [false, s.solution];
    }
    if (tm.tag === 'App') {
        const spine = zonkSpine(tm.fn, vs, k, full);
        return spine[0] ?
            [true, core_1.App(spine[1], tm.erased, exports.zonk(tm.arg, vs, k, full))] :
            [false, exports.vapp(spine[1], tm.erased, exports.evaluate(tm.arg, vs))];
    }
    return [true, exports.zonk(tm, vs, k, full)];
};
const vzonkBD = (env, v, s) => {
    if (env.isNil() && s.isNil())
        return v;
    if (env.isCons() && s.isCons())
        return s.head ? exports.vapp(vzonkBD(env.tail, v, s.tail), false, env.head) : vzonkBD(env.tail, v, s.tail); // TODO: erasure?
    return utils_1.impossible('vzonkBD');
};
const zonk = (tm, vs = List_1.nil, k = 0, full = false) => {
    if (tm.tag === 'Meta') {
        const s = metas_1.getMeta(tm.id);
        if (s.tag === 'Unsolved')
            return tm;
        return exports.quote(s.solution, k, full);
    }
    if (tm.tag === 'InsertedMeta') {
        const s = metas_1.getMeta(tm.id);
        if (s.tag === 'Unsolved')
            return tm;
        return exports.quote(vzonkBD(vs, s.solution, tm.spine), k, full);
    }
    if (tm.tag === 'Pi')
        return core_1.Pi(tm.erased, tm.name, exports.zonk(tm.type, vs, k, full), tm.u1, exports.zonk(tm.body, List_1.cons(exports.VVar(k), vs), k + 1, full), tm.u2);
    if (tm.tag === 'Sigma')
        return core_1.Sigma(tm.erased, tm.name, exports.zonk(tm.type, vs, k, full), tm.u1, exports.zonk(tm.body, List_1.cons(exports.VVar(k), vs), k + 1, full), tm.u2);
    if (tm.tag === 'Let')
        return core_1.Let(tm.erased, tm.name, exports.zonk(tm.type, vs, k, full), exports.zonk(tm.val, vs, k, full), exports.zonk(tm.body, List_1.cons(exports.VVar(k), vs), k + 1, full));
    if (tm.tag === 'Abs')
        return core_1.Abs(tm.erased, tm.name, exports.zonk(tm.type, vs, k, full), exports.zonk(tm.body, List_1.cons(exports.VVar(k), vs), k + 1, full));
    if (tm.tag === 'App') {
        const spine = zonkSpine(tm.fn, vs, k, full);
        return spine[0] ?
            core_1.App(spine[1], tm.erased, exports.zonk(tm.arg, vs, k, full)) :
            exports.quote(exports.vapp(spine[1], tm.erased, exports.evaluate(tm.arg, vs)), k, full);
    }
    if (tm.tag === 'Pair')
        return core_1.Pair(tm.erased, exports.zonk(tm.fst, vs, k, full), exports.zonk(tm.snd, vs, k, full), exports.zonk(tm.type, vs, k, full));
    if (tm.tag === 'ElimEnum')
        return core_1.ElimEnum(tm.num, tm.lift, exports.zonk(tm.motive, vs, k, full), exports.zonk(tm.scrut, vs, k, full), tm.cases.map(x => exports.zonk(x, vs, k, full)));
    if (tm.tag === 'Lift')
        return core_1.Lift(exports.zonk(tm.type, vs, k, full));
    if (tm.tag === 'LiftTerm')
        return core_1.LiftTerm(exports.zonk(tm.term, vs, k, full));
    if (tm.tag === 'Lower')
        return core_1.Lower(exports.zonk(tm.term, vs, k, full));
    if (tm.tag === 'Proj')
        return core_1.Proj(tm.proj, exports.zonk(tm.term, vs, k, full));
    return tm;
};
exports.zonk = zonk;

},{"./core":2,"./globals":4,"./metas":6,"./utils/Lazy":13,"./utils/List":14,"./utils/utils":15}],17:[function(require,module,exports){
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

},{"./repl":9}],18:[function(require,module,exports){

},{}]},{},[17]);
