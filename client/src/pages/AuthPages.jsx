import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginForm from '../components/LoginForm';

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="brand auth-brand">
          <span aria-hidden="true">💸</span> Expense Tracker
        </div>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {children}
        <p className="auth-footer">{footer}</p>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { login, notice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/';

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to see your balance, budgets and goals."
      footer={
        <>
          New here? <Link to="/register">Create an account</Link>
        </>
      }
    >
      {notice && (
        <div className="alert alert-warning" role="status">
          <span aria-hidden="true">⏰</span> {notice}
        </div>
      )}
      <LoginForm
        onSubmit={async (credentials) => {
          await login(credentials);
          navigate(redirectTo, { replace: true });
        }}
      />
    </AuthShell>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '', currency: 'USD' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const found = {};
    if (!values.name.trim()) found.name = 'Enter your name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) found.email = 'Enter a valid email address';
    if (values.password.length < 8) found.password = 'Use at least 8 characters';
    if (values.confirm !== values.password) found.confirm = "Passwords don't match";
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const { confirm, ...details } = values;
      await register({ ...details, name: details.name.trim(), email: details.email.trim() });
      navigate('/', { replace: true });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setFormError(err.message);
      setSubmitting(false);
    }
  }

  const field = (name, label, props) => (
    <label className={`field${errors[name] ? ' field-invalid' : ''}`}>
      <span>{label}</span>
      <input value={values[name]} onChange={set(name)} aria-invalid={Boolean(errors[name])} {...props} />
      {errors[name] && <span className="field-error">{errors[name]}</span>}
    </label>
  );

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start tracking where your money goes."
      footer={
        <>
          Already have an account? <Link to="/login">Log in</Link>
        </>
      }
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        {field('name', 'Name', { autoComplete: 'name' })}
        {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
        {field('password', 'Password', { type: 'password', autoComplete: 'new-password' })}
        {field('confirm', 'Confirm password', { type: 'password', autoComplete: 'new-password' })}
        <label className="field">
          <span>Currency</span>
          <select value={values.currency} onChange={set('currency')}>
            {['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY', 'SGD'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        {formError && (
          <div className="alert alert-critical" role="alert">
            {formError}
          </div>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
