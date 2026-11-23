import { lazy, Suspense } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppDataProvider } from './context/AppDataContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards';
import Layout from './components/Layout';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { EmptyState, Spinner } from './components/States';

// Pages are split into their own chunks; the charting library only loads
// for the pages that draw charts.
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const AccountsPage = lazy(() => import('./pages/AccountsPage'));
const BudgetsPage = lazy(() => import('./pages/BudgetsPage'));
const GoalsPage = lazy(() => import('./pages/GoalsPage'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));

const page = (element) => <Suspense fallback={<Spinner />}>{element}</Suspense>;

function NotFound() {
  return (
    <div className="page-center">
      <EmptyState icon="🧭" title="Page not found" message="That page doesn't exist." action={<Link className="btn btn-primary" to="/">Go to dashboard</Link>} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppDataProvider>
            <Routes>
              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route index element={page(<DashboardPage />)} />
                  <Route path="transactions" element={page(<TransactionsPage />)} />
                  <Route path="analytics" element={page(<AnalyticsPage />)} />
                  <Route path="accounts" element={page(<AccountsPage />)} />
                  <Route path="budgets" element={page(<BudgetsPage />)} />
                  <Route path="goals" element={page(<GoalsPage />)} />
                  <Route path="categories" element={page(<CategoriesPage />)} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppDataProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
