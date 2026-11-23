import { useState } from 'react';
import { FREQUENCY_LABELS, todayInput, toDateInput } from '../utils/format';

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const FILE_TYPES = 'image/png,image/jpeg,image/webp,application/pdf';

function initialValues(transaction, accounts) {
  if (transaction) {
    return {
      type: transaction.type,
      amount: String(transaction.amount),
      category: transaction.category,
      account: transaction.account?._id || transaction.account || '',
      date: toDateInput(transaction.date),
      note: transaction.note || '',
      isRecurring: Boolean(transaction.recurring?.enabled),
      frequency: transaction.recurring?.frequency || 'monthly',
    };
  }
  return {
    type: 'expense',
    amount: '',
    category: '',
    account: accounts[0]?._id || '',
    date: todayInput(),
    note: '',
    isRecurring: false,
    frequency: 'monthly',
  };
}

function validateValues(values, file) {
  const errors = {};
  const amount = Number(values.amount);
  if (!values.amount || !Number.isFinite(amount) || amount <= 0) errors.amount = 'Enter an amount greater than 0';
  if (!values.category) errors.category = 'Choose a category';
  if (!values.account) errors.account = 'Choose an account';
  if (!values.date) errors.date = 'Choose a date';
  if (values.note.length > 200) errors.note = 'Keep the note under 200 characters';
  if (file && file.size > MAX_FILE_BYTES) errors.file = 'Attachment must be 2 MB or smaller';
  return errors;
}

/**
 * Add / edit form. Calls onSubmit(values, { file, removeAttachment });
 * if it throws an ApiError, its field errors are shown next to the inputs.
 */
export default function TransactionForm({ transaction = null, accounts, categories, onSubmit, onCancel }) {
  const [values, setValues] = useState(() => initialValues(transaction, accounts));
  const [file, setFile] = useState(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const options = categories[values.type] || [];
  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  const setType = (type) => {
    setValues((v) => ({
      ...v,
      type,
      // Keep the category only if it also exists for the new type.
      category: (categories[type] || []).some((c) => c.name === v.category) ? v.category : '',
    }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validateValues(values, file);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit(
        {
          type: values.type,
          amount: Number(values.amount),
          category: values.category,
          account: values.account,
          date: values.date,
          note: values.note.trim(),
          isRecurring: values.isRecurring,
          ...(values.isRecurring ? { frequency: values.frequency } : {}),
        },
        { file, removeAttachment }
      );
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setFormError(err.message);
      setSubmitting(false);
    }
  }

  const fieldClass = (name) => `field${errors[name] ? ' field-invalid' : ''}`;
  const errorFor = (name) =>
    errors[name] && (
      <span className="field-error" id={`${name}-error`}>
        {errors[name]}
      </span>
    );

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="segmented" role="group" aria-label="Transaction type">
        {['expense', 'income'].map((type) => (
          <button
            key={type}
            type="button"
            className={`segment segment-${type}${values.type === type ? ' active' : ''}`}
            aria-pressed={values.type === type}
            onClick={() => setType(type)}
          >
            {type === 'expense' ? 'Expense' : 'Income'}
          </button>
        ))}
      </div>

      <div className="form-grid">
        <label className={fieldClass('amount')}>
          <span>Amount</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            value={values.amount}
            onChange={set('amount')}
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? 'amount-error' : undefined}
            placeholder="0.00"
          />
          {errorFor('amount')}
        </label>

        <label className={fieldClass('date')}>
          <span>Date</span>
          <input type="date" value={values.date} onChange={set('date')} aria-invalid={Boolean(errors.date)} />
          {errorFor('date')}
        </label>

        <label className={fieldClass('category')}>
          <span>Category</span>
          <select value={values.category} onChange={set('category')} aria-invalid={Boolean(errors.category)}>
            <option value="">Select a category</option>
            {options.map((c) => (
              <option key={c.name} value={c.name}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
          {errorFor('category')}
        </label>

        <label className={fieldClass('account')}>
          <span>Account</span>
          <select value={values.account} onChange={set('account')} aria-invalid={Boolean(errors.account)}>
            <option value="">Select an account</option>
            {accounts.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name}
              </option>
            ))}
          </select>
          {errorFor('account')}
        </label>
      </div>

      <label className={fieldClass('note')}>
        <span>Note</span>
        <input type="text" value={values.note} onChange={set('note')} maxLength={200} placeholder="What was it for?" />
        {errorFor('note')}
      </label>

      <label className={fieldClass('file')}>
        <span>Attachment (optional)</span>
        {transaction?.attachment && !removeAttachment && !file && (
          <span className="field-hint">
            📎 {transaction.attachment.filename}{' '}
            <button type="button" className="link-btn" onClick={() => setRemoveAttachment(true)}>
              Remove
            </button>
          </span>
        )}
        <input
          type="file"
          accept={FILE_TYPES}
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setErrors((errs) => ({ ...errs, file: undefined }));
          }}
        />
        <span className="field-hint">Receipt image or PDF, up to 2 MB.</span>
        {errorFor('file')}
      </label>

      <div className="recurring-row">
        <label className="checkbox">
          <input type="checkbox" checked={values.isRecurring} onChange={set('isRecurring')} />
          <span>Repeat this transaction</span>
        </label>
        {values.isRecurring && (
          <label className="field field-inline">
            <span className="sr-only">Frequency</span>
            <select value={values.frequency} onChange={set('frequency')} aria-label="Frequency">
              {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {values.isRecurring && (
        <p className="field-hint">The next copy is created automatically on its due date.</p>
      )}
      {errorFor('frequency')}

      {formError && (
        <div className="alert alert-critical" role="alert">
          {formError}
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : transaction ? 'Save changes' : 'Add transaction'}
        </button>
      </div>
    </form>
  );
}
