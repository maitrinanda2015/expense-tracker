require('dotenv').config({ quiet: true });

const list = (value, fallback) =>
  (value || fallback)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 12,
  clientOrigins: list(process.env.CLIENT_ORIGIN, 'http://localhost:5173'),
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  apiRateLimitMax: Number(process.env.API_RATE_LIMIT_MAX) || 600,
  recurringCron: process.env.RECURRING_CRON || '*/15 * * * *',
};

env.isProduction = env.nodeEnv === 'production';
env.isTest = env.nodeEnv === 'test';

function assertEnv() {
  const missing = ['MONGODB_URI', 'JWT_SECRET'].filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (env.isProduction && env.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
}

module.exports = { env, assertEnv };
