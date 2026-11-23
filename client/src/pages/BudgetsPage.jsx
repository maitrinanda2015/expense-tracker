import { useState } from 'react';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import { BudgetAlert, levelInfo, ProgressBar } from '../components/Budget';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { currentMonthInput, formatCurrency, formatMonth } from '../utils/format';

function BudgetRow({ budget, currency, onDelete }) {
  const { icon, label } = levelInfo(budget.level);
  return (
    <div className="budget-row">
      <div className="budget-row-head">
        <strong>{budget.category || 'Overall'}</strong>
        <span className="muted small">
          {formatCurrency(budget.spent, currency)} of {formatCurrency(budget.amount, currency)}
        </span>
      </div>
      <ProgressBar percent={budget.percentUsed} level={budget.level} label={`${budget.category || 'Overall'} budget used`} />
      <div className="budget-row-foot small">
        <span>
          <span aria-hidden="true">{icon}</span> {label} · {budget.percentUsed}% used
        </span>
        <span className={budget.remaining < 0 ? 'amount-expense' : 'muted'}>
          {budget.remaining < 0
            ? `${formatCurrency(-budget.remaining, currency)} over`
            : `${formatCurrency(budget.remaining, currency)} left`}
        </span>
        {onDelete && (
          <button type="button" className="link-btn danger" onClick={onDelete}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function AmountForm({ initial, onSave, label, categoryOptions }) {
  const [amount, setAmount] = useState(initial ? String(initial) : '');
  const [category, setCategory] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!(Number(amount) > 0)) return setError('Enter an amount greater than 0');
    if (categoryOptions && !category) return setError('Choose a category');
    setSaving(true);
    setError(null);
    try {
      await onSave({ amount: Number(amount), ...(categoryOptions ? { category } : {}) });
      if (categoryOptions) {
        setAmount('');
        setCategory('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit} noValidate>
      {categoryOptions && (
        <label className="field">
          <span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Select…</option>
            {categoryOptions.map((c) => (
              <option key={c.name} value={c.name}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="field">
        <span>Monthly amount</span>
        <input type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? 'Saving…' : label}
      </button>
      {error && <span className="field-error inline-error">{error}</span>}
    </form>
  );
}

export default function BudgetsPage() {
  const { categories, currency, dataVersion } = useAppData();
  const toast = useToast();
  const [month, setMonth] = useState(currentMonthInput());
  const { data, error, loading, reload } = useApi((signal) => api.get('/budgets', { month }, { signal }), [month, dataVersion]);
  const b = data?.data;

  async function save(body) {
    await api.put('/budgets', body);
    toast.success('Budget saved');
    reload();
  }

  async function remove(budget) {
    if (!window.confirm(`Remove the ${budget.category || 'overall'} budget?`)) return;
    try {
      await api.del(`/budgets/${budget._id}`);
      toast.success('Budget removed');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const usedCategories = new Set(b?.categories.map((c) => c.category));
  const available = categories.expense.filter((c) => !usedCategories.has(c.name));

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Budgets</h1>
          <p className="muted">Budgets repeat every month. Warnings appear at 50%, 75%, 90% and when exceeded.</p>
        </div>
        <label className="field field-inline">
          <span className="sr-only">Month</span>
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Month" />
        </label>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !b ? (
        <Skeleton rows={4} />
      ) : (
        <div className={loading ? 'is-refreshing' : undefined}>
          <section className="card">
            <div className="card-header">
              <h2>Overall budget · {formatMonth(b.month, 'long')}</h2>
            </div>
            {b.overall ? (
              <>
                <BudgetAlert level={b.overall.level} message={b.overall.message} />
                <BudgetRow budget={b.overall} currency={currency} onDelete={() => remove(b.overall)} />
              </>
            ) : (
              <p className="muted">No overall budget yet. Spent this month: {formatCurrency(b.totalSpent, currency)}.</p>
            )}
            <AmountForm
              key={b.overall?._id || 'new'}
              initial={b.overall?.amount}
              label={b.overall ? 'Update' : 'Set budget'}
              onSave={(body) => save({ ...body, category: null })}
            />
          </section>

          <section className="card">
            <div className="card-header">
              <h2>Category budgets</h2>
            </div>
            {b.categories.length ? (
              <div className="budget-list">
                {b.categories.map((c) => (
                  <BudgetRow key={c._id} budget={c} currency={currency} onDelete={() => remove(c)} />
                ))}
              </div>
            ) : (
              <EmptyState icon="🎯" title="No category budgets" message="Limit a single category, e.g. Food — 400 per month." />
            )}
            {available.length > 0 && (
              <AmountForm label="Add category budget" categoryOptions={available} onSave={save} />
            )}
          </section>
        </div>
      )}
    </>
  );
}
