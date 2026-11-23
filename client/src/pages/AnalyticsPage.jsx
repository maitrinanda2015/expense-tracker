import { useState } from 'react';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useAppData } from '../context/AppDataContext';
import StatCard from '../components/StatCard';
import { CategoryDonut, IncomeExpenseBars } from '../components/Charts';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { formatCurrency, formatDate, formatMonth } from '../utils/format';

const PERIODS = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: '3months', label: '3 Months' },
  { value: 'year', label: 'Year' },
];

const bucketLabel = (bucket) => (value) => {
  if (bucket === 'month') return formatMonth(value.slice(0, 7));
  return formatDate(value, { day: 'numeric', month: 'short' });
};

export default function AnalyticsPage() {
  const { currency, dataVersion } = useAppData();
  const [period, setPeriod] = useState('month');
  const [breakdown, setBreakdown] = useState('expense');

  const summary = useApi((signal) => api.get('/analytics/summary', { period }, { signal }), [period, dataVersion]);
  const monthly = useApi((signal) => api.get('/analytics/monthly', { months: 12 }, { signal }), [dataVersion]);
  const s = summary.data?.data;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p className="muted">Computed live from your transactions.</p>
        </div>
        <div className="segmented" role="tablist" aria-label="Time period">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              role="tab"
              aria-selected={period === p.value}
              className={`segment${period === p.value ? ' active' : ''}`}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {summary.error ? (
        <ErrorState error={summary.error} onRetry={summary.reload} />
      ) : !s ? (
        <Skeleton rows={4} />
      ) : (
        <div className={summary.loading ? 'is-refreshing' : undefined}>
          <section className="stats-grid" aria-label="Period totals">
            <StatCard label="Income" value={formatCurrency(s.income, currency)} />
            <StatCard label="Expenses" value={formatCurrency(s.expense, currency)} />
            <StatCard label="Net savings" value={formatCurrency(s.net, currency)} tone={s.net < 0 ? 'negative' : 'primary'} />
            <StatCard label="Savings rate" value={`${s.savingsRate}%`} hint="Net savings ÷ income" />
          </section>

          <div className="dashboard-grid">
            <section className="card">
              <div className="card-header">
                <h2>Spending trend</h2>
                <span className="muted small">
                  {formatDate(s.from)} – {formatDate(s.to)} · by {s.bucket}
                </span>
              </div>
              {s.income || s.expense ? (
                <IncomeExpenseBars data={s.trend} xKey="date" xFormatter={bucketLabel(s.bucket)} currency={currency} />
              ) : (
                <EmptyState icon="📉" title="No transactions in this period" message="Pick a longer period or add transactions." />
              )}
            </section>

            <section className="card">
              <div className="card-header">
                <h2>By category</h2>
                <div className="segmented segmented-sm" role="tablist" aria-label="Breakdown type">
                  {['expense', 'income'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="tab"
                      aria-selected={breakdown === t}
                      className={`segment${breakdown === t ? ' active' : ''}`}
                      onClick={() => setBreakdown(t)}
                    >
                      {t === 'expense' ? 'Expenses' : 'Income'}
                    </button>
                  ))}
                </div>
              </div>
              {s.categories[breakdown].length ? (
                <CategoryDonut rows={s.categories[breakdown]} currency={currency} />
              ) : (
                <EmptyState icon="🍩" title={`No ${breakdown === 'expense' ? 'expenses' : 'income'} in this period`} />
              )}
            </section>
          </div>
        </div>
      )}

      <section className="card">
        <div className="card-header">
          <h2>Monthly summary</h2>
          <span className="muted small">Last 12 months</span>
        </div>
        {monthly.error ? (
          <ErrorState error={monthly.error} onRetry={monthly.reload} />
        ) : !monthly.data ? (
          <Skeleton rows={4} />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col" className="num">Income</th>
                  <th scope="col" className="num">Expenses</th>
                  <th scope="col" className="num">Net savings</th>
                </tr>
              </thead>
              <tbody>
                {[...monthly.data.data].reverse().map((m) => (
                  <tr key={m.month}>
                    <th scope="row">{formatMonth(m.month, 'long')}</th>
                    <td className="num">{formatCurrency(m.income, currency)}</td>
                    <td className="num">{formatCurrency(m.expense, currency)}</td>
                    <td className={`num ${m.net < 0 ? 'amount-expense' : 'amount-income'}`}>
                      {m.net < 0 ? '−' : '+'}
                      {formatCurrency(Math.abs(m.net), currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
