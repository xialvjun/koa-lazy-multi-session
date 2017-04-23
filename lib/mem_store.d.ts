declare class MemStore {
    sessions: Map<string | number, {
        expire_at: number;
        sess: any;
    }>;
    constructor(gc_interval?: number);
    get(sid: string | number): Promise<any>;
    set(sid: string | number, sess: any, max_age: number): Promise<Map<string | number, {
        expire_at: number;
        sess: any;
    }>>;
    destroy(sid: string | number): Promise<boolean>;
}
export default MemStore;
