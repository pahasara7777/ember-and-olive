import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

// scrypt N=2^16, r=8, p=2 is an OWASP-recommended setting (64 MiB per hash).
const PARAMS = { N: 2 ** 16, r: 8, p: 2 };
const KEY_LEN = 64;
const maxmem = 256 * 1024 * 1024;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEY_LEN, { ...PARAMS, maxmem });
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password, stored) {
  const [alg, N, r, p, salt, hash] = String(stored).split('$');
  if (alg !== 'scrypt' || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const key = await scryptAsync(password, Buffer.from(salt, 'base64'), expected.length, {
    N: Number(N), r: Number(r), p: Number(p), maxmem
  });
  return timingSafeEqual(key, expected);
}

// Checked when the email is unknown, so "no such user" costs the same time as "wrong password".
let dummy;
export async function burnPasswordCheck(password) {
  dummy ??= await hashPassword('not-a-real-password');
  await verifyPassword(password, dummy);
}
