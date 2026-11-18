// Cache local limitado: cada processo possui sua própria instância.
export class TTLCache {
    constructor(ttl = 5000, max = 500) { this.ttl = ttl; this.max = max; this.entries = new Map(); }
    get(key) {
        const entry = this.entries.get(key);
        if (!entry || entry.expires <= Date.now()) { this.entries.delete(key); return undefined; }
        return structuredClone(entry.value);
    }
    set(key, value) {
        if (this.entries.size >= this.max) this.entries.delete(this.entries.keys().next().value);
        this.entries.set(key, { value: structuredClone(value), expires: Date.now() + this.ttl });
    }
    clear() { this.entries.clear(); }
}
export const catalogCache = new TTLCache();
