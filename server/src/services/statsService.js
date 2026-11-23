const Transaction = require('../models/Transaction');
const { roundMoney } = require('../utils/format');
const {
  startOfDay,
  startOfWeek,
  startOfMonth,
  addDays,
  addMonths,
  endOfMonth,
  monthKey,
} = require('../utils/dates');

/** { income, expense } totals for transactions matching `match`. */
async function totalsByType(match) {
  const rows = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ]);
  const totals = { income: 0, expense: 0 };
  for (const row of rows) totals[row._id] = roundMoney(row.total);
  return totals;
}

const dateRange = (from, to) => ({ $gte: from, $lte: to });

/** Per-month income / expense / net for the last `months` months (incl. current). */
async function monthlySeries(userId, months, now = new Date()) {
  const first = addMonths(startOfMonth(now), -(months - 1));
  const rows = await Transaction.aggregate([
    { $match: { user: userId, date: dateRange(first, endOfMonth(now)) } },
    {
      $group: {
        _id: { month: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'UTC' } }, type: '$type' },
        total: { $sum: '$amount' },
      },
    },
  ]);

  const byMonth = new Map();
  for (let i = 0; i < months; i += 1) {
    const key = monthKey(addMonths(first, i));
    byMonth.set(key, { month: key, income: 0, expense: 0, net: 0 });
  }
  for (const row of rows) {
    const bucket = byMonth.get(row._id.month);
    if (bucket) bucket[row._id.type] = roundMoney(row.total);
  }
  for (const bucket of byMonth.values()) bucket.net = roundMoney(bucket.income - bucket.expense);
  return [...byMonth.values()];
}

/** Period -> date range and bucket size for the trend chart. */
function periodWindow(period, now = new Date()) {
  const today = startOfDay(now);
  switch (period) {
    case 'week':
      return { from: addDays(today, -6), unit: 'day' };
    case '3months':
      return { from: startOfWeek(addDays(today, -7 * 12)), unit: 'week' };
    case 'year':
      return { from: addMonths(startOfMonth(today), -11), unit: 'month' };
    case 'month':
    default:
      return { from: addDays(today, -29), unit: 'day' };
  }
}

const truncate = { day: startOfDay, week: startOfWeek, month: startOfMonth };
const step = { day: (d) => addDays(d, 1), week: (d) => addDays(d, 7), month: (d) => addMonths(d, 1) };

async function trendSeries(userId, from, to, unit) {
  const rows = await Transaction.aggregate([
    { $match: { user: userId, date: dateRange(from, to) } },
    {
      $group: {
        _id: {
          bucket: { $dateTrunc: { date: '$date', unit, timezone: 'UTC', startOfWeek: 'monday' } },
          type: '$type',
        },
        total: { $sum: '$amount' },
      },
    },
  ]);

  const buckets = new Map();
  for (let d = truncate[unit](from); d <= to; d = step[unit](d)) {
    const key = d.toISOString();
    buckets.set(key, { date: key.slice(0, 10), income: 0, expense: 0 });
  }
  for (const row of rows) {
    const bucket = buckets.get(new Date(row._id.bucket).toISOString());
    if (bucket) bucket[row._id.type] = roundMoney(row.total);
  }
  return [...buckets.values()];
}

async function categoryBreakdown(userId, from, to) {
  const rows = await Transaction.aggregate([
    { $match: { user: userId, date: dateRange(from, to) } },
    { $group: { _id: { type: '$type', category: '$category' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);

  const result = { expense: [], income: [] };
  for (const row of rows) {
    result[row._id.type].push({ category: row._id.category, total: roundMoney(row.total), count: row.count });
  }
  for (const type of Object.keys(result)) {
    const sum = result[type].reduce((acc, r) => acc + r.total, 0);
    for (const r of result[type]) r.percent = sum ? Math.round((r.total / sum) * 1000) / 10 : 0;
  }
  return result;
}

module.exports = { totalsByType, monthlySeries, periodWindow, trendSeries, categoryBreakdown, dateRange };
