import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, downloadFile } from '../api/client';
import { useApi, useDebouncedValue } from '../hooks/useApi';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import TransactionFilters, { EMPTY_FILTERS } from '../components/TransactionFilters';
import TransactionList from '../components/TransactionList';
import Pagination from '../components/Pagination';
import { ErrorState, Skeleton } from '../components/States';

const PAGE_SIZE = 15;

export default function TransactionsPage() {
  const { accounts, categories, currency, categoryIcon, dataVersion, notifyChange, openTransactionForm } = useAppData();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [exporting, setExporting] = useState(false);

  // Filters live in the URL so a filtered view survives refresh and can be shared.
  const filters = useMemo(
    () => Object.fromEntries(Object.keys(EMPTY_FILTERS).map((k) => [k, params.get(k) || ''])),
    [params]
  );
  const page = Number(params.get('page')) || 1;
  const search = useDebouncedValue(filters.search);
  const query = { ...filters, search, page, limit: PAGE_SIZE };

  const { data, error, loading, reload } = useApi(
    (signal) => api.get('/transactions', query, { signal }),
    [JSON.stringify(query), dataVersion]
  );

  const updateParams = (nextFilters, nextPage = 1) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(nextFilters)) if (v) next.set(k, v);
    if (nextPage > 1) next.set('page', String(nextPage));
    setParams(next, { replace: true });
  };

  async function handleDelete(tx) {
    const label = `${tx.category}${tx.note ? ` – ${tx.note}` : ''}`;
    if (!window.confirm(`Delete "${label}"? This can't be undone.`)) return;
    try {
      await api.del(`/transactions/${tx._id}`);
      toast.success('Transaction deleted');
      // Step back a page if we just removed the last row on it.
      if (data?.data.length === 1 && page > 1) updateParams(filters, page - 1);
      notifyChange();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      // Same filters as the list, without pagination.
      await downloadFile('/transactions/export', filters, 'transactions.csv');
    } catch (err) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  const openAttachment = (tx) =>
    downloadFile(`/transactions/${tx._id}/attachment`, undefined, tx.attachment.filename).catch((err) =>
      toast.error(err.message)
    );

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Transactions</h1>
          <p className="muted">Search, filter and manage every transaction.</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-secondary" onClick={handleExport} disabled={exporting || !data?.pagination.total}>
            {exporting ? 'Exporting…' : '⬇ Export CSV'}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => openTransactionForm()}>
            + Add
          </button>
        </div>
      </div>

      <TransactionFilters value={filters} onChange={(next) => updateParams(next)} accounts={accounts} categories={categories} />

      <section className="card" aria-busy={loading}>
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !data ? (
          <Skeleton rows={6} />
        ) : (
          <div className={loading ? 'is-refreshing' : undefined}>
            <TransactionList
              items={data.data}
              currency={currency}
              categoryIcon={categoryIcon}
              onEdit={(tx) => openTransactionForm(tx)}
              onDelete={handleDelete}
              onOpenAttachment={openAttachment}
              emptyTitle={hasFilters ? 'No matching transactions' : 'No transactions yet'}
              emptyMessage={hasFilters ? 'Try different filters or clear them.' : 'Add your first income or expense to get started.'}
              emptyAction={
                hasFilters ? (
                  <button type="button" className="btn btn-secondary" onClick={() => updateParams(EMPTY_FILTERS)}>
                    Clear filters
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary" onClick={() => openTransactionForm()}>
                    Add a transaction
                  </button>
                )
              }
            />
            <Pagination {...data.pagination} onChange={(p) => updateParams(filters, p)} />
          </div>
        )}
      </section>
    </>
  );
}
