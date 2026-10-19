import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: { message: 'Not found' } });
}

// Express 5 forwards rejected promises from async handlers here.
// Only safe, generic messages leave the server: no stack traces, queries or file paths.
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err instanceof ZodError) {
    const issues = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({ error: { message: 'Please check the form and try again', issues } });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: { message: 'Malformed JSON' } });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: { message: 'Request too large' } });
  if (err.name === 'CastError') return res.status(400).json({ error: { message: 'Invalid input' } });
  if (err.code === 11000) return res.status(409).json({ error: { message: 'That already exists' } });

  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (status >= 500) console.error(`[${req.method} ${req.path}]`, err.message);
  res.status(status).json({ error: { message: status >= 500 ? 'Something went wrong' : err.message } });
}
