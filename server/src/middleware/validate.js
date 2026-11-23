const { AppError } = require('../utils/AppError');

/**
 * Validates req.body / req.query / req.params against Zod schemas.
 * Parsed (typed, stripped of unknown keys) values are put on req.valid so
 * controllers never touch the raw request input.
 */
const validate = (schemas) => (req, _res, next) => {
  req.valid = req.valid || {};
  for (const key of ['params', 'query', 'body']) {
    if (!schemas[key]) continue;
    const result = schemas[key].safeParse(req[key] ?? {});
    if (!result.success) {
      throw new AppError(
        400,
        'Validation failed',
        'VALIDATION_ERROR',
        result.error.issues.map((issue) => ({
          field: issue.path.join('.') || key,
          message: issue.message,
        }))
      );
    }
    req.valid[key] = result.data;
  }
  next();
};

module.exports = { validate };
