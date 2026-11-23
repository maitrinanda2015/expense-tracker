import { Fragment } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import TransactionEditor from './TransactionEditor';
import { ErrorState } from './States';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/transactions', label: 'Transactions', icon: '📜' },
  { to: '/analytics', label: 'Analytics', icon: '📊' },
  { to: '/budgets', label: 'Budgets', icon: '🎯' },
  { to: '/accounts', label: 'Accounts', icon: '🏦' },
  { to: '/goals', label: 'Goals', icon: '🐖' },
  { to: '/categories', label: 'Categories', icon: '🏷️' },
];

// Shown in the phone bottom bar; the rest live in the sidebar / "More" menu.
const PRIMARY_MOBILE = ['/', '/transactions', '/analytics', '/budgets'];

export default function Layout() {
  const { user, logout } = useAuth();
  const { editor, openTransactionForm, error, reload } = useAppData();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span aria-hidden="true">💸</span> Expense Tracker
        </div>
        <nav aria-label="Main">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
              <span aria-hidden="true">{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip" title={user?.email}>
            <span className="avatar" aria-hidden="true">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </span>
            <span className="user-name">{user?.name}</span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => logout()}>
            Log out
          </button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <span className="brand">
            <span aria-hidden="true">💸</span> Expense Tracker
          </span>
          <details className="more-menu">
            <summary aria-label="More pages">☰</summary>
            <div className="more-menu-panel">
              {NAV.filter((n) => !PRIMARY_MOBILE.includes(n.to)).map((item) => (
                <NavLink key={item.to} to={item.to} className="nav-link">
                  <span aria-hidden="true">{item.icon}</span> {item.label}
                </NavLink>
              ))}
              <button type="button" className="nav-link" onClick={() => logout()}>
                <span aria-hidden="true">🚪</span> Log out
              </button>
            </div>
          </details>
        </header>

        <main className="content">
          {error ? <ErrorState error={error} onRetry={reload} title="Couldn't load your accounts" /> : <Outlet />}
        </main>
      </div>

      {/* Phones: "+" sits in the middle of the bottom bar so it never covers content. */}
      <nav className="bottom-nav" aria-label="Main (mobile)">
        {NAV.filter((n) => PRIMARY_MOBILE.includes(n.to)).map((item, i) => (
          <Fragment key={item.to}>
            {i === 2 && (
              <button type="button" className="bottom-add" onClick={() => openTransactionForm()} aria-label="Add transaction">
                <span aria-hidden="true">+</span>
              </button>
            )}
            <NavLink to={item.to} end={item.end} className="bottom-link">
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          </Fragment>
        ))}
      </nav>

      {/* Desktop: floating button. */}
      <button type="button" className="fab" onClick={() => openTransactionForm()} aria-label="Add transaction">
        +
      </button>

      {editor && <TransactionEditor transaction={editor.transaction} />}
    </div>
  );
}
