const jwt = require('jsonwebtoken');
const { setupDatabase, clearDatabase, teardownDatabase, createUser, api } = require('./helpers');

beforeAll(setupDatabase);
afterEach(clearDatabase);
afterAll(teardownDatabase);

describe('POST /api/auth/register', () => {
  it('creates a user, returns a JWT and never exposes the password', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Maitri', email: 'Maitri@Example.com', password: 'password123' })
      .expect(201);

    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.expiresAt).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ name: 'Maitri', email: 'maitri@example.com' });
    expect(res.body.user.password).toBeUndefined();
  });

  it('creates a default Cash account for the new user', async () => {
    const { auth } = await createUser();
    const res = await api().get('/api/accounts').set(auth).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ name: 'Cash', type: 'cash', balance: 0 });
  });

  it('rejects a duplicate email with 409', async () => {
    await createUser({ email: 'dupe@example.com' });
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Other', email: 'DUPE@example.com', password: 'password123' })
      .expect(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('validates input', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ name: '', email: 'not-an-email', password: 'short' })
      .expect(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    await createUser({ email: 'login@example.com', password: 'password123' });
    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'password123' })
      .expect(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe('login@example.com');
  });

  it('rejects a wrong password and an unknown email with the same message', async () => {
    await createUser({ email: 'login@example.com' });
    const wrong = await api()
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'wrong-password' })
      .expect(401);
    const unknown = await api()
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever123' })
      .expect(401);
    expect(wrong.body.error.message).toBe('Invalid email or password');
    expect(unknown.body.error.message).toBe(wrong.body.error.message);
  });

  it('blocks NoSQL operator injection in the login body', async () => {
    await createUser({ email: 'victim@example.com' });
    await api()
      .post('/api/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } })
      .expect(400);
  });
});

describe('protected routes', () => {
  it('rejects requests without a token', async () => {
    const res = await api().get('/api/transactions').expect(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('rejects a malformed or forged token', async () => {
    await api().get('/api/auth/me').set('Authorization', 'Bearer not-a-jwt').expect(401);

    const { user } = await createUser();
    const forged = jwt.sign({ sub: user._id }, 'some-other-secret');
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${forged}`).expect(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('rejects an expired token with TOKEN_EXPIRED', async () => {
    const { user } = await createUser();
    const expired = jwt.sign(
      { sub: user._id, exp: Math.floor(Date.now() / 1000) - 60 },
      process.env.JWT_SECRET
    );
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${expired}`).expect(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('returns the current user for a valid token', async () => {
    const { auth, user } = await createUser();
    const res = await api().get('/api/auth/me').set(auth).expect(200);
    expect(res.body.data._id).toBe(user._id);
  });

  it('protects every resource route on the server', async () => {
    const routes = [
      ['get', '/api/dashboard'],
      ['get', '/api/accounts'],
      ['get', '/api/categories'],
      ['get', '/api/budgets'],
      ['get', '/api/goals'],
      ['get', '/api/analytics/summary'],
      ['get', '/api/transactions/export'],
      ['post', '/api/transactions'],
    ];
    for (const [method, path] of routes) {
      await api()[method](path).expect(401);
    }
  });
});
