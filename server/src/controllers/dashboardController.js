const Transaction = require('../models/Transaction');
const { totalsByType, monthlySeries } = require('../services/statsService');
const { budgetsForMonth } = require('../services/budgetService');
const { processDueRecurring } = require('../services/recurringService');
const { roundMoney } = require('../utils/format');

const RECENT_LIMIT = 8;

async function getDashboard(req, res) {
  const user = req.user;
  await processDueRecurring({ userId: user._id });

  const now = new Date();
  const [totals, budgets, recent, chart] = await Promise.all([
    totalsByType({ user: user._id }),
    budgetsForMonth(user, now),
    Transaction.find({ user: user._id })
      .sort({ date: -1, createdAt: -1 })
      .limit(RECENT_LIMIT)
      .populate('account', 'name type')
      .lean(),
    monthlySeries(user._id, 6, now),
  ]);

  const thisMonth = chart[chart.length - 1];

  res.json({
    data: {
      // Total Balance = Total Income - Total Expenses
      balance: roundMoney(totals.income - totals.expense),
      totalIncome: totals.income,
      totalExpenses: totals.expense,
      month: budgets.month,
      monthIncome: thisMonth.income,
      monthExpenses: thisMonth.expense,
      budget: budgets.overall,
      categoryBudgetAlerts: budgets.categories.filter((b) => b.level),
      recentTransactions: recent,
      chart,
    },
  });
}

module.exports = { getDashboard };
