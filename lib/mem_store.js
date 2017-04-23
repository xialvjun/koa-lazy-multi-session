"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class MemStore {
    constructor(gc_interval = 1000 * 60 * 60) {
        this.sessions = new Map();
        setInterval(() => {
            let now = Date.now();
            this.sessions.forEach((v, k) => {
                if (now > v.expire_at) {
                    this.sessions.delete(k);
                }
            });
        }, gc_interval);
    }
    get(sid) {
        let session = this.sessions.get(sid);
        if (session && Date.now() < session.expire_at) {
            return Promise.resolve(session.sess);
        }
        return Promise.resolve(null);
    }
    set(sid, sess, max_age) {
        return Promise.resolve(this.sessions.set(sid, { sess, expire_at: Date.now() + Math.max(max_age, 0) }));
    }
    destroy(sid) {
        return Promise.resolve(this.sessions.delete(sid));
    }
}
exports.default = MemStore;