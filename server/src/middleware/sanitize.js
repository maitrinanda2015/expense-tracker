const { AppError } = require('../utils/AppError');

const isUnsafeKey = (key) => key.startsWith('$') || key.includes('.') || key === '__proto__' || key === 'constructor' || key === 'prototype';

function findUnsafeKey(value, depth = 0) {
  if (depth > 10 || value === null || typeof value !== 'object') return null;
  for (const key of Object.keys(value)) {
    if (isUnsafeKey(key)) return key;
    const nested = findUnsafeKey(value[key], depth + 1);
    if (nested) return nested;
  }
  return null;
}

/**
 * Defence in depth against NoSQL operator injection: reject any request whose
 * body or query contains keys like "$gt" or "a.b". The Zod schemas already
 * only accept primitive values, so this is a second line of defence.
 */
function rejectMongoOperators(req, _res, next) {
  const key = findUnsafeKey(req.body) || findUnsafeKey(req.query);
  if (key) throw new AppError(400, `Disallowed key in request: "${key}"`, 'INVALID_INPUT');
  next();
}

module.exports = { rejectMongoOperators };
