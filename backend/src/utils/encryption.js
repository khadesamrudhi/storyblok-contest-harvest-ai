// src/utils/encryption.js

const crypto = require('crypto');

// Password hashing using scrypt
async function hashPassword(password, { salt = crypto.randomBytes(16), N = 16384, r = 8, p = 1, keylen = 64 } = {}) {
  const saltBuf = Buffer.isBuffer(salt) ? salt : Buffer.from(String(salt));
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, saltBuf, keylen, { N, r, p }, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${saltBuf.toString('hex')}:${derivedKey.toString('hex')}`);
    });
  });
}

async function verifyPassword(password, hash) {
  const [saltHex, keyHex] = String(hash).split(':');
  if (!saltHex || !keyHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const derived = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, Buffer.from(keyHex, 'hex').length, (err, dk) => {
      if (err) return reject(err);
      resolve(dk);
    });
  });
  return crypto.timingSafeEqual(Buffer.from(keyHex, 'hex'), derived);
}

// Symmetric encryption using AES-256-GCM
function encrypt(plaintext, key) {
  const iv = crypto.randomBytes(12);
  const keyBuf = Buffer.isBuffer(key) ? key : crypto.createHash('sha256').update(String(key)).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

function decrypt(ciphertextB64, key) {
  const buf = Buffer.from(ciphertextB64, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const keyBuf = Buffer.isBuffer(key) ? key : crypto.createHash('sha256').update(String(key)).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString('utf8');
}

// HMAC signing helpers
function sign(data, secret, algo = 'sha256') {
  return crypto.createHmac(algo, String(secret)).update(String(data)).digest('hex');
}

function verify(data, signature, secret, algo = 'sha256') {
  const sig = sign(data, secret, algo);
  return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(String(signature), 'hex'));
}

module.exports = {
  hashPassword,
  verifyPassword,
  encrypt,
  decrypt,
  sign,
  verify
};

