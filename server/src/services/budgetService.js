const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const { BUDGET_THRESHOLDS } = require('../constants');
const { formatMoney, roundMoney } = require('../utils/format');
const { startOfMonth, endOfMonth, monthLabel } = require('../utils/dates');

/**
 * Spending status for one budget. `level` is one of
 * null | 50 | 75 | 90 | 'exceeded', with a human-readable message.
 */
function budgetStatus({ amount, spent, month, category, currency }) {
  const percentUsed = amount > 0 ? Math.round((spent / amount) * 1000) / 10 : 0;
  const remaining = roundMoney(amount - spent);
  const label = `${monthLabel(month).split(' ')[0]}${category ? ` ${category}` : ''}`;

  let level = null;
  let message = null;
  if (spent > amount) {
    level = 'exceeded';
    message = `${category ? `${category} budget` : 'Budget'} exceeded by ${formatMoney(spent - amount, currency)}.`;
  } else if (percentUsed >= 100) {
    level = 'exceeded';
    message = `You have used 100% of your ${label} budget.`;
  } else {
    const hit = BUDGET_THRESHOLDS.find((t) => percentUsed >= t);
    if (hit) {
      level = hit;
      message = `You have used ${hit}% of your ${label} budget.`;
    }
  }

  return { amount: roundMoney(amount), spent: roundMoney(spent), remaining, percentUsed, level, message };
}

/** Expense totals per category (and overall) for the month containing `month`. */
async function monthSpending(userId, month) {
  const rows = await Transaction.aggregate([
    { $match: { user: userId, type: 'expense', date: { $gte: startOfMonth(month), $lte: endOfMonth(month) } } },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
  ]);
  const byCategory = Object.fromEntries(rows.map((r) => [r._id, r.total]));
  const total = rows.reduce((acc, r) => acc + r.total, 0);
  return { total, byCategory };
}

/** All of a user's budgets with their status for the given month. */
async function budgetsForMonth(user, month) {
  const [budgets, spending] = await Promise.all([
    Budget.find({ user: user._id }).lean(),
    monthSpending(user._id, month),
  ]);

  const withStatus = budgets.map((b) => ({
    _id: b._id,
    category: b.category,
    ...budgetStatus({
      amount: b.amount,
      spent: b.category ? spending.byCategory[b.category] || 0 : spending.total,
      month,
      category: b.category,
      currency: user.currency,
    }),
  }));

  return {
    month: startOfMonth(month).toISOString().slice(0, 7),
    overall: withStatus.find((b) => b.category === null) || null,
    categories: withStatus.filter((b) => b.category !== null).sort((a, b) => b.percentUsed - a.percentUsed),
    totalSpent: roundMoney(spending.total),
  };
}

module.exports = { budgetStatus, budgetsForMonth };
