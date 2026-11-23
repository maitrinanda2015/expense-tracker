const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { env } = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimit');
const { rejectMongoOperators } = require('./middleware/sanitize');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const apiRoutes = require('./routes');

const app = express();

// Render / Railway sit behind one proxy; needed for correct client IPs in rate limiting.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet());
app.use(
  cors({
    // Only the configured frontend origin(s). Auth uses a Bearer header, not
    // cookies, so credentials are not enabled.
    origin(origin, callback) {
      callback(null, !origin || env.clientOrigins.includes(origin));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition'],
    maxAge: 600,
  })
);
app.use(express.json({ limit: '100kb' }));
if (!env.isTest) app.use(morgan(env.isProduction ? 'combined' : 'dev'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api', apiLimiter, rejectMongoOperators, apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
