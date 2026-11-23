const cron = require('node-cron');
const { env, assertEnv } = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const { processDueRecurring } = require('./services/recurringService');
const app = require('./app');

async function start() {
  assertEnv();
  await connectDB(env.mongoUri);
  console.log('Connected to MongoDB');

  const server = app.listen(env.port, () => console.log(`API listening on port ${env.port}`));

  // Recurring transactions are also processed on login and when the
  // dashboard / transaction list loads, so free hosts that sleep between
  // requests still catch up.
  const job = cron.schedule(env.recurringCron, async () => {
    try {
      const created = await processDueRecurring();
      if (created) console.log(`Recurring job created ${created} transaction(s)`);
    } catch (err) {
      console.error('Recurring job failed:', err);
    }
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down`);
    job.stop();
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
