export default function Pagination({ page, pages, total, onChange }) {
  if (!total) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Previous
      </button>
      <span className="pagination-info">
        Page {page} of {pages} · {total} transaction{total === 1 ? '' : 's'}
      </span>
      <button type="button" className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next →
      </button>
    </nav>
  );
}
