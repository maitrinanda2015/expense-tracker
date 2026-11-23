const mongoose = require('mongoose');
const multer = require('multer');
const { env } = require('../config/env');
const { AppError } = require('../utils/AppError');

function notFoundHandler(req, _res, next) {
  next(new AppError(404, `Route ${req.method} ${req.originalUrl} not found`, 'ROUTE_NOT_FOUND'));
}

function toAppError(err) {
  if (err instanceof AppError) return err;

  if (err instanceof mongoose.Error.ValidationError) {
    return new AppError(
      400,
      'Validation failed',
      'VALIDATION_ERROR',
      Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }))
    );
  }
  if (err instanceof mongoose.Error.CastError) {
    return new AppError(400, `Invalid value for ${err.path}`, 'INVALID_INPUT');
  }
  if (err && err.code === 11000) {
    return new AppError(409, 'A record with these details already exists', 'DUPLICATE');
  }
  if (err instanceof multer.MulterError) {
    return err.code === 'LIMIT_FILE_SIZE'
      ? new AppError(413, 'Attachment must be 2 MB or smaller', 'FILE_TOO_LARGE')
      : new AppError(400, err.message, 'UPLOAD_ERROR');
  }
  if (err && err.type === 'entity.parse.failed') {
    return new AppError(400, 'Request body is not valid JSON', 'INVALID_JSON');
  }
  if (err && err.type === 'entity.too.large') {
    return new AppError(413, 'Request body is too large', 'PAYLOAD_TOO_LARGE');
  }
  return null;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  const known = toAppError(err);

  if (!known) {
    if (!env.isTest) console.error(err);
    return res.status(500).json({
      error: {
        message: env.isProduction ? 'Something went wrong' : err.message,
        code: 'INTERNAL_ERROR',
      },
    });
  }

  const body = { message: known.message, code: known.code };
  if (known.details) body.details = known.details;
  res.status(known.status).json({ error: body });
}

module.exports = { notFoundHandler, errorHandler };
