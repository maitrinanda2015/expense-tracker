// All date math is done in UTC so that a transaction dated "2026-07-01"
// lands in July regardless of the server's timezone.

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date) => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const endOfDay = (date) => new Date(startOfDay(date).getTime() + DAY_MS - 1);

const addDays = (date, days) => new Date(new Date(date).getTime() + days * DAY_MS);

const startOfMonth = (date) => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
};

const addMonths = (date, months) => {
  const d = new Date(date);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  target.setUTCHours(d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds());
  return target;
};

const endOfMonth = (date) => new Date(addMonths(startOfMonth(date), 1).getTime() - 1);

// Monday-based week, matching MongoDB's $dateTrunc with startOfWeek: 'monday'.
const startOfWeek = (date) => {
  const d = startOfDay(date);
  return addDays(d, -((d.getUTCDay() + 6) % 7));
};

/** Parse "YYYY-MM" into the first instant of that month (UTC). */
const parseMonth = (value) => {
  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
};

const monthKey = (date) => new Date(date).toISOString().slice(0, 7);

const monthLabel = (date) =>
  new Date(date).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/**
 * The nth occurrence after `anchor`. Always computed from the original anchor
 * so monthly dates don't drift (Jan 31 -> Feb 28 -> Mar 31, not Mar 28).
 */
const nthOccurrence = (anchor, frequency, n) => {
  switch (frequency) {
    case 'daily':
      return addDays(anchor, n);
    case 'weekly':
      return addDays(anchor, 7 * n);
    case 'monthly':
      return addMonths(anchor, n);
    case 'yearly':
      return addMonths(anchor, 12 * n);
    default:
      throw new Error(`Unknown frequency: ${frequency}`);
  }
};

module.exports = {
  DAY_MS,
  startOfDay,
  endOfDay,
  addDays,
  startOfMonth,
  endOfMonth,
  addMonths,
  startOfWeek,
  parseMonth,
  monthKey,
  monthLabel,
  nthOccurrence,
};
