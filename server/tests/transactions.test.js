const { setupDatabase, clearDatabase, teardownDatabase, createUser, api } = require('./helpers');

beforeAll(setupDatabase);
afterEach(clearDatabase);
afterAll(teardownDatabase);

const txBody = (accountId, overrides = {}) => ({
  amount: 25,
  type: 'expense',
  category: 'Food',
  account: accountId,
  note: 'Lunch',
  date: '2026-07-01',
  ...overrides,
});

async function addTx(user, overrides) {
  const res = await api()
    .post('/api/transactions')
    .set(user.auth)
    .send(txBody(user.cashAccountId, overrides))
    .expect(201);
  return res.body.data;
}

describe('transaction CRUD', () => {
  it('creates a transaction', async () => {
    const user = await createUser();
    const tx = await addTx(user);
    expect(tx).toMatchObject({ amount: 25, type: 'expense', category: 'Food', note: 'Lunch' });
    expect(tx.account).toMatchObject({ _id: user.cashAccountId, name: 'Cash' });
    expect(tx.date.slice(0, 10)).toBe('2026-07-01');
  });

  it('defaults the date to today', async () => {
    const user = await createUser();
    const { date, ...body } = txBody(user.cashAccountId);
    const res = await api().post('/api/transactions').set(user.auth).send(body).expect(201);
    expect(res.body.data.date.slice(0, 10)).toBe(new Date().toISOString().slice(0, 10));
  });

  it('validates amount, type and category', async () => {
    const user = await createUser();
    const res = await api()
      .post('/api/transactions')
      .set(user.auth)
      .send(txBody(user.cashAccountId, { amount: -5, type: 'gift' }))
      .expect(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['amount', 'type']));

    await api()
      .post('/api/transactions')
      .set(user.auth)
      .send(txBody(user.cashAccountId, { type: 'income', category: 'Food' }))
      .expect(400);
  });

  it('accepts a custom category after it is created', async () => {
    const user = await createUser();
    await api()
      .post('/api/categories')
      .set(user.auth)
      .send({ name: 'Pets', type: 'expense', icon: '🐶' })
      .expect(201);
    const tx = await addTx(user, { category: 'pets' });
    expect(tx.category).toBe('Pets');
  });

  it('updates and deletes a transaction', async () => {
    const user = await createUser();
    const tx = await addTx(user);

    const updated = await api()
      .patch(`/api/transactions/${tx._id}`)
      .set(user.auth)
      .send({ amount: 30.5, note: 'Dinner' })
      .expect(200);
    expect(updated.body.data).toMatchObject({ amount: 30.5, note: 'Dinner', category: 'Food' });

    await api().delete(`/api/transactions/${tx._id}`).set(user.auth).expect(204);
    await api().get(`/api/transactions/${tx._id}`).set(user.auth).expect(404);
  });

  it('strips HTML from notes', async () => {
    const user = await createUser();
    const tx = await addTx(user, { note: '<script>alert(1)</script>Coffee' });
    expect(tx.note).toBe('alert(1)Coffee');
  });
});

