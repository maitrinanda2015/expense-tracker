export const accounts = [
  { _id: 'a1', name: 'Cash', type: 'cash' },
  { _id: 'a2', name: 'Bank Account', type: 'bank' },
];

export const categories = {
  expense: [
    { name: 'Food', icon: '🍔', type: 'expense' },
    { name: 'Rent', icon: '🏠', type: 'expense' },
    { name: 'Other', icon: '📦', type: 'expense' },
  ],
  income: [
    { name: 'Salary', icon: '💼', type: 'income' },
    { name: 'Other', icon: '💰', type: 'income' },
  ],
};

export const transactions = [
  {
    _id: 't1',
    type: 'expense',
    amount: 25,
    category: 'Food',
    note: 'Lunch',
    date: '2026-07-01T00:00:00.000Z',
    account: { _id: 'a1', name: 'Cash', type: 'cash' },
    recurring: { enabled: false },
  },
  {
    _id: 't2',
    type: 'income',
    amount: 2500,
    category: 'Salary',
    note: 'Monthly Salary',
    date: '2026-07-02T00:00:00.000Z',
    account: { _id: 'a2', name: 'Bank Account', type: 'bank' },
    recurring: { enabled: true, frequency: 'monthly' },
    attachment: { filename: 'payslip.pdf', mimetype: 'application/pdf', size: 1000 },
  },
];
