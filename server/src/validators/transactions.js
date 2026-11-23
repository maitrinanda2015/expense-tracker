const { TRANSACTION_TYPES, FREQUENCIES } = require('../constants');
const { z, objectId, safeText, money, dateOnly, optionalQuery } = require('./common');

const fields = {
  amount: money,
  type: z.enum(TRANSACTION_TYPES, 'Type must be income or expense'),
  category: safeText(40, 1),
  account: objectId,
  note: safeText(200),
  date: dateOnly,
  isRecurring: z.boolean(),
  frequency: z.enum(FREQUENCIES, 'Frequency must be daily, weekly, monthly or yearly'),
};

const requireFrequency = [
  (v) => !v.isRecurring || Boolean(v.frequency),
  { message: 'Choose how often this transaction repeats', path: ['frequency'] },
];

const create = z
  .object({
    amount: fields.amount,
    type: fields.type,
    category: fields.category,
    account: fields.account,
    note: fields.note.optional().default(''),
    date: fields.date.optional(),
    isRecurring: fields.isRecurring.optional().default(false),
    frequency: fields.frequency.optional(),
  })
  .refine(...requireFrequency);

const update = z
  .object({
    amount: fields.amount.optional(),
    type: fields.type.optional(),
    category: fields.category.optional(),
    account: fields.account.optional(),
    note: fields.note.optional(),
    date: fields.date.optional(),
    isRecurring: fields.isRecurring.optional(),
    frequency: fields.frequency.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

const filters = {
  type: optionalQuery(fields.type),
  category: optionalQuery(z.string().trim().max(40)),
  account: optionalQuery(objectId),
  from: optionalQuery(dateOnly),
  to: optionalQuery(dateOnly),
  minAmount: optionalQuery(z.coerce.number().min(0)),
  maxAmount: optionalQuery(z.coerce.number().min(0)),
  search: optionalQuery(z.string().trim().max(100)),
  sort: optionalQuery(z.enum(['date_desc', 'date_asc', 'amount_desc', 'amount_asc'])),
};

const rangeChecks = (schema) =>
  schema
    .refine((q) => !(q.from && q.to) || q.from <= q.to, {
      message: '"from" date must be on or before "to" date',
      path: ['from'],
    })
    .refine((q) => q.minAmount == null || q.maxAmount == null || q.minAmount <= q.maxAmount, {
      message: 'Minimum amount must not exceed maximum amount',
      path: ['minAmount'],
    });

const list = rangeChecks(
  z.object({
    ...filters,
    page: optionalQuery(z.coerce.number().int().min(1)).default(1),
    limit: optionalQuery(z.coerce.number().int().min(1).max(100)).default(20),
  })
);

const exportQuery = rangeChecks(z.object(filters));

module.exports = { create, update, list, exportQuery };
