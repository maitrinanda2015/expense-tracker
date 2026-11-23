export function formatCurrency(value, currency = 'USD', options = {}) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, ...options }).format(value || 0);
  } catch {
    return `${currency} ${Number(value || 0).toFixed(2)}`;
  }
}

/** Compact axis labels: $1.2K, $3M. */
export const formatCompactCurrency = (value, currency = 'USD') =>
  formatCurrency(value, currency, { notation: 'compact', maximumFractionDigits: 1 });

// Transaction dates are stored as UTC midnight, so format them in UTC to
// show the same calendar day the user picked.
export function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, { timeZone: 'UTC', ...options });
}

export const formatMonth = (yyyyMm, style = 'short') =>
  new Date(`${yyyyMm}-01T00:00:00Z`).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    month: style,
    year: style === 'long' ? 'numeric' : '2-digit',
  });

/** Today's date in the user's timezone as YYYY-MM-DD (for <input type="date">). */
export function todayInput() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export const currentMonthInput = () => todayInput().slice(0, 7);

/** "2026-07-01T00:00:00.000Z" -> "2026-07-01" */
export const toDateInput = (value) => (value ? String(value).slice(0, 10) : '');

export const ACCOUNT_TYPE_LABELS = {
  cash: 'Cash',
  bank: 'Bank Account',
  credit_card: 'Credit Card',
  wallet: 'Wallet',
  savings: 'Savings',
};

export const ACCOUNT_TYPE_ICONS = {
  cash: '💵',
  bank: '🏦',
  credit_card: '💳',
  wallet: '👛',
  savings: '🐖',
};

export const FREQUENCY_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};
