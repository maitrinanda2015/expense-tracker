import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { EmptyState, Spinner } from '../components/States';
import { ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_LABELS, formatCurrency } from '../utils/format';

function AccountForm({ account, onSave, onCancel }) {
  const [name, setName] = useState(account?.name || '');
  const [type, setType] = useState(account?.type || 'bank');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return setError('Enter a name');
    setSaving(true);
    try {
      await onSave({ name: name.trim(), type });
    } catch (err) {
      setError(err.code === 'DUPLICATE' ? 'You already have an account with this name' : err.message);
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <label className={`field${error ? ' field-invalid' : ''}`}>
        <span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="e.g. HDFC Savings" />
        {error && <span className="field-error">{error}</span>}
      </label>
      <label className="field">
        <span>Type</span>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {ACCOUNT_TYPE_ICONS[value]} {label}
            </option>
          ))}
        </select>
      </label>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

export default function AccountsPage() {
  const { accounts, currency, loading, refreshAccounts, notifyChange } = useAppData();
  const toast = useToast();
  const [editing, setEditing] = useState(null); // null | 'new' | account
  const total = accounts.reduce((acc, a) => acc + (a.balance || 0), 0);

  async function save(values) {
    if (editing === 'new') await api.post('/accounts', values);
    else await api.patch(`/accounts/${editing._id}`, values);
    toast.success(editing === 'new' ? 'Account added' : 'Account updated');
    setEditing(null);
    notifyChange();
  }

  async function remove(account) {
    if (!window.confirm(`Delete the account "${account.name}"?`)) return;
    try {
      await api.del(`/accounts/${account._id}`);
      toast.success('Account deleted');
      await refreshAccounts();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Accounts & wallets</h1>
          <p className="muted">Each transaction belongs to one account.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
          + New account
        </button>
      </div>

      <section className="card total-card">
        <span className="stat-label">Combined balance</span>
        <span className={`stat-value${total < 0 ? ' amount-expense' : ''}`}>{formatCurrency(total, currency)}</span>
        <span className="stat-hint">Across {accounts.length} account{accounts.length === 1 ? '' : 's'}</span>
      </section>

      {loading && !accounts.length ? (
        <Spinner />
      ) : !accounts.length ? (
        <EmptyState icon="🏦" title="No accounts" message="Add an account to start recording transactions." />
      ) : (
        <div className="card-grid">
          {accounts.map((a) => (
            <article key={a._id} className="card account-card">
              <div className="account-head">
                <span className="account-icon" aria-hidden="true">
                  {ACCOUNT_TYPE_ICONS[a.type]}
                </span>
                <div>
                  <h3>{a.name}</h3>
                  <span className="muted small">{ACCOUNT_TYPE_LABELS[a.type]}</span>
                </div>
              </div>
              <div className={`account-balance${a.balance < 0 ? ' amount-expense' : ''}`}>{formatCurrency(a.balance, currency)}</div>
              <div className="muted small">
                In {formatCurrency(a.income, currency)} · Out {formatCurrency(a.expense, currency)}
              </div>
              <div className="card-actions">
                <Link className="btn btn-ghost btn-sm" to={`/transactions?account=${a._id}`}>
                  {a.transactionCount} transaction{a.transactionCount === 1 ? '' : 's'}
                </Link>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(a)}>
                  Edit
                </button>
                <button type="button" className="btn btn-ghost btn-sm danger" onClick={() => remove(a)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'New account' : 'Edit account'} onClose={() => setEditing(null)} size="sm">
          <AccountForm account={editing === 'new' ? null : editing} onSave={save} onCancel={() => setEditing(null)} />
        </Modal>
      )}
    </>
  );
}
