'use strict';

const debug = require('debug')('koa-lazy-session');
const assert = require('assert');

const MemStore = require('./mem_store');

const KeyError = 'Unsupport "key" type! Key must be "string" or "function", or plain object with a string "name" and "type" of "cookie" or "jwt".';
const MaxAgeError = 'Unsupport "maxAge" type! MaxAge must be an integer greater then 0.';
const StoreError = 'Unsupport "store" type! Store must be an object with 3 functions: get(sid), set(sid, sess, maxAge), destroy(sid).'

/**
 * This middleware just take response for read 'sid' from ctx, but not set the client 'sid'.
 * Programmers should tell the client the 'sid' themselves.
 * 
 * @param {Object} options: options should be an object with `get_sid, max_age, store`.
 */
module.exports = function (options) {
  const { get_sid, max_age, store } = format_option(options);
  // middleware.get_sid = get_sid;
  return middleware;

  async function middleware(ctx, next) {
    let sid, old_session, new_session = {}, loaded = false;

    ctx.session = async (key, value) => {
      // If key===undefined, we get the whole session.
      if (key === undefined) {
        if (loaded) {
          // Merge sid in it to easily get sid
          return Object.assign({ sid }, old_session, new_session);
        }
        sid = sid || get_sid(ctx);
        if (sid) {
          // old_session 取出来是不带 sid 的
          old_session = await store.get(sid);
          loaded = true;
          return Object.assign({ sid }, old_session);
        }
        loaded = true;
        return null;
      }
      // If `key!==undefined`, it means `set the session`. If `value===undefined`, it means to delete the key
      return new_session[key] = value;
    };

    await next();

    // If new_session hasn't changed, we do nothing
    if (Object.keys(new_session).length === 0) {
      return;
    }
    
    let { sid: final_sid, ...sess } = await ctx.session();

    if (sid && sid !== final_sid) {
      await store.destroy(sid);
    }
    if (final_sid) {
      await store.set(final_sid, sess, max_age);
    }
  }
}


function format_option(options) {
  let { key, maxAge, store } = Object.assign({
    key: 'sid', // It can also be { type: 'cookie', name: 'sid' } || { type: 'jwt', name: 'sid' } || ctx => sid
    maxAge: 24 * 60 * 60 * 1000,
  }, options);

  if (!store) {
    store = new MemStore();
  }

  let get_sid, final_max_age;
  if (typeof key === 'string') {
    get_sid = (ctx) => ctx.cookies.get(key);
  }
  if (typeof key === 'object') {
    if (key.type === 'cookie' && typeof key.name === 'string') {
      get_sid = (ctx) => ctx.cookies.get(key.name);
    }
    if (key.type === 'jwt' && typeof key.name === 'string') {
      get_sid = (ctx) => ctx.jwt[key.name];
    }
  }
  if (typeof key === 'function') {
    get_sid = key;
  }
  if (typeof options.maxAge === 'number' && options.maxAge > 0 && Number.isInteger(options.maxAge)) {
    final_max_age = maxAge;
  }

  assert(get_sid, KeyError);
  assert(final_max_age, MaxAgeError);
  assert(store, StoreError);
  assert(typeof store.get === 'function', StoreError);
  assert(typeof store.set === 'function', StoreError);
  assert(typeof store.destroy === 'function', StoreError);

  let opts = { get_sid, max_age: final_max_age, store };
  debug('formated session options %j', opts);
  return opts;
}
