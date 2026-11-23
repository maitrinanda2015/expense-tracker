const os = require('os');
const mongoose = require('mongoose');

mongoose.set('strictQuery', true);

async function connectDB(uri) {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    // The MongoDB driver otherwise loads `os` with a dynamic import(), which
    // fails silently inside Jest's CommonJS sandbox and breaks the handshake.
    runtimeAdapters: { os },
  });
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
