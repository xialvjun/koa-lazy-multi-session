import * as assert from 'assert';

import * as debug_module from 'debug';
const debug = debug_module('koa-lazy-multi-session');

import * as Koa from 'koa';

import MemStore from './mem_store';

export interface Store {
    get: (sid: string) => Promise<any>,
    set: (sid: string, sess: any, max_age: number) => Promise<any>,
    destroy: (sid: string) => Promise<any>,
    touch?: (sid: string, max_age: number) => Promise<any>,
}

export interface Options {
    get_sid?: string | null | ((ctx: Koa.Context) => string),
    max_age?: number,
    eager?: boolean,
    rollup?: boolean,
    store?: Store,
}

interface FormatedOptions {
    get_sid: object | ((ctx: Koa.Context) => string),
    max_age: number,
    eager: boolean,
    rollup: boolean,
    store: Store,
}

interface Session {
    old_session: any,
    new_session: any,
    loaded: boolean,
}

export function lazy_multi_session(opts: Options) {
    const { get_sid, max_age, store, eager, rollup } = format_opts(opts);
    return middleware;

    async function middleware(ctx: Koa.Context, next: () => Promise<any>) {
        const sessions = new Map<string, Session>();

        Object(ctx).session = async (sid, key, value) => {
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
                // old_session doesn't have sid, expire_at, created_at, updated_up
                session.old_session = await store.get(sid);
                session.loaded = true;
                return Object.assign({ sid }, session.old_session);
            }
            // If `key!==undefined`, it means `set the session`. If `value===undefined`, it means to delete the key
            return session.new_session[key] = value;
        }

        if (eager) {
            await Object(ctx).session();
        }

        await next();

        let promises = [];
        sessions.forEach((session, sid) => promises.push(save_session(session, sid)));
        return Promise.all(promises);

        async function save_session(session: Session, sid: string) {
            // If new_session hasn't changed, we do nothing
            if (Object.keys(session.new_session).length === 0) {
                if (rollup) {
                    if (typeof store.touch === 'function') {
                        return store.touch(sid, max_age);
                    } else {
                        let { sid: final_sid, ...sess } = await Object(ctx).session(sid);
                        return store.set(sid, sess, max_age);
                    }
                }
                return;
            }

            let { sid: final_sid, ...sess } = await Object(ctx).session(sid);

            if (sid && sid !== final_sid) {
                await store.destroy(sid);
            }
            if (final_sid) {
                await store.set(final_sid, sess, max_age);
            }
        }
    }
}

function format_opts(opts: Options): FormatedOptions {
    let get_sid, max_age, eager, rollup, store;

    if (opts.get_sid === undefined) {
        get_sid = (ctx: Koa.Context) => ctx.cookies.get('sid');
    } else if (typeof opts.get_sid === 'string') {
        let copy_get_sid = opts.get_sid;
        get_sid = (ctx: Koa.Context) => ctx.cookies.get(copy_get_sid);
    } else if (opts.get_sid === null) {
        // if (opts.get_sid === null) {
        //     // If get_sid === null, we take it as programmers want to offer sid to ctx.session function. So we can offer different sid to get multiple session in one request.
        //     get_sid === null;
        // } else {
        //     assert(
        //         typeof opts.get_sid.type === 'string' &&
        //         opts.get_sid.type.length > 0
        //         ,
        //         `Opts.get_sid.type must be a not empty string!`
        //     );
        //     assert(
        //         typeof opts.get_sid.name === 'string' &&
        //         opts.get_sid.name.length > 0
        //         ,
        //         `Opts.get_sid.name must be a not empty string!`
        //     );
        //     if (opts.get_sid.type === 'cookie' || opts.get_sid.type === 'cookies') {
        //         let copy_name = opts.get_sid.name;
        //         get_sid = (ctx: Koa.Context) => ctx.cookies.get(copy_name);
        //     } else {
        //         let copy_type = opts.get_sid.type;
        //         let copy_name = opts.get_sid.name;
        //         get_sid = (ctx: Koa.Context) => Object(ctx)[copy_type][copy_name];
        //     }
        // }
        get_sid = null;
    } else if (typeof opts.get_sid === 'function') {
        get_sid = opts.get_sid;
    } else {
        assert(false, `Unsupported get_sid! We can only support 'undefined', 'string', 'null' and 'function'.`);
    }

    if (opts.max_age === undefined) {
        max_age = 24 * 60 * 60 * 1000;
    } else {
        assert(
            typeof opts.max_age === 'number' &&
            opts.max_age > 0 &&
            Number.isInteger(opts.max_age)
            ,
            `Opts.max_age must be an positive integer!`
        );
        max_age = opts.max_age;
    }

    if (opts.eager === undefined) {
        eager = false;
    } else {
        assert(typeof opts.eager === 'boolean', `Opts.eager must be a boolean!`);
        eager = opts.eager;
    }

    if (opts.rollup === undefined) {
        rollup = false;
    } else {
        assert(typeof opts.rollup === 'boolean', `Opts.rollup must be a boolean!`);
        rollup = opts.rollup;
    }

    if (opts.store === undefined) {
        store = new MemStore();
    } else {
        assert(
            typeof opts.store === 'object' &&
            typeof opts.store.get === 'function' &&
            typeof opts.store.set === 'function' &&
            typeof opts.store.destroy === 'function'
            ,
            `Store must be an object with 3 functions: get, set, destroy!`
        );
        store = opts.store;
    }

    const formated_opts = { get_sid, max_age, eager, rollup, store };
    debug('The formated session options: %j', formated_opts);
    return formated_opts;
}

export default lazy_multi_session;
