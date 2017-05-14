# koa-lazy-multi-session

A lazy koa session and you can get multi session in one request.

### Why this

First, **LAZY**. We already have the signed cookies or json_web_token. If we only need the information which the signed cookies or the jwt already stored, we needn't to load the whole session from database.

Second, **MULTI**. Well, in normal case, we don't need it. But it take the possibility of use different account to get different data in just one request. And it just agree with the practice in graphql of sending token as the parameter of a field's resolve function, in different fields' resolve function, you may send different token.

### Usage

This package doesn't take responsility for sending the authentication to the client, which means it doesn't set the cookies. You need to set the cookie yourself when the client logged in if you use cookie to store the authentication.

### Installation

`npm install --save koa-lazy-multi-session`

### Example

**example one**
```ts
import lazy from 'koa-lazy-multi-session';

const opts = {
    get_sid: 'sid',
    max_age: 24 * 60 * 60 * 1000,
    eager: false,
    rolling: false,
    // The default store is an in-memory Map. You may want to use a database store like my `knex-schema-session-store`
    // store: Store,
};

app.use(lazy(opts));

app.use(async function(ctx, next) {
    let sess = await ctx.session();
    console.log(sess);
    if (sess) {
        // set session
        await ctx.session('foo', 'bar');
    } else {
        let sid = uuid();
        // init session must be 'sid'
        // await ctx.session('sid', sid);
        // await ctx.session('foo', 'bar');
        // or
        await ctx.session({ sid, foo: 'bar' });
        // you need to tell the client what the sid is. This package doesn't take responsibility of setting the cookie or something.
        ctx.body = sid;
    }
    sess = await ctx.session();
    console.log(sess);
});
```

**example two**
```ts
const opts = {
    // if get_sid is null, it become multi session
    get_sid: null
};

app.use(lazy(opts));

app.use(async function(ctx, next) {
    // ... some ways to get an sid;
    let sid = ...;
    let sess = await ctx.session(sid);
    console.log(sess);
    await ctx.session(sid, 'foo', 'bar');
    sess = await ctx.session();
    console.log(sess);

    let another_sid = ...;
    let another_sess = await ctx.session(another_sid);
    console.log(another_sess);
    await ctx.session(another_sid, 'foo', 'bar');
    another_sess = await ctx.session();
    console.log(another_sess);
});
```

### API

`export default function lazy_multi_session(opts: Options): (ctx: Koa.Context, next: () => Promise<any>) => Promise<any[]>;`

#### Options

```ts
export interface Options {
    // see Tip 2
    get_sid?: string | null | ((ctx: Koa.Context) => string);
    // how long will a session be remembered (in milliseconds, default: 1000 * 60 * 60 * 24, aka one day)
    max_age?: number;
    // is it eager to load the session? (default: false)
    eager?: boolean;
    // will we update the session even it didn't be changed to keep it alive? (default: false)
    rolling?: boolean;
    // see the bottom
    store?: Store;
    // will we ignore the save_session_error to avoid confusing our users? (default: true)
    ignore_save_session_error?: boolean;
}
```

> Tip 1: `rolling` has nothing to do with `eager`. If we set `eager=false; rolling=true`, then even a request come, if we didn't access its session, we won't update it.

> Tip 2: `get_sid` can be undefined, string, null and a function returning string. If it's undefined, it's `'sid'`; if it's a string, it's `(ctx) => ctx.cookies.get(get_sid)`, so undefined is `(ctx) => ctx.cookies.get('sid')`; if it's a function, the function should derive the sid from the Koa.Context. The complex part is when `get_sid` is `null`: if `get_sid` is `null`, this package works in `multi-session` mode, you need to tell which sid session you want to get. Just see the difference between the above two examples.

#### Store

```ts
// any object implement this interface or without touch function.
export interface Store {
    get: (sid: string) => Promise<any>;
    set: (sid: string, sess: any, max_age: number) => Promise<any>;
    destroy: (sid: string) => Promise<any>;
    touch?: (sid: string, max_age: number) => Promise<any>;
}
```
