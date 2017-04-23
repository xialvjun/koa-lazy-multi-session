"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const debug_module = require("debug");
const debug = debug_module('koa-lazy-multi-session');
const mem_store_1 = require("./mem_store");
function lazy_multi_session(opts) {
    const { get_sid, max_age, store } = format_opts(opts);
    return middleware;
    function middleware(ctx, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const sessions = new Map();
            Object(ctx).session = (sid, key, value) => __awaiter(this, void 0, void 0, function* () {
                if (typeof get_sid === 'function') {
                    value = key;
                    key = sid;
                    sid = get_sid(ctx);
                }
                if (!sid) {
                    return null;
                }
                let session = sessions.get(sid);
                if (!session) {
                    session = { old_session: undefined, new_session: {}, loaded: false };
                    sessions.set(sid, session);
                }
                if (key === undefined) {
                    if (session && session.loaded) {
                        // Merge sid in it to easily get sid
                        return Object.assign({ sid }, session.old_session, session.new_session);
                    }
                    // old_session 取出来是不带 sid 的
                    session.old_session = yield store.get(sid);
                    session.loaded = true;
                    return Object.assign({ sid }, session.old_session);
                }
                // If `key!==undefined`, it means `set the session`. If `value===undefined`, it means to delete the key
                return session.new_session[key] = value;
            });
            yield next();
            let promises = [];
            sessions.forEach((session, sid) => promises.push(save_session(session, sid)));
            return Promise.all(promises);
            function save_session(session, sid) {
                return __awaiter(this, void 0, void 0, function* () {
                    // If new_session hasn't changed, we do nothing
                    if (Object.keys(session.new_session).length === 0) {
                        return;
                    }
                    let _a = yield Object(ctx).session(sid), { sid: final_sid } = _a, sess = __rest(_a, ["sid"]);
                    if (sid && sid !== final_sid) {
                        yield store.destroy(sid);
                    }
                    if (final_sid) {
                        yield store.set(final_sid, sess, max_age);
                    }
                });
            }
        });
    }
}
function format_opts(opts) {
    let get_sid, max_age, store;
    if (opts.get_sid === undefined) {
        get_sid = (ctx) => ctx.cookies.get('sid');
    }
    else if (typeof opts.get_sid === 'string') {
        let copy_get_sid = opts.get_sid;
        get_sid = (ctx) => ctx.cookies.get(copy_get_sid);
    }
    else if (typeof opts.get_sid === 'object') {
        if (opts.get_sid === null) {
            // If get_sid === null, we take it as programmers want to offer different sid to get multiple session in one request.
            get_sid === null;
        }
        else {
            assert(['cookie', 'jwt'].indexOf(opts.get_sid.type) > -1, `Unsupported get_sid.type! We can only support ['cookie', 'jwt'] type temporarily.`);
            if (opts.get_sid.type === 'cookie') {
                assert(typeof opts.get_sid.name === 'string' &&
                    opts.get_sid.name.length > 0, `Cookie type's get_sid.name must be a not empty string!`);
                let copy_name = opts.get_sid.name;
                get_sid = (ctx) => ctx.cookies.get(copy_name);
            }
            else if (opts.get_sid.type === 'jwt') {
                assert(typeof opts.get_sid.name === 'string' &&
                    opts.get_sid.name.length > 0, `Jwt type's get_sid.name must be a not empty string!`);
                let copy_name = opts.get_sid.name;
                get_sid = (ctx) => Object(ctx).jwt[copy_name];
            }
        }
    }
    else if (typeof opts.get_sid === 'function') {
        get_sid = opts.get_sid;
    }
    else {
        assert(false, `Unsupported get_sid! We can only support 'undefined', 'string', 'object' and 'function'.`);
    }
    if (opts.max_age === undefined) {
        max_age = 24 * 60 * 60 * 1000;
    }
    else {
        assert(typeof opts.max_age === 'number' &&
            opts.max_age > 0 &&
            Number.isInteger(opts.max_age), `Opts.max_age must be an positive integer!`);
        max_age = opts.max_age;
    }
    if (opts.store === undefined) {
        store = new mem_store_1.default();
    }
    else {
        assert(typeof opts.store === 'object' &&
            typeof opts.store.get === 'function' &&
            typeof opts.store.set === 'function' &&
            typeof opts.store.destroy === 'function', `Store must be an object with 3 functions: get, set, destroy!`);
        store = opts.store;
    }
    const formated_opts = { get_sid, max_age, store };
    debug('The formated session options: %j', formated_opts);
    return formated_opts;
}
exports.default = lazy_multi_session;
