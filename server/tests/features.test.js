const Transaction = require('../src/models/Transaction');
const { processDueRecurring } = require('../src/services/recurringService');
const { nthOccurrence } = require('../src/utils/dates');
const { setupDatabase, clearDatabase, teardownDatabase, createUser, api } = require('./helpers');

beforeAll(setupDatabase);
afterEach(clearDatabase);
afterAll(teardownDatabase);

const isoDay = (d) => new Date(d).toISOString().slice(0, 10);
const todayIso = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => isoDay(Date.now() - n * 24 * 60 * 60 * 1000);

async function addTx(user, body) {
  const res = await api()
    .post('/api/transactions')
    .set(user.auth)
    .send({ account: user.cashAccountId, type: 'expense', category: 'Food', ...body })
    .expect(201);
  return res.body.data;
}

describe('recurring transactions', () => {
  it('monthly dates do not drift after short months', () => {
    const anchor = new Date('2026-01-31T00:00:00Z');
    expect(isoDay(nthOccurrence(anchor, 'monthly', 1))).toBe('2026-02-28');
    expect(isoDay(nthOccurrence(anchor, 'monthly', 2))).toBe('2026-03-31');
    expect(isoDay(nthOccurrence(anchor, 'yearly', 1))).toBe('2027-01-31');
  });

  it('creates every due occurrence for a backdated template, exactly once', async () => {
    const user = await createUser();
    const template = await addTx(user, {
      amount: 10,
      category: 'Subscription',
      note: 'Streaming',
      date: daysAgo(14),
      isRecurring: true,
      frequency: 'weekly',
    });
    expect(template.recurring).toMatchObject({ enabled: true, frequency: 'weekly' });

    // Created on save: occurrences 7 and 14 days after the original date.
    const generated = await Transaction.find({ generatedFrom: template._id }).sort({ date: 1 }).lean();
    expect(generated.map((t) => isoDay(t.date))).toEqual([daysAgo(7), todayIso()]);

    // Running the job again must not create duplicates.
    expect(await processDueRecurring()).toBe(0);
    expect(await Transaction.countDocuments({ generatedFrom: template._id })).toBe(2);
  });

  it('creates the next occurrence when its date arrives', async () => {
    const user = await createUser();
    const template = await addTx(user, {
      amount: 1200,
      category: 'Rent',
      date: todayIso(),
      isRecurring: true,
      frequency: 'monthly',
    });
    expect(await Transaction.countDocuments({ generatedFrom: template._id })).toBe(0);

    const anchor = new Date(`${todayIso()}T00:00:00Z`);
    const nextMonth = nthOccurrence(anchor, 'monthly', 1);
    const created = await processDueRecurring({ now: new Date(nextMonth.getTime() + 1000) });
    expect(created).toBe(1);

    const generated = await Transaction.findOne({ generatedFrom: template._id }).lean();
    expect(isoDay(generated.date)).toBe(isoDay(nextMonth));
    const stored = await Transaction.findById(template._id).lean();
    expect(isoDay(stored.recurring.nextDate)).toBe(isoDay(nthOccurrence(anchor, 'monthly', 2)));
  });

  it('stops generating when recurring is turned off', async () => {
    const user = await createUser();
    const template = await addTx(user, { amount: 5, date: todayIso(), isRecurring: true, frequency: 'daily' });
    await api().patch(`/api/transactions/${template._id}`).set(user.auth).send({ isRecurring: false }).expect(200);
    const later = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    expect(await processDueRecurring({ now: later })).toBe(0);
  });
});

