const {
  totalsByType,
  monthlySeries,
  periodWindow,
  trendSeries,
  categoryBreakdown,
  dateRange,
} = require('../services/statsService');
const { endOfDay } = require('../utils/dates');
const { roundMoney } = require('../utils/format');

/** Totals, category breakdown and trend for week | month | 3months | year. */
async function summary(req, res) {
  const userId = req.user._id;
  const { period } = req.valid.query;
  const to = endOfDay(new Date());
  const { from, unit } = periodWindow(period);

  const [totals, categories, trend] = await Promise.all([
    totalsByType({ user: userId, date: dateRange(from, to) }),
    categoryBreakdown(userId, from, to),
    trendSeries(userId, from, to, unit),
  ]);

  res.json({
    data: {
      period,
      from: from.toISOString(),
      to: to.toISOString(),
      bucket: unit,
      income: totals.income,
      expense: totals.expense,
      net: roundMoney(totals.income - totals.expense),
      savingsRate: totals.income ? Math.round(((totals.income - totals.expense) / totals.income) * 1000) / 10 : 0,
      categories,
      trend,
    },
  });
}

/** Monthly income, expenses and net savings for the last N months. */
async function monthly(req, res) {
  res.json({ data: await monthlySeries(req.user._id, req.valid.query.months) });
}

module.exports = { summary, monthly };
