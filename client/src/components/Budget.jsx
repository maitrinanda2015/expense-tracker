// Budget progress and warnings. Status color always comes with an icon and
// a text label so it never carries meaning by color alone.

const LEVELS = {
  50: { tone: 'good', icon: 'ℹ️', label: 'Halfway' },
  75: { tone: 'warning', icon: '⚠️', label: 'Heads up' },
  90: { tone: 'serious', icon: '⚠️', label: 'Almost at limit' },
  exceeded: { tone: 'critical', icon: '⛔', label: 'Over budget' },
};

export const levelInfo = (level) => LEVELS[level] || { tone: 'good', icon: '✅', label: 'On track' };

export function ProgressBar({ percent, level, label }) {
  const { tone } = levelInfo(level);
  const clamped = Math.max(0, Math.min(100, percent || 0));
  return (
    <div
      className={`progress progress-${tone}`}
      role="progressbar"
      aria-valuenow={Math.round(percent || 0)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="progress-fill" style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function BudgetAlert({ level, message }) {
  if (!level || !message) return null;
  const { tone, icon, label } = levelInfo(level);
  return (
    <div className={`alert alert-${tone}`} role={level === 'exceeded' ? 'alert' : 'status'}>
      <span aria-hidden="true">{icon}</span>
      <span>
        <strong>{label}:</strong> {message}
      </span>
    </div>
  );
}
