const { z } = require('zod');
const { roundMoney } = require('../utils/format');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const idParams = z.object({ id: objectId });

/** Trimmed text with control characters and HTML tags removed. */
const safeText = (max, min = 0) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/<[^>]*>/g, '').trim())
    .pipe(
      z
        .string()
        .min(min, min > 0 ? 'This field is required' : undefined)
        .max(max, `Must be at most ${max} characters`)
    );

const money = z.coerce
  .number({ error: 'Must be a number' })
  .positive('Must be greater than 0')
  .max(1_000_000_000, 'Amount is too large')
  .transform(roundMoney);

/** "YYYY-MM-DD" -> Date at UTC midnight. */
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .transform((s) => new Date(`${s}T00:00:00.000Z`))
  .refine((d) => !Number.isNaN(d.getTime()), 'Invalid date');

const monthString = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use the format YYYY-MM');

/** Query-string field: empty string is treated as "not provided". */
const optionalQuery = (schema) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

module.exports = { z, objectId, idParams, safeText, money, dateOnly, monthString, optionalQuery };
