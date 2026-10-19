// Patterns for secrets that must never reach git. Used by check-secrets.mjs, the pre-commit hook and CI.
const PLACEHOLDER = /(<[^>]+>|your[-_ ]?|example|changeme|change-me|replace|placeholder|xxxx|\bu:p@|user:pass|username:password|test-secret)/i;

export const RULES = [
  { name: 'MongoDB connection string with a password', re: /mongodb(?:\+srv)?:\/\/[^:\s/'"]+:([^@\s'"]{3,})@[^\s'"]+/g, secretGroup: 0 },
  { name: 'JWT or session secret assigned a real-looking value', re: /\b(?:JWT_SECRET|SESSION_SECRET|COOKIE_SECRET)\s*[:=]\s*['"]?([A-Za-z0-9+/_=-]{24,})/g, secretGroup: 1 },
  { name: 'Private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g, secretGroup: 0 },
  { name: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/g, secretGroup: 0 },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g, secretGroup: 0 },
  { name: 'Slack token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g, secretGroup: 0 },
  { name: 'Stripe live key', re: /\b[sr]k_live_[A-Za-z0-9]{16,}\b/g, secretGroup: 0 },
  { name: 'Long hex string (looks like a generated secret)', re: /\b[a-f0-9]{64,}\b/g, secretGroup: 0 },
  { name: 'Hard-coded password or API key', re: /\b(?:password|passwd|api[_-]?key|secret|token)\s*[:=]\s*['"]([^'"\s]{16,})['"]/gi, secretGroup: 1 }
];

// secret-patterns.test.mjs holds deliberately fake secrets to prove the rules work.
export const SKIP_FILES = /(^|\/)(package-lock\.json|secret-patterns\.test\.mjs|.*\.(png|jpe?g|gif|webp|ico|woff2?|zip|bundle))$/i;
export const FORBIDDEN_FILES = /(^|\/)\.env(\..+)?$/; // .env.example is allowed below
export const isForbiddenFile = (path) => FORBIDDEN_FILES.test(path) && !/\.env\.example$/.test(path);

const mask = (s) => (s.length <= 8 ? '****' : `${s.slice(0, 3)}…${s.slice(-2)} (${s.length} chars)`);

// Returns [{ rule, line, preview }] for one line of text.
// Test fixtures use obviously fake passwords, so the generic password rule is skipped inside test/ folders.
export function scanLine(text, file = '') {
  const hits = [];
  if (PLACEHOLDER.test(text)) return hits;
  const inTests = /(^|\/)test\//.test(file);
  for (const { name, re, secretGroup } of RULES) {
    if (inTests && name.startsWith('Hard-coded password')) continue;
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) hits.push({ rule: name, preview: mask(m[secretGroup] ?? m[0]) });
  }
  return hits;
}
