// Parses req.body with a zod schema; a ZodError becomes a 400 in errorHandler.
export const validate = (schema) => (req, res, next) => {
  req.body = schema.parse(req.body);
  next();
};
