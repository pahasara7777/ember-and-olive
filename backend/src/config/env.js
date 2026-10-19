import { z } from 'zod';

// Fails fast at startup, and never prints the values it rejects.
const PLACEHOLDER = /change-me|replace|example|your[-_]?secret/i;

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\/.+/, 'must be a mongodb:// or mongodb+srv:// URI'),
  CLIENT_ORIGIN: z
    .string()
    .transform((s) => s.split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean))
    .pipe(z.array(z.url()).min(1)),
  JWT_SECRET: z
    .string()
    .min(32, 'must be at least 32 characters')
    .refine((v) => !PLACEHOLDER.test(v), 'is still a placeholder value'),
  TIMEZONE: z.string().default('Asia/Colombo'),
  DNS_SERVERS: z.string().regex(/^\s*[0-9a-fA-F:.]+(\s*,\s*[0-9a-fA-F:.]+)*\s*$/, 'must be comma-separated IP addresses').optional(),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0) // number of reverse proxies in front of the API
});

export function loadEnv(source = process.env) {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => ` - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === 'production' && env.CLIENT_ORIGIN.some((o) => !o.startsWith('https://'))) {
    throw new Error('Invalid environment configuration:\n - CLIENT_ORIGIN: must use https:// in production');
  }
  return Object.freeze(env);
}
