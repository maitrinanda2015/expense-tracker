/* Creates (or resets) a demo user with realistic sample data.
 *   npm run seed
 * Login: demo@example.com / demo12345
 */
const { env, assertEnv } = require('../src/config/env');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Account = require('../src/models/Account');
const Transaction = require('../src/models/Transaction');
const Budget = require('../src/models/Budget');
const Goal = require('../src/models/Goal');
const Category = require('../src/models/Category');
const { buildRecurring, processDueRecurring } = require('../src/services/recurringService');
const { startOfDay, addDays, addMonths, startOfMonth } = require('../src/utils/dates');

const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'demo12345';

// Small deterministic PRNG so every seed produces the same data.
let seed = 42;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const pick = (list) => list[Math.floor(rand() * list.length)];
const amount = (min, max) => Math.round((min + rand() * (max - min)) * 100) / 100;

const EXPENSES = [
  ['Food', 6, 45, ['Lunch', 'Groceries', 'Coffee', 'Dinner out', 'Bakery']],
  ['Travel', 3, 60, ['Metro card', 'Taxi', 'Fuel', 'Train ticket']],
  ['Shopping', 15, 120, ['Clothes', 'Headphones', 'Books', 'Home supplies']],
  ['Entertainment', 8, 50, ['Cinema', 'Concert', 'Board games']],
  ['Health', 10, 80, ['Pharmacy', 'Gym day pass']],
  ['Bills', 30, 90, ['Electricity', 'Internet', 'Phone bill']],
];

async function run() {
  assertEnv();
  await connectDB(env.mongoUri);

  const existing = await User.findOne({ email: DEMO_EMAIL });
  if (existing) {
    await Promise.all(
      [Account, Transaction, Budget, Goal, Category].map((Model) => Model.deleteMany({ user: existing._id }))
    );
    await existing.deleteOne();
  }

  const user = await User.create({ name: 'Demo User', email: DEMO_EMAIL, password: DEMO_PASSWORD });
  const [cash, bank, card] = await Account.create([
    { user: user._id, name: 'Cash', type: 'cash' },
    { user: user._id, name: 'Bank Account', type: 'bank' },
    { user: user._id, name: 'Credit Card', type: 'credit_card' },
  ]);
  await Account.create({ user: user._id, name: 'Savings', type: 'savings' });

  const today = startOfDay(new Date());
  const firstMonth = addMonths(startOfMonth(today), -5);
  const docs = [];

  // Day-to-day spending over the last ~6 months.
  for (let day = firstMonth; day <= today; day = addDays(day, 1)) {
    const count = Math.floor(rand() * 3);
    for (let i = 0; i < count; i += 1) {
      const [category, min, max, notes] = pick(EXPENSES);
      docs.push({
        user: user._id,
        account: pick([cash, card, bank])._id,
        type: 'expense',
        category,
        amount: amount(min, max),
        note: pick(notes),
        date: day,
      });
    }
    if (rand() < 0.04) {
      docs.push({
        user: user._id,
        account: bank._id,
        type: 'income',
        category: 'Freelance',
        amount: amount(150, 600),
        note: 'Freelance project',
        date: day,
      });
    }
  }
  await Transaction.insertMany(docs);

  // Recurring templates; the scheduler back-fills every past occurrence.
  const templates = [
    { account: bank, type: 'income', category: 'Salary', amount: 3200, note: 'Monthly salary', frequency: 'monthly' },
    { account: bank, type: 'expense', category: 'Rent', amount: 1100, note: 'Apartment rent', frequency: 'monthly' },
    { account: card, type: 'expense', category: 'Subscription', amount: 15.49, note: 'Netflix', frequency: 'monthly' },
  ];
  for (const t of templates) {
    const tx = new Transaction({ ...t, account: t.account._id, user: user._id, date: firstMonth });
    tx.recurring = await buildRecurring(tx, t.frequency);
    await tx.save();
  }
  await processDueRecurring({ userId: user._id });

  await Budget.create([
    { user: user._id, category: null, amount: 2400 },
    { user: user._id, category: 'Food', amount: 400 },
    { user: user._id, category: 'Shopping', amount: 250 },
  ]);
  await Goal.create([
    { user: user._id, name: 'New Laptop', targetAmount: 1500, currentAmount: 850, targetDate: addMonths(today, 4) },
    { user: user._id, name: 'Emergency Fund', targetAmount: 5000, currentAmount: 1200, targetDate: addMonths(today, 12) },
  ]);
  await Category.create({ user: user._id, name: 'Pets', type: 'expense', icon: '🐶' });

  const total = await Transaction.countDocuments({ user: user._id });
  console.log(`Seeded ${total} transactions. Log in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  await disconnectDB();
}

run().catch(async (err) => {
  console.error(err);
  await disconnectDB();
  process.exit(1);
});
