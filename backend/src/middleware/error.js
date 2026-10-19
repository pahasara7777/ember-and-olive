import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: { message: `Not found: ${req.method} ${req.originalUrl}` } });
}

// Express 5 forwards rejected promises from async handlers here.
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: { message: 'Invalid request', issues: err.issues } });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: { message: status >= 500 ? 'Something went wrong' : err.message } });
}
