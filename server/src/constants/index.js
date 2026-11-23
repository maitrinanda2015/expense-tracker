const TRANSACTION_TYPES = ['income', 'expense'];

const ACCOUNT_TYPES = ['cash', 'bank', 'credit_card', 'wallet', 'savings'];

const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];

const DEFAULT_CATEGORIES = {
  expense: [
    { name: 'Food', icon: '🍔' },
    { name: 'Travel', icon: '✈️' },
    { name: 'Shopping', icon: '🛍️' },
    { name: 'Bills', icon: '🧾' },
    { name: 'Rent', icon: '🏠' },
    { name: 'Entertainment', icon: '🎬' },
    { name: 'Health', icon: '💊' },
    { name: 'Education', icon: '📚' },
    { name: 'Subscription', icon: '🔁' },
    { name: 'Other', icon: '📦' },
  ],
  income: [
    { name: 'Salary', icon: '💼' },
    { name: 'Freelance', icon: '💻' },
    { name: 'Business', icon: '🏢' },
    { name: 'Investment', icon: '📈' },
    { name: 'Gift', icon: '🎁' },
    { name: 'Other', icon: '💰' },
  ],
};

// Warning levels for budgets, checked from highest to lowest.
const BUDGET_THRESHOLDS = [90, 75, 50];

const ATTACHMENT_MAX_BYTES = 2 * 1024 * 1024;
const ATTACHMENT_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

const EXPORT_MAX_ROWS = 10000;

module.exports = {
  TRANSACTION_TYPES,
  ACCOUNT_TYPES,
  FREQUENCIES,
  DEFAULT_CATEGORIES,
  BUDGET_THRESHOLDS,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MIME_TYPES,
  EXPORT_MAX_ROWS,
};
