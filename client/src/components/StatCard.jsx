export default function StatCard({ label, value, hint, tone, children }) {
  return (
    <div className={`card stat-card${tone ? ` stat-${tone}` : ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {hint && <span className="stat-hint">{hint}</span>}
      {children}
    </div>
  );
}
