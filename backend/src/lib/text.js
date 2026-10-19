import { z } from 'zod';

// Strips control characters, HTML tags and stray angle brackets from user text.
// React escapes output anyway; this keeps markup out of the database, emails and exports.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const TAGS = /<\/?[a-z!][^>]*>/gi;

export const cleanText = (s) => s.normalize('NFC').replace(CONTROL, '').replace(TAGS, '').replace(/[<>]/g, '').trim();

export const plain = (max = 200, min = 1) => z.string().transform(cleanText).pipe(z.string().min(min).max(max));
export const optionalPlain = (max = 500) => plain(max, 0).optional();

export const email = z.string().trim().toLowerCase().max(254).pipe(z.email());
export const phone = z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number');
export const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
export const reference = z.string().trim().toUpperCase().regex(/^EO-[RO]-[A-Z0-9]{10}$/, 'Invalid reference');
