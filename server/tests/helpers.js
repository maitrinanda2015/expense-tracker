const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const { connectDB } = require('../src/config/db');

async function setupDatabase() {
  await connectDB(process.env.MONGODB_URI);
  if (!mongoose.connection.name.includes('test')) {
    throw new Error(`Refusing to run tests against non-test database "${mongoose.connection.name}"`);
  }
  await mongoose.connection.dropDatabase();
  await mongoose.connection.syncIndexes();
}

async function clearDatabase() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

async function teardownDatabase() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

let counter = 0;

/** Register a user; returns { token, user, auth, cashAccountId }. */
async function createUser(overrides = {}) {
  counter += 1;
  const body = {
    name: `User ${counter}`,
    email: `user${counter}-${Date.now()}@example.com`,
    password: 'password123',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(body).expect(201);
  const auth = { Authorization: `Bearer ${res.body.token}` };
  const accounts = await request(app).get('/api/accounts').set(auth).expect(200);
  return { ...res.body, auth, password: body.password, cashAccountId: accounts.body.data[0]._id };
}

const api = () => request(app);

module.exports = { setupDatabase, clearDatabase, teardownDatabase, createUser, api, app };
