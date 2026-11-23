const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const User = require('../models/User');
const { AppError } = require('../utils/AppError');

function signToken(userId) {
  const token = jwt.sign({ sub: String(userId) }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
    algorithm: 'HS256',
  });
  const { exp } = jwt.decode(token);
  return { token, expiresAt: new Date(exp * 1000).toISOString() };
}

async function requireAuth(req, _res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError(401, 'Your session has expired. Please log in again.', 'TOKEN_EXPIRED');
    }
    throw new AppError(401, 'Invalid authentication token', 'INVALID_TOKEN');
  }

  const user = typeof payload.sub === 'string' ? await User.findById(payload.sub).catch(() => null) : null;
  if (!user) throw new AppError(401, 'Account no longer exists', 'INVALID_TOKEN');

  req.user = user;
  next();
}

module.exports = { requireAuth, signToken };
