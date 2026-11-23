import { useState } from 'react';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { ProgressBar } from '../components/Budget';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { formatCurrency, formatDate, toDateInput } from '../utils/format';

function GoalForm({ goal, onSave, onCancel }) {
  const [values, setValues] = useState({
    name: goal?.name || '',
    targetAmount: goal ? String(goal.targetAmount) : '',
    currentAmount: goal ? String(goal.currentAmount) : '0',
    targetDate: toDateInput(goal?.targetDate),
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (f) => (e) => setValues((v) => ({ ...v, [f]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const found = {};
    if (!values.name.trim()) found.name = 'Give the goal a name';
    if (!(Number(values.targetAmount) > 0)) found.targetAmount = 'Enter a target greater than 0';
    if (Number(values.currentAmount) < 0) found.currentAmount = 'Cannot be negative';
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      await onSave({
        name: values.name.trim(),
        targetAmount: Number(values.targetAmount),
        currentAmount: Number(values.currentAmount) || 0,
        targetDate: values.targetDate || null,
      });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setFormError(err.message);
      setSaving(false);
    }
  }

  const field = (name, label, props) => (
    <label className={`field${errors[name] ? ' field-invalid' : ''}`}>
      <span>{label}</span>
      <input value={values[name]} onChange={set(name)} {...props} />
      {errors[name] && <span className="field-error">{errors[name]}</span>}
    </label>
  );

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {field('name', 'Goal name', { maxLength: 60, placeholder: 'e.g. New Laptop' })}
      <div className="form-grid">
        {field('targetAmount', 'Target amount', { type: 'number', min: '0.01', step: '0.01', inputMode: 'decimal' })}
        {field('currentAmount', 'Saved so far', { type: 'number', min: '0', step: '0.01', inputMode: 'decimal' })}
      </div>
      {field('targetDate', 'Target date (optional)', { type: 'date' })}
      {formError && <div className="alert alert-critical" role="alert">{formError}</div>}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save goal'}</button>
      </div>
    </form>
  );
}

function GoalCard({ goal, currency, onEdit, onDelete, onContribute }) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const done = goal.currentAmount >= goal.targetAmount;

  async function contribute(sign) {
    const value = Number(amount);
    if (!(value > 0)) return;
    setBusy(true);
    try {
      await onContribute(goal, sign * value);
      setAmount('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card goal-card">
      <div className="card-header">
        <h3>{done ? '🏆 ' : ''}{goal.name}</h3>
        <span className="goal-percent">{goal.progress}%</span>
      </div>
      <ProgressBar percent={goal.progress} label={`${goal.name} progress`} />
      <dl className="goal-stats">
        <div><dt>Target</dt><dd>{formatCurrency(goal.targetAmount, currency)}</dd></div>
        <div><dt>Saved</dt><dd>{formatCurrency(goal.currentAmount, currency)}</dd></div>
        <div><dt>To go</dt><dd>{formatCurrency(Math.max(0, goal.targetAmount - goal.currentAmount), currency)}</dd></div>
      </dl>
      {goal.targetDate && <p className="muted small">Target date: {formatDate(goal.targetDate)}</p>}
      <div className="inline-form">
        <label className="field">
          <span className="sr-only">Amount</span>
          <input type="number" min="0.01" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label={`Amount for ${goal.name}`} />
        </label>
        <button type="button" className="btn btn-primary btn-sm" disabled={busy || !(Number(amount) > 0)} onClick={() => contribute(1)}>Add</button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy || !(Number(amount) > 0)} onClick={() => contribute(-1)}>Withdraw</button>
      </div>
      <div className="card-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onEdit(goal)}>Edit</button>
        <button type="button" className="btn btn-ghost btn-sm danger" onClick={() => onDelete(goal)}>Delete</button>
      </div>
    </article>
  );
}

export default function GoalsPage() {
  const { currency } = useAppData();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const { data, error, loading, reload } = useApi((signal) => api.get('/goals', undefined, { signal }), []);
  const goals = data?.data;

  async function save(values) {
    if (editing === 'new') await api.post('/goals', values);
    else await api.patch(`/goals/${editing._id}`, values);
    toast.success('Goal saved');
    setEditing(null);
    reload();
  }

  async function contribute(goal, amount) {
    try {
      await api.post(`/goals/${goal._id}/contribute`, { amount });
      toast.success(amount > 0 ? 'Added to goal' : 'Withdrawn from goal');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function remove(goal) {
    if (!window.confirm(`Delete the goal "${goal.name}"?`)) return;
    try {
      await api.del(`/goals/${goal._id}`);
      toast.success('Goal deleted');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Savings goals</h1>
          <p className="muted">Set a target and track your progress.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>+ New goal</button>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !goals ? (
        <Skeleton rows={3} />
      ) : !goals.length ? (
        <EmptyState
          icon="🐖"
          title="No savings goals yet"
          message="Saving for a laptop, a trip or an emergency fund? Add a goal to track it."
          action={<button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>Create a goal</button>}
        />
      ) : (
        <div className="card-grid">
          {goals.map((g) => (
            <GoalCard key={g._id} goal={g} currency={currency} onEdit={setEditing} onDelete={remove} onContribute={contribute} />
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'New goal' : 'Edit goal'} onClose={() => setEditing(null)} size="sm">
          <GoalForm goal={editing === 'new' ? null : editing} onSave={save} onCancel={() => setEditing(null)} />
        </Modal>
      )}
    </>
  );
}
