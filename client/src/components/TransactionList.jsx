import { formatCurrency, formatDate, FREQUENCY_LABELS } from '../utils/format';
import { EmptyState } from './States';

/**
 * Presentational list. `categoryIcon(type, name)` resolves icons; pass
 * onEdit / onDelete / onOpenAttachment to show row actions.
 */
export default function TransactionList({
  items,
  currency = 'USD',
  categoryIcon = () => '📦',
  onEdit,
  onDelete,
  onOpenAttachment,
  emptyTitle = 'No transactions yet',
  emptyMessage = 'Add your first income or expense to get started.',
  emptyAction,
}) {
  if (!items.length) {
    return <EmptyState icon="🧾" title={emptyTitle} message={emptyMessage} action={emptyAction} />;
  }

  return (
    <ul className="tx-list">
      {items.map((tx) => {
        const isIncome = tx.type === 'income';
        return (
          <li key={tx._id} className="tx-row">
            <span className="tx-icon" aria-hidden="true">
              {categoryIcon(tx.type, tx.category)}
            </span>
            <div className="tx-main">
              <div className="tx-title">
                <span className="tx-category">{tx.category}</span>
                {tx.recurring?.enabled && (
                  <span className="badge" title={`Repeats ${FREQUENCY_LABELS[tx.recurring.frequency]}`}>
                    🔁 {FREQUENCY_LABELS[tx.recurring.frequency]}
                  </span>
                )}
                {tx.generatedFrom && <span className="badge">Auto</span>}
              </div>
              {tx.note && <div className="tx-note">{tx.note}</div>}
              <div className="tx-meta">
                <span>{formatDate(tx.date)}</span>
                <span aria-hidden="true">·</span>
                <span>{tx.account?.name || 'Deleted account'}</span>
                {tx.attachment &&
                  (onOpenAttachment ? (
                    <button type="button" className="link-btn" onClick={() => onOpenAttachment(tx)}>
                      📎 {tx.attachment.filename}
                    </button>
                  ) : (
                    <span>📎</span>
                  ))}
              </div>
            </div>
            <div className="tx-side">
              <span className={`tx-amount ${isIncome ? 'amount-income' : 'amount-expense'}`}>
                <span className="sr-only">{isIncome ? 'Income' : 'Expense'} </span>
                {isIncome ? '+' : '−'}
                {formatCurrency(tx.amount, currency)}
              </span>
              <span className={`type-pill type-${tx.type}`}>{isIncome ? 'Income' : 'Expense'}</span>
              {(onEdit || onDelete) && (
                <div className="tx-actions">
                  {onEdit && (
                    <button type="button" className="icon-btn" onClick={() => onEdit(tx)} aria-label={`Edit ${tx.category} transaction`}>
                      ✏️
                    </button>
                  )}
                  {onDelete && (
                    <button type="button" className="icon-btn" onClick={() => onDelete(tx)} aria-label={`Delete ${tx.category} transaction`}>
                      🗑️
                    </button>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
