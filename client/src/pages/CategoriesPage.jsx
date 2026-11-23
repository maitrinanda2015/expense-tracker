import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';

const ICONS = ['🏷️', '🐶', '🚗', '☕', '🎮', '👶', '💇', '🎓', '🏋️', '🧾', '🎨', '🌱', '💡', '🛠️', '🎉', '💸'];

export default function CategoriesPage() {
  const { categories, refreshCategories } = useAppData();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', type: 'expense', icon: ICONS[0] });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError('Enter a name');
    setSaving(true);
    setError(null);
    try {
      await api.post('/categories', { ...form, name: form.name.trim() });
      toast.success(`Category "${form.name.trim()}" added`);
      setForm((f) => ({ ...f, name: '' }));
      await refreshCategories();
    } catch (err) {
      setError(err.code === 'DUPLICATE' ? 'That category already exists' : err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(category) {
    if (!window.confirm(`Delete the category "${category.name}"?`)) return;
    try {
      await api.del(`/categories/${category._id}`);
      toast.success('Category deleted');
      await refreshCategories();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Categories</h1>
          <p className="muted">Built-in categories plus your own.</p>
        </div>
      </div>

      <section className="card">
        <h2>Add a custom category</h2>
        <form className="inline-form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span>Name</span>
            <input value={form.name} maxLength={40} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Pets" />
          </label>
          <label className="field">
            <span>Type</span>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>
          <fieldset className="field icon-picker">
            <legend>Icon</legend>
            <div className="icon-options">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className={`icon-option${form.icon === icon ? ' active' : ''}`}
                  aria-pressed={form.icon === icon}
                  onClick={() => setForm({ ...form, icon })}
                >
                  {icon}
                </button>
              ))}
            </div>
          </fieldset>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Adding…' : 'Add category'}
          </button>
          {error && <span className="field-error inline-error">{error}</span>}
        </form>
      </section>

      <div className="dashboard-grid">
        {['expense', 'income'].map((type) => (
          <section key={type} className="card">
            <h2>{type === 'expense' ? 'Expense' : 'Income'} categories</h2>
            <ul className="category-list">
              {categories[type].map((c) => (
                <li key={`${c.name}-${c.custom}`}>
                  <span className="tx-icon" aria-hidden="true">{c.icon}</span>
                  <Link to={`/transactions?type=${type}&category=${encodeURIComponent(c.name)}`}>{c.name}</Link>
                  {c.custom ? (
                    <>
                      <span className="badge">Custom</span>
                      <button type="button" className="icon-btn" onClick={() => remove(c)} aria-label={`Delete ${c.name}`}>🗑️</button>
                    </>
                  ) : (
                    <span className="muted small">Built-in</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