describe('budgets', () => {
  it('reports thresholds and the amount a budget is exceeded by', async () => {
    const user = await createUser();
    await api().put('/api/budgets').set(user.auth).send({ amount: 100 }).expect(201);
    await api().put('/api/budgets').set(user.auth).send({ category: 'food', amount: 50 }).expect(201);

    await addTx(user, { amount: 45, date: todayIso() });
    await addTx(user, { amount: 46, category: 'Travel', date: todayIso() });

    const res = await api().get('/api/budgets').set(user.auth).expect(200);
    const { overall, categories } = res.body.data;
    const monthName = new Date().toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });

    expect(overall).toMatchObject({ amount: 100, spent: 91, remaining: 9, percentUsed: 91, level: 90 });
    expect(overall.message).toBe(`You have used 90% of your ${monthName} budget.`);
    expect(categories[0]).toMatchObject({ category: 'Food', spent: 45, level: 90 });

    await addTx(user, { amount: 159, category: 'Bills', date: todayIso() });
    const over = await api().get('/api/budgets').set(user.auth).expect(200);
    expect(over.body.data.overall).toMatchObject({ level: 'exceeded', remaining: -150 });
    expect(over.body.data.overall.message).toBe('Budget exceeded by $150.00.');
  });

  it('updates the existing budget instead of creating a duplicate', async () => {
    const user = await createUser();
    await api().put('/api/budgets').set(user.auth).send({ amount: 100 }).expect(201);
    await api().put('/api/budgets').set(user.auth).send({ amount: 250 }).expect(200);
    const res = await api().get('/api/budgets').set(user.auth).expect(200);
    expect(res.body.data.overall.amount).toBe(250);
  });
});

describe('dashboard and analytics are computed from stored data', () => {
  it('computes balance = income - expenses and a category breakdown', async () => {
    const user = await createUser();
    await addTx(user, { amount: 2500, type: 'income', category: 'Salary', date: todayIso() });
    await addTx(user, { amount: 300, category: 'Food', date: todayIso() });
    await addTx(user, { amount: 100, category: 'Travel', date: todayIso() });

    const dash = await api().get('/api/dashboard').set(user.auth).expect(200);
    expect(dash.body.data).toMatchObject({ balance: 2100, totalIncome: 2500, totalExpenses: 400 });
    expect(dash.body.data.recentTransactions).toHaveLength(3);
    expect(dash.body.data.chart).toHaveLength(6);

    const analytics = await api().get('/api/analytics/summary?period=week').set(user.auth).expect(200);
    const data = analytics.body.data;
    expect(data).toMatchObject({ income: 2500, expense: 400, net: 2100, bucket: 'day' });
    expect(data.trend).toHaveLength(7);
    expect(data.trend[6]).toMatchObject({ date: todayIso(), income: 2500, expense: 400 });
    expect(data.categories.expense).toEqual([
      { category: 'Food', total: 300, count: 1, percent: 75 },
      { category: 'Travel', total: 100, count: 1, percent: 25 },
    ]);

    for (const period of ['month', '3months', 'year']) {
      const res = await api().get(`/api/analytics/summary?period=${period}`).set(user.auth).expect(200);
      expect(res.body.data.net).toBe(2100);
    }
  });

  it('computes per-account balances and a combined total', async () => {
    const user = await createUser();
    const bank = await api().post('/api/accounts').set(user.auth).send({ name: 'Bank', type: 'bank' }).expect(201);
    await addTx(user, { amount: 1000, type: 'income', category: 'Salary', account: bank.body.data._id });
    await addTx(user, { amount: 40 });

    const res = await api().get('/api/accounts').set(user.auth).expect(200);
    const byName = Object.fromEntries(res.body.data.map((a) => [a.name, a.balance]));
    expect(byName).toEqual({ Cash: -40, Bank: 1000 });
    expect(res.body.total).toBe(960);

    // An account with transactions cannot be deleted.
    await api().delete(`/api/accounts/${bank.body.data._id}`).set(user.auth).expect(409);
  });
});

describe('savings goals', () => {
  it('tracks progress and contributions', async () => {
    const user = await createUser();
    const res = await api()
      .post('/api/goals')
      .set(user.auth)
      .send({ name: 'New Laptop', targetAmount: 1500, currentAmount: 850, targetDate: '2027-01-01' })
      .expect(201);
    expect(res.body.data).toMatchObject({ name: 'New Laptop', progress: 56 });

    const after = await api()
      .post(`/api/goals/${res.body.data._id}/contribute`)
      .set(user.auth)
      .send({ amount: 650 })
      .expect(200);
    expect(after.body.data).toMatchObject({ currentAmount: 1500, progress: 100 });
  });
});
