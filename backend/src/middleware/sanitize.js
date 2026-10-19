import { HttpError } from './error.js';

const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function scan(value, depth = 0) {
  if (depth > 8) throw new HttpError(400, 'Invalid input');
  if (Array.isArray(value)) return value.forEach((v) => scan(v, depth + 1));
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      // "$ne", "a.b" and "a[$ne]" are MongoDB operators, paths or qs-style nesting; no honest form field uses them.
      if (/[$.[\]]/.test(key) || BAD_KEYS.has(key)) throw new HttpError(400, 'Invalid input');
      scan(value[key], depth + 1);
    }
  }
}

// Blocks NoSQL operator injection and prototype pollution before any route sees the data.
export function rejectOperatorKeys(req, res, next) {
  scan(req.body);
  scan(req.query);
  next();
}
