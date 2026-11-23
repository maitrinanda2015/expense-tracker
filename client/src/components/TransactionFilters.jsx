export const EMPTY_FILTERS = {
  search: '',
  type: '',
  category: '',
  account: '',
  from: '',
  to: '',
  minAmount: '',
  maxAmount: '',
};

/** Controlled filter bar: every change calls onChange(nextFilters). */
export default function TransactionFilters({ value, onChange, accounts, categories }) {
  const set = (field) => (e) => {
    const next = { ...value, [field]: e.target.value };
    // Switching type clears a category that doesn't exist for the new type.
    if (
      field === 'type' &&
      next.type &&
      next.category &&
      !(categories[next.type] || []).some((c) => c.name === next.category)
    ) {
      next.category = '';
    }
    onChange(next);
  };

  const categoryOptions = value.type
    ? categories[value.type] || []
    : [...new Map([...categories.expense, ...categories.income].map((c) => [c.name, c])).values()];

  const activeCount = Object.entries(value).filter(([k, v]) => k !== 'search' && v !== '').length;

  return (
    <div className="filters card">
      <div className="filters-top">
        <label className="field search-field">
          <span className="sr-only">Search</span>
          <input
            type="search"
            placeholder="Search note, category or amount"
            value={value.search}
            onChange={set('search')}
          />
        </label>
        <label className="field">
          <span className="sr-only">Type</span>
          <select value={value.type} onChange={set('type')} aria-label="Type">
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </label>
      </div>

      <details className="filters-more" open={activeCount > 1 || undefined}>
        <summary>More filters{activeCount ? ` (${activeCount} active)` : ''}</summary>
        <div className="filters-grid">
          <label className="field">
            <span>Category</span>
            <select value={value.category} onChange={set('category')}>
              <option value="">All categories</option>
              {categoryOptions.map((c) => (
                <option key={`${c.type}-${c.name}`} value={c.name}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Account</span>
            <select value={value.account} onChange={set('account')}>
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>From</span>
            <input type="date" value={value.from} onChange={set('from')} max={value.to || undefined} />
          </label>
          <label className="field">
            <span>To</span>
            <input type="date" value={value.to} onChange={set('to')} min={value.from || undefined} />
          </label>
          <label className="field">
            <span>Min amount</span>
            <input type="number" min="0" step="0.01" value={value.minAmount} onChange={set('minAmount')} />
          </label>
          <label className="field">
            <span>Max amount</span>
            <input type="number" min="0" step="0.01" value={value.maxAmount} onChange={set('maxAmount')} />
          </label>
        </div>
      </details>

      {(activeCount > 0 || value.search) && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(EMPTY_FILTERS)}>
          Clear filters
        </button>
      )}
    </div>
  );
}
