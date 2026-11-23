const Transaction = require('../models/Transaction');
const { nthOccurrence } = require('../utils/dates');

// Safety cap so a template backdated by decades can't create unbounded rows in one run.
const MAX_OCCURRENCES_PER_RUN = 400;
const MAX_TEMPLATES_PER_RUN = 500;

/** Date of the first occurrence that has not been generated yet. */
const nextDateFor = (template, occurrences) =>
  nthOccurrence(template.date, template.recurring.frequency, occurrences + 1);

/**
 * Create every occurrence of recurring templates that has come due.
 * Pass a userId to process just that user (used on login / dashboard load);
 * omit it to process everyone (used by the scheduled job).
 *
 * Each template is claimed with a conditional update on its current
 * nextDate, so two concurrent runs can never create the same occurrence.
 */
async function processDueRecurring({ userId, now = new Date() } = {}) {
  const filter = { 'recurring.enabled': true, 'recurring.nextDate': { $lte: now } };
  if (userId) filter.user = userId;

  const templates = await Transaction.find(filter).limit(MAX_TEMPLATES_PER_RUN).lean();
  let created = 0;

  for (const template of templates) {
    const docs = [];
    let occurrences = template.recurring.occurrences || 0;
    let next = template.recurring.nextDate;

    while (next <= now && docs.length < MAX_OCCURRENCES_PER_RUN) {
      docs.push({
        user: template.user,
        account: template.account,
        type: template.type,
        amount: template.amount,
        category: template.category,
        note: template.note,
        date: next,
        generatedFrom: template._id,
      });
      occurrences += 1;
      next = nextDateFor(template, occurrences);
    }

    const claim = await Transaction.updateOne(
      { _id: template._id, 'recurring.enabled': true, 'recurring.nextDate': template.recurring.nextDate },
      { $set: { 'recurring.nextDate': next, 'recurring.occurrences': occurrences } }
    );
    if (claim.modifiedCount === 1 && docs.length) {
      await Transaction.insertMany(docs);
      created += docs.length;
    }
  }

  return created;
}

/**
 * Build the `recurring` sub-document for a template. Occurrences already
 * generated from it are counted so editing a template never re-creates them.
 */
async function buildRecurring(transaction, frequency) {
  const occurrences = transaction._id
    ? await Transaction.countDocuments({ generatedFrom: transaction._id })
    : 0;
  return {
    enabled: true,
    frequency,
    occurrences,
    nextDate: nthOccurrence(transaction.date, frequency, occurrences + 1),
  };
}

module.exports = { processDueRecurring, buildRecurring };
