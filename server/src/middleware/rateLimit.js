const rateLimit = require('express-rate-limit');
const { env } = require('../config/env');

const jsonHandler = (message) => (_req, res, _next, options) => {
  res.status(options.statusCode).json({ error: { message, code: 'RATE_LIMITED' } });
};

// Login/register: slow down brute-force and credential-stuffing attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.authRateLimitMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: jsonHandler('Too many attempts. Please try again in 15 minutes.'),
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.apiRateLimitMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: jsonHandler('Too many requests. Please slow down.'),
});

module.exports = { authLimiter, apiLimiter };
