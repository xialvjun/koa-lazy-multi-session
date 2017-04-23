/// <reference types="koa" />
import * as Koa from 'koa';
export interface Store {
    get: (string) => Promise<any>;
    set: (string, any, number) => Promise<any>;
    destroy: (string) => Promise<any>;
}
export interface Options {
    get_sid?: string | {
        type: string;
        name: string;
    } | ((ctx: Koa.Context) => string);
    max_age?: number;
    store?: Store;
}
declare function lazy_multi_session(opts: Options): (ctx: Koa.Context, next: () => Promise<any>) => Promise<any[]>;
export default lazy_multi_session;
