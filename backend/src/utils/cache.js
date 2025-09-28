// src/utils/cache.js

class TTLCache {
  constructor() {
    this.store = new Map();
  }

  _now() {
    return Date.now();
  }

  set(key, value, ttlMs = 0) {
    const exp = ttlMs > 0 ? this._now() + ttlMs : 0;
    this.store.set(key, { value, exp });
    return true;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.exp && entry.exp > 0 && entry.exp < this._now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  del(key) {
    return this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  // Wrap an async function call with caching
  async wrap(key, fn, ttlMs = 0) {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const value = await fn();
    this.set(key, value, ttlMs);
    return value;
  }
}

module.exports = new TTLCache();

