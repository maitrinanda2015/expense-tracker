const { ACCOUNT_TYPES, TRANSACTION_TYPES } = require('../constants');
const { z, safeText, money, dateOnly, monthString, optionalQuery } = require('./common');

const nonEmpty = (schema) => schema.refine((v) => Object.keys(v).length > 0, 'Nothing to update');

const accountType = z.enum(ACCOUNT_TYPES, `Type must be one of: ${ACCOUNT_TYPES.join(', ')}`);

const accounts = {
  create: z.object({ name: safeText(40, 1), type: accountType }),
  update: nonEmpty(z.object({ name: safeText(40, 1).optional(), type: accountType.optional() })),
};

const categories = {
  create: z.object({
    name: safeText(40, 1),
    type: z.enum(TRANSACTION_TYPES, 'Type must be income or expense'),
    icon: z.string().trim().min(1).max(8).optional(),
  }),
};

const budgets = {
  upsert: z.object({
    // null / omitted = overall monthly budget
    category: safeText(40, 1).nullable().optional().default(null),
    amount: money,
  }),
  query: z.object({ month: optionalQuery(monthString) }),
};

const goals = {
  create: z
    .object({
      name: safeText(60, 1),
      targetAmount: money,
      currentAmount: z.coerce.number().min(0).max(1_000_000_000).optional().default(0),
      targetDate: dateOnly.nullable().optional(),
    }),
  update: nonEmpty(
    z.object({
      name: safeText(60, 1).optional(),
      targetAmount: money.optional(),
      currentAmount: z.coerce.number().min(0).max(1_000_000_000).optional(),
      targetDate: dateOnly.nullable().optional(),
    })
  ),
  contribute: z.object({
    // Negative amounts withdraw from the goal.
    amount: z.coerce
      .number({ error: 'Must be a number' })
      .refine((n) => n !== 0, 'Amount cannot be zero')
      .refine((n) => Math.abs(n) <= 1_000_000_000, 'Amount is too large'),
  }),
};

const analytics = {
  summary: z.object({
    period: optionalQuery(z.enum(['week', 'month', '3months', 'year'])).default('month'),
  }),
  monthly: z.object({
    months: optionalQuery(z.coerce.number().int().min(1).max(24)).default(6),
  }),
};

module.exports = { accounts, categories, budgets, goals, analytics };
