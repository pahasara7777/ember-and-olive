import { randomInt } from 'node:crypto';

// Unambiguous characters (no 0/O/1/I/L) so references are easy to read out over the phone.
const ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';

// Random, not sequential: a reference doubles as the key for guest order tracking.
export function newReference(kind) {
  let id = '';
  for (let i = 0; i < 10; i++) id += ALPHABET[randomInt(ALPHABET.length)];
  return `EO-${kind}-${id}`;
}
