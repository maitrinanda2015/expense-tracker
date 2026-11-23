import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import TransactionList from '../components/TransactionList';
import { BudgetAlert, ProgressBar } from '../components/Budget';
import { IncomeExpenseBars } from '../components/Charts';
import { ErrorState, Skeleton } from '../components/States';
import { formatCurrency, formatMonth } from '../utils/format';

export default function DashboardPage() {
  const { user } = useAuth();
  const { currency, categoryIcon, dataVersion, openTransactionForm } = useAppData();
  const { data, error, loading, reload } = useApi((signal) => api.get('/dashboard', undefined, { signal }), [dataVersion]);
  const d = data?.data;

  const header = (
    <div className="page-header">
      <div>
        <h1>Hi, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="muted">{d ? `Here's your overview for ${formatMonth(d.month, 'long')}.` : 'Your money at a glance.'}</p>
      </div>
      <button type="button" className="btn btn-primary" onClick={() => openTransactionForm()}>
        + Add transaction
      </button>
    </div>
  );

  if (error && !d) return <>{header}<ErrorState error={error} onRetry={reload} /></>;
  if (loading && !d) return <>{header}<div className="stats-grid"><Skeleton rows={4} /></div></>;

  const budget = d.budget;

  return (
    <>
      {header}

      {budget?.level && <BudgetAlert level={budget.level} message={budget.message} />}
      {d.categoryBudgetAlerts.map((b) => (
        <BudgetAlert key={b._id} level={b.level} message={b.message} />
      ))}

      <section className="stats-grid" aria-label="Summary">
        <StatCard
          label="Total balance"
          value={formatCurrency(d.balance, currency)}
          hint="Total income − total expenses"
          tone={d.balance < 0 ? 'negative' : 'primary'}
        />
        <StatCard label="Total income" value={formatCurrency(d.totalIncome, currency)} hint={`${formatCurrency(d.monthIncome, currency)} this month`} />
        <StatCard label="Total expenses" value={formatCurrency(d.totalExpenses, currency)} hint={`${formatCurrency(d.monthExpenses, currency)} this month`} />
        {budget ? (
          <StatCard
            label="Monthly budget"
            value={formatCurrency(budget.amount, currency)}
            hint={
              budget.remaining >= 0
                ? `${formatCurrency(budget.remaining, currency)} remaining · ${budget.percentUsed}% used`
                : `${formatCurrency(-budget.remaining, currency)} over · ${budget.percentUsed}% used`
            }
          >
            <ProgressBar percent={budget.percentUsed} level={budget.level} label="Monthly budget used" />
          </StatCard>
        ) : (
          <StatCard label="Monthly budget" value="Not set" hint="Set a budget to get spending warnings.">
            <Link to="/budgets" className="btn btn-secondary btn-sm">
              Set a budget
            </Link>
          </StatCard>
        )}
      </section>

      <div className="dashboard-grid">
        <section className="card">
          <div className="card-header">
            <h2>Income vs expenses</h2>
            <span className="muted small">Last 6 months</span>
          </div>
          {d.chart.some((m) => m.income || m.expense) ? (
            <IncomeExpenseBars data={d.chart} xKey="month" xFormatter={(m) => formatMonth(m)} currency={currency} />
          ) : (
            <p className="muted chart-empty">Your chart appears once you add transactions.</p>
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Recent transactions</h2>
            <Link to="/transactions" className="small">
              View all →
            </Link>
          </div>
          <TransactionList
            items={d.recentTransactions}
            currency={currency}
            categoryIcon={categoryIcon}
            onEdit={(tx) => openTransactionForm(tx)}
            emptyAction={
              <button type="button" className="btn btn-primary" onClick={() => openTransactionForm()}>
                Add a transaction
              </button>
            }
          />
        </section>
      </div>
    </>
  );
}
