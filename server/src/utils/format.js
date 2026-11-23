const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const formatMoney = (value, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${roundMoney(value).toFixed(2)}`;
  }
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { roundMoney, formatMoney, escapeRegex };
