
export class MemStore {
    sessions: Map<string | number, { expire_at: number, sess: any }>

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

    get(sid: string | number) {
        let session = this.sessions.get(sid);
        if (session && Date.now() < session.expire_at) {
            return Promise.resolve(session.sess);
        }
        return Promise.resolve(null);
    }

    set(sid: string | number, sess, max_age: number) {
        return Promise.resolve(this.sessions.set(sid, { sess, expire_at: Date.now() + Math.max(max_age, 0) }));
    }

    destroy(sid: string | number) {
        return Promise.resolve(this.sessions.delete(sid));
    }

    touch(sid: string | number, max_age: number) {
        let sess = this.sessions.get(sid);
        sess && (sess.expire_at = Date.now() + Math.max(max_age, 0));
        return Promise.resolve();
    }
}


export default MemStore;
