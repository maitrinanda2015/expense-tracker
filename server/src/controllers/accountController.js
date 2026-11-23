const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const { AppError, notFound } = require('../utils/AppError');
const { roundMoney } = require('../utils/format');

/** balance per account id: income - expense. */
async function balancesByAccount(userId) {
  const rows = await Transaction.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: '$account',
        income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
        expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
        count: { $sum: 1 },
      },
    },
  ]);
  return new Map(rows.map((r) => [String(r._id), r]));
}

async function list(req, res) {
  const userId = req.user._id;
  const [accounts, balances] = await Promise.all([
    Account.find({ user: userId }).sort({ createdAt: 1 }).lean(),
    balancesByAccount(userId),
  ]);

  const data = accounts.map((account) => {
    const b = balances.get(String(account._id)) || { income: 0, expense: 0, count: 0 };
    return {
      ...account,
      income: roundMoney(b.income),
      expense: roundMoney(b.expense),
      balance: roundMoney(b.income - b.expense),
      transactionCount: b.count,
    };
  });
  const total = roundMoney(data.reduce((acc, a) => acc + a.balance, 0));

  res.json({ data, total });
}

async function create(req, res) {
  const account = await Account.create({ ...req.valid.body, user: req.user._id });
  res.status(201).json({ data: account });
}

async function update(req, res) {
  const account = await Account.findOne({ _id: req.valid.params.id, user: req.user._id });
  if (!account) throw notFound('Account');
  Object.assign(account, req.valid.body);
  await account.save();
  res.json({ data: account });
}

async function remove(req, res) {
  const userId = req.user._id;
  const account = await Account.findOne({ _id: req.valid.params.id, user: userId });
  if (!account) throw notFound('Account');

  if (await Transaction.exists({ user: userId, account: account._id })) {
    throw new AppError(
      409,
      'This account still has transactions. Move or delete them before deleting the account.',
      'ACCOUNT_IN_USE'
    );
  }
  if ((await Account.countDocuments({ user: userId })) <= 1) {
    throw new AppError(409, 'You need at least one account', 'LAST_ACCOUNT');
  }

  await account.deleteOne();
  res.status(204).end();
}

module.exports = { list, create, update, remove };
