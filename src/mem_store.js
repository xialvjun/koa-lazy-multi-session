'use strict';

class MemStore {
  constructor(gc_interval=1000*60*60) {
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
    this.sessions.set(sid, {sess, expire_at: Date.now() + Math.max(max_age, 0)});
    return Promise.resolve();
  }
  destroy(sid) {
    return Promise.resolve(this.sessions.delete(sid));
  }
}


module.exports = MemStore;
