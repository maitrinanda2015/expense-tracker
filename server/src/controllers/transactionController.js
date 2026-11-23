const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const { resolveCategory } = require('../services/categoryService');
const { processDueRecurring, buildRecurring } = require('../services/recurringService');
const { AppError, notFound } = require('../utils/AppError');
const { escapeRegex } = require('../utils/format');
const { endOfDay, startOfDay } = require('../utils/dates');
const { toCsv } = require('../utils/csv');
const { EXPORT_MAX_ROWS } = require('../constants');

const ACCOUNT_FIELDS = 'name type';

const SORTS = {
  date_desc: { date: -1, createdAt: -1 },
  date_asc: { date: 1, createdAt: 1 },
  amount_desc: { amount: -1, date: -1 },
  amount_asc: { amount: 1, date: -1 },
};

/**
 * Translate validated query params into a Mongo filter. Always scoped to
 * the requesting user; values have already been type-checked by Zod.
 */
function buildFilter(userId, q) {
  const filter = { user: userId };
  if (q.type) filter.type = q.type;
  if (q.category) filter.category = q.category;
  if (q.account) filter.account = q.account;
  if (q.from || q.to) {
    filter.date = {};
    if (q.from) filter.date.$gte = q.from;
    if (q.to) filter.date.$lte = endOfDay(q.to);
  }
  if (q.minAmount != null || q.maxAmount != null) {
    filter.amount = {};
    if (q.minAmount != null) filter.amount.$gte = q.minAmount;
    if (q.maxAmount != null) filter.amount.$lte = q.maxAmount;
  }
  if (q.search) {
    const pattern = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ note: pattern }, { category: pattern }];
    const asNumber = Number(q.search);
    if (Number.isFinite(asNumber)) filter.$or.push({ amount: asNumber });
  }
  return filter;
}

async function findOwned(userId, id) {
  const tx = await Transaction.findOne({ _id: id, user: userId });
  if (!tx) throw notFound('Transaction');
  return tx;
}

async function assertOwnAccount(userId, accountId) {
  if (!(await Account.exists({ _id: accountId, user: userId }))) {
    throw new AppError(400, 'Account not found', 'INVALID_ACCOUNT', [
      { field: 'account', message: 'Choose one of your accounts' },
    ]);
  }
}

async function list(req, res) {
  const q = req.valid.query;
  const userId = req.user._id;
  await processDueRecurring({ userId });

  const filter = buildFilter(userId, q);
  const [items, total] = await Promise.all([
    Transaction.find(filter)
      .sort(SORTS[q.sort || 'date_desc'])
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate('account', ACCOUNT_FIELDS)
      .lean(),
    Transaction.countDocuments(filter),
  ]);

  res.json({
    data: items,
    pagination: { page: q.page, limit: q.limit, total, pages: Math.max(1, Math.ceil(total / q.limit)) },
  });
}

async function getOne(req, res) {
  const tx = await findOwned(req.user._id, req.valid.params.id);
  await tx.populate('account', ACCOUNT_FIELDS);
  res.json({ data: tx });
}

async function create(req, res) {
  const userId = req.user._id;
  const { isRecurring, frequency, date, ...body } = req.valid.body;

  await assertOwnAccount(userId, body.account);
  body.category = await resolveCategory(userId, body.type, body.category);

  const tx = new Transaction({ ...body, user: userId, date: date || startOfDay(new Date()) });
  if (isRecurring) tx.recurring = await buildRecurring(tx, frequency);
  await tx.save();

  // A backdated recurring transaction may already have occurrences due.
  if (isRecurring) await processDueRecurring({ userId });

  await tx.populate('account', ACCOUNT_FIELDS);
  res.status(201).json({ data: tx });
}

async function update(req, res) {
  const userId = req.user._id;
  const tx = await findOwned(userId, req.valid.params.id);
  const { isRecurring, frequency, ...changes } = req.valid.body;

  if (changes.account) await assertOwnAccount(userId, changes.account);
  if (changes.category || changes.type) {
    changes.category = await resolveCategory(userId, changes.type || tx.type, changes.category || tx.category);
  }
  Object.assign(tx, changes);

  const wantsRecurring = isRecurring ?? tx.recurring.enabled;
  const newFrequency = frequency || tx.recurring.frequency;
  if (wantsRecurring && !newFrequency) {
    throw new AppError(400, 'Validation failed', 'VALIDATION_ERROR', [
      { field: 'frequency', message: 'Choose how often this transaction repeats' },
    ]);
  }
  const scheduleChanged =
    wantsRecurring !== tx.recurring.enabled ||
    newFrequency !== tx.recurring.frequency ||
    changes.date !== undefined;
  if (wantsRecurring && scheduleChanged) {
    tx.recurring = await buildRecurring(tx, newFrequency);
  } else if (!wantsRecurring) {
    tx.recurring = { enabled: false, occurrences: tx.recurring.occurrences };
  }

  await tx.save();
  if (wantsRecurring) await processDueRecurring({ userId });

  await tx.populate('account', ACCOUNT_FIELDS);
  res.json({ data: tx });
}

async function remove(req, res) {
  const result = await Transaction.deleteOne({ _id: req.valid.params.id, user: req.user._id });
  if (result.deletedCount === 0) throw notFound('Transaction');
  res.status(204).end();
}

async function exportCsv(req, res) {
  const filter = buildFilter(req.user._id, req.valid.query);
  const items = await Transaction.find(filter)
    .sort(SORTS[req.valid.query.sort || 'date_desc'])
    .limit(EXPORT_MAX_ROWS)
    .populate('account', 'name')
    .lean();

  const csv = toCsv(
    ['Date', 'Type', 'Category', 'Account', 'Amount', 'Note'],
    items.map((t) => [
      t.date.toISOString().slice(0, 10),
      t.type === 'income' ? 'Income' : 'Expense',
      t.category,
      t.account ? t.account.name : '',
      t.amount,
      t.note,
    ])
  );

  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="transactions-${stamp}.csv"`);
  res.send(csv);
}

async function uploadAttachment(req, res) {
  if (!req.file) {
    throw new AppError(400, 'Attach a file in the "file" field', 'FILE_REQUIRED');
  }
  const tx = await findOwned(req.user._id, req.valid.params.id);
  tx.attachment = {
    filename: req.file.originalname.replace(/[^\w.\- ]/g, '_').slice(0, 100),
    mimetype: req.file.mimetype,
    size: req.file.size,
  };
  tx.attachmentData = req.file.buffer;
  await tx.save();
  await tx.populate('account', ACCOUNT_FIELDS);
  res.json({ data: tx });
}

async function downloadAttachment(req, res) {
  const tx = await Transaction.findOne({ _id: req.valid.params.id, user: req.user._id }).select(
    '+attachmentData attachment'
  );
  if (!tx || !tx.attachment || !tx.attachmentData) throw notFound('Attachment');

  res.setHeader('Content-Type', tx.attachment.mimetype);
  res.setHeader('Content-Disposition', `inline; filename="${tx.attachment.filename}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(tx.attachmentData);
}

async function deleteAttachment(req, res) {
  const tx = await findOwned(req.user._id, req.valid.params.id);
  tx.attachment = null;
  tx.attachmentData = undefined;
  await tx.save();
  res.status(204).end();
}

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
  exportCsv,
  uploadAttachment,
  downloadAttachment,
  deleteAttachment,
  buildFilter,
};
