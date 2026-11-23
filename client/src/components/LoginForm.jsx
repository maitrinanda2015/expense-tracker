import { useState } from 'react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Login form; onSubmit({ email, password }) may throw to show an error. */
export default function LoginForm({ onSubmit }) {
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const email = values.email.trim();
    const found = {};
    if (!EMAIL_RE.test(email)) found.email = 'Enter a valid email address';
    if (!values.password) found.password = 'Enter your password';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit({ email, password: values.password });
    } catch (err) {
      setFormError(err.message || 'Login failed');
      setSubmitting(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <label className={`field${errors.email ? ' field-invalid' : ''}`}>
        <span>Email</span>
        <input
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={set('email')}
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email && <span className="field-error">{errors.email}</span>}
      </label>
      <label className={`field${errors.password ? ' field-invalid' : ''}`}>
        <span>Password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={set('password')}
          aria-invalid={Boolean(errors.password)}
        />
        {errors.password && <span className="field-error">{errors.password}</span>}
      </label>
      {formError && (
        <div className="alert alert-critical" role="alert">
          {formError}
        </div>
      )}
      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? 'Logging in…' : 'Log in'}
      </button>
    </form>
  );
}