describe('listing, filtering and pagination', () => {
  let user;
  beforeEach(async () => {
    user = await createUser();
    await addTx(user, { amount: 10, category: 'Food', note: 'Coffee', date: '2026-07-01' });
    await addTx(user, { amount: 60, category: 'Travel', note: 'Train', date: '2026-07-05' });
    await addTx(user, { amount: 2500, type: 'income', category: 'Salary', note: 'July salary', date: '2026-07-02' });
    await addTx(user, { amount: 15, category: 'Food', note: 'Sandwich', date: '2026-08-01' });
  });

  it('paginates on the server', async () => {
    const page1 = await api().get('/api/transactions?limit=3&page=1').set(user.auth).expect(200);
    expect(page1.body.data).toHaveLength(3);
    expect(page1.body.pagination).toEqual({ page: 1, limit: 3, total: 4, pages: 2 });
    expect(page1.body.data[0].date.slice(0, 10)).toBe('2026-08-01');

    const page2 = await api().get('/api/transactions?limit=3&page=2').set(user.auth).expect(200);
    expect(page2.body.data).toHaveLength(1);
  });

  it('combines type, category, date and amount filters', async () => {
    const res = await api()
      .get('/api/transactions')
      .query({ type: 'expense', category: 'Food', from: '2026-07-01', to: '2026-07-31', minAmount: 5, maxAmount: 20 })
      .set(user.auth)
      .expect(200);
    expect(res.body.data.map((t) => t.note)).toEqual(['Coffee']);
  });

  it('searches note, category and amount', async () => {
    const byNote = await api().get('/api/transactions?search=salary').set(user.auth).expect(200);
    expect(byNote.body.data.map((t) => t.note)).toEqual(['July salary']);

    const byCategory = await api().get('/api/transactions?search=trav').set(user.auth).expect(200);
    expect(byCategory.body.data.map((t) => t.note)).toEqual(['Train']);

    const byAmount = await api().get('/api/transactions?search=15').set(user.auth).expect(200);
    expect(byAmount.body.data.map((t) => t.note)).toEqual(['Sandwich']);
  });

  it('treats regex characters in search literally', async () => {
    const res = await api().get('/api/transactions').query({ search: '.*' }).set(user.auth).expect(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('rejects invalid filters', async () => {
    await api().get('/api/transactions?from=2026-08-01&to=2026-07-01').set(user.auth).expect(400);
    await api().get('/api/transactions?limit=1000').set(user.auth).expect(400);
  });

  it('exports filtered transactions as CSV', async () => {
    const res = await api()
      .get('/api/transactions/export?type=expense&category=Food&sort=date_asc')
      .set(user.auth)
      .expect(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text.trim().split('\r\n')).toEqual([
      'Date,Type,Category,Account,Amount,Note',
      '2026-07-01,Expense,Food,Cash,10,Coffee',
      '2026-08-01,Expense,Food,Cash,15,Sandwich',
    ]);
  });
});

describe('data isolation between users', () => {
  let alice;
  let bob;
  let aliceTx;

  beforeEach(async () => {
    alice = await createUser({ name: 'Alice' });
    bob = await createUser({ name: 'Bob' });
    aliceTx = await addTx(alice, { note: 'Alice private' });
  });

  it("does not include another user's transactions in lists or exports", async () => {
    const list = await api().get('/api/transactions').set(bob.auth).expect(200);
    expect(list.body.data).toHaveLength(0);
    expect(list.body.pagination.total).toBe(0);

    const csv = await api().get('/api/transactions/export').set(bob.auth).expect(200);
    expect(csv.text).not.toContain('Alice private');
  });

  it("cannot read, update or delete another user's transaction by id", async () => {
    await api().get(`/api/transactions/${aliceTx._id}`).set(bob.auth).expect(404);
    await api().patch(`/api/transactions/${aliceTx._id}`).set(bob.auth).send({ amount: 1 }).expect(404);
    await api().delete(`/api/transactions/${aliceTx._id}`).set(bob.auth).expect(404);
    await api().get(`/api/transactions/${aliceTx._id}/attachment`).set(bob.auth).expect(404);

    const stillThere = await api().get(`/api/transactions/${aliceTx._id}`).set(alice.auth).expect(200);
    expect(stillThere.body.data.amount).toBe(25);
  });

  it("cannot create a transaction in another user's account", async () => {
    const res = await api()
      .post('/api/transactions')
      .set(bob.auth)
      .send(txBody(alice.cashAccountId))
      .expect(400);
    expect(res.body.error.code).toBe('INVALID_ACCOUNT');
  });

  it("cannot move their own transaction into another user's account", async () => {
    const bobTx = await addTx(bob);
    await api()
      .patch(`/api/transactions/${bobTx._id}`)
      .set(bob.auth)
      .send({ account: alice.cashAccountId })
      .expect(400);
  });

  it("does not count another user's data in dashboard totals or account balances", async () => {
    const dash = await api().get('/api/dashboard').set(bob.auth).expect(200);
    expect(dash.body.data).toMatchObject({ balance: 0, totalIncome: 0, totalExpenses: 0 });
    expect(dash.body.data.recentTransactions).toHaveLength(0);

    await api().patch(`/api/accounts/${alice.cashAccountId}`).set(bob.auth).send({ name: 'Hacked' }).expect(404);
    await api().delete(`/api/accounts/${alice.cashAccountId}`).set(bob.auth).expect(404);
  });

  it('rejects malformed ids', async () => {
    await api().get('/api/transactions/not-an-id').set(bob.auth).expect(400);
  });
});

describe('attachments', () => {
  it('uploads, downloads and removes an attachment', async () => {
    const user = await createUser();
    const tx = await addTx(user);
    const png = Buffer.from('89504e470d0a1a0a', 'hex');

    const up = await api()
      .post(`/api/transactions/${tx._id}/attachment`)
      .set(user.auth)
      .attach('file', png, { filename: 'receipt.png', contentType: 'image/png' })
      .expect(200);
    expect(up.body.data.attachment).toMatchObject({ filename: 'receipt.png', mimetype: 'image/png' });
    expect(up.body.data.attachmentData).toBeUndefined();

    const down = await api().get(`/api/transactions/${tx._id}/attachment`).set(user.auth).expect(200);
    expect(down.headers['content-type']).toBe('image/png');

    await api().delete(`/api/transactions/${tx._id}/attachment`).set(user.auth).expect(204);
    await api().get(`/api/transactions/${tx._id}/attachment`).set(user.auth).expect(404);
  });

  it('rejects unsupported file types', async () => {
    const user = await createUser();
    const tx = await addTx(user);
    await api()
      .post(`/api/transactions/${tx._id}/attachment`)
      .set(user.auth)
      .attach('file', Buffer.from('MZ'), { filename: 'virus.exe', contentType: 'application/octet-stream' })
      .expect(400);
  });
});
