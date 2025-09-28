// src/utils/helpers.js

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function safeJSON(str, fallback = null) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function pick(obj, keys = []) {
  const out = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}

function omit(obj, keys = []) {
  const set = new Set(keys);
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (!set.has(k)) out[k] = v;
  return out;
}

async function retry(fn, { retries = 3, delayMs = 300, factor = 2 } = {}) {
  let attempt = 0;
  let wait = delayMs;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (attempt > retries) throw err;
      await sleep(wait);
      wait *= factor;
    }
  }
}

function toNumber(val, def = 0) {
  const n = Number(val);
  return Number.isFinite(n) ? n : def;
}

module.exports = { sleep, chunkArray, safeJSON, pick, omit, retry, toNumber };

