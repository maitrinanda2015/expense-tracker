import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

const AppDataContext = createContext(null);

const EMPTY_CATEGORIES = { income: [], expense: [] };

/**
 * Reference data shared by most screens (accounts, categories), plus a
 * `dataVersion` counter that pages depend on so they refetch after any
 * transaction is added, edited or deleted anywhere in the app.
 */
export function AppDataProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState(EMPTY_CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [editor, setEditor] = useState(null); // { transaction } | null

  const refreshAccounts = useCallback(async () => {
    const res = await api.get('/accounts');
    setAccounts(res.data);
    return res;
  }, []);

  const refreshCategories = useCallback(async () => {
    const res = await api.get('/categories');
    setCategories(res.data);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([refreshAccounts(), refreshCategories()]);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [refreshAccounts, refreshCategories]);

  useEffect(() => {
    if (isAuthenticated) loadAll();
    else {
      setAccounts([]);
      setCategories(EMPTY_CATEGORIES);
    }
  }, [isAuthenticated, user?._id, loadAll]);

  const notifyChange = useCallback(() => {
    setDataVersion((v) => v + 1);
    refreshAccounts().catch(() => {});
  }, [refreshAccounts]);

  const categoryIcon = useCallback(
    (type, name) => categories[type]?.find((c) => c.name === name)?.icon || (type === 'income' ? '💰' : '📦'),
    [categories]
  );

  const value = useMemo(
    () => ({
      accounts,
      categories,
      loading,
      error,
      reload: loadAll,
      refreshAccounts,
      refreshCategories,
      categoryIcon,
      currency: user?.currency || 'USD',
      dataVersion,
      notifyChange,
      editor,
      openTransactionForm: (transaction = null) => setEditor({ transaction }),
      closeTransactionForm: () => setEditor(null),
    }),
    [accounts, categories, loading, error, loadAll, refreshAccounts, refreshCategories, categoryIcon, user, dataVersion, notifyChange, editor]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside <AppDataProvider>');
  return ctx;
}
