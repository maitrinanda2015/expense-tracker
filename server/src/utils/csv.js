// Quote a CSV cell when needed, and neutralise spreadsheet formula
// injection (cells starting with = + - @ are prefixed with a quote).
function escapeCell(value) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(header, rows) {
  return [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n') + '\r\n';
}

module.exports = { toCsv, escapeCell };
