import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCompactCurrency, formatCurrency } from '../utils/format';

const TOKENS = [
  'series-1', 'series-2', 'series-3', 'series-4', 'series-5', 'series-6', 'series-7', 'series-8',
  'surface', 'text-secondary', 'grid',
];

function readTokens() {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(TOKENS.map((t) => [t, style.getPropertyValue(`--${t}`).trim()]));
}

/** Chart colors from CSS custom properties, re-read when the OS theme flips. */
function useChartColors() {
  const [colors, setColors] = useState(readTokens);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const update = () => setColors(readTokens());
    media?.addEventListener?.('change', update);
    return () => media?.removeEventListener?.('change', update);
  }, []);
  return colors;
}

const SERIES = ['series-1', 'series-2', 'series-3', 'series-4', 'series-5', 'series-6', 'series-7', 'series-8'];
const MAX_SLICES = 8;

function ChartTooltip({ active, payload, label, currency, labelFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label !== undefined && <div className="chart-tooltip-label">{labelFormatter ? labelFormatter(label) : label}</div>}
      {payload.map((p) => (
        <div key={p.dataKey || p.name} className="chart-tooltip-row">
          <span className="swatch" style={{ background: p.color || p.payload?.fill }} aria-hidden="true" />
          <span>{p.name}</span>
          <strong>{formatCurrency(p.value, currency)}</strong>
        </div>
      ))}
    </div>
  );
}

/** Grouped income vs expense bars over time buckets. Income = slot 1, expense = slot 2. */
export function IncomeExpenseBars({ data, xKey, xFormatter, currency, height = 260 }) {
  const c = useChartColors();
  const axis = { stroke: c['text-secondary'], fontSize: 12, tickLine: false, axisLine: false };
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={2} barCategoryGap="20%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={c.grid} />
          <XAxis dataKey={xKey} tickFormatter={xFormatter} {...axis} minTickGap={12} />
          <YAxis tickFormatter={(v) => formatCompactCurrency(v, currency)} {...axis} width={56} />
          <Tooltip
            cursor={{ fill: c.grid, opacity: 0.5 }}
            content={<ChartTooltip currency={currency} labelFormatter={xFormatter} />}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13, color: c['text-secondary'] }} />
          <Bar dataKey="income" name="Income" fill={c['series-1']} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="expense" name="Expenses" fill={c['series-2']} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Folds categories past the 8th into "Other" so no hue is ever cycled. */
export function foldCategories(rows) {
  if (rows.length <= MAX_SLICES) return rows;
  const head = rows.slice(0, MAX_SLICES - 1);
  const rest = rows.slice(MAX_SLICES - 1);
  const total = rest.reduce((acc, r) => acc + r.total, 0);
  const percent = rest.reduce((acc, r) => acc + r.percent, 0);
  return [...head, { category: 'Other (combined)', total, percent: Math.round(percent * 10) / 10, count: rest.length }];
}

/** Donut + legend table of category totals. The legend doubles as the table view. */
export function CategoryDonut({ rows, currency }) {
  const c = useChartColors();
  const data = foldCategories(rows);
  const total = data.reduce((acc, r) => acc + r.total, 0);

  return (
    <div className="donut-layout">
      <div className="chart donut" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="category"
              innerRadius="62%"
              outerRadius="95%"
              paddingAngle={0}
              stroke={c.surface}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((row, i) => (
                <Cell key={row.category} fill={c[SERIES[i]]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip currency={currency} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center" aria-hidden="true">
          <span className="donut-total">{formatCompactCurrency(total, currency)}</span>
          <span className="donut-caption">total</span>
        </div>
      </div>
      <table className="legend-table">
        <caption className="sr-only">Spending by category</caption>
        <thead className="sr-only">
          <tr>
            <th>Category</th>
            <th>Amount</th>
            <th>Share</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.category}>
              <td>
                <span className="swatch" style={{ background: c[SERIES[i]] }} aria-hidden="true" />
                {row.category}
              </td>
              <td className="num">{formatCurrency(row.total, currency)}</td>
              <td className="num muted">{row.percent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
