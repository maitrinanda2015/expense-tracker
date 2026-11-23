const mongoose = require('mongoose');
const { TRANSACTION_TYPES, FREQUENCIES } = require('../constants');

const { ObjectId } = mongoose.Schema.Types;

const transactionSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    account: { type: ObjectId, ref: 'Account', required: true },
    type: { type: String, enum: TRANSACTION_TYPES, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    category: { type: String, required: true, trim: true, maxlength: 40 },
    note: { type: String, trim: true, maxlength: 200, default: '' },
    date: { type: Date, required: true },

    // Metadata is returned with the transaction; the file bytes are only
    // loaded by the download endpoint.
    attachment: {
      type: new mongoose.Schema(
        { filename: String, mimetype: String, size: Number },
        { _id: false }
      ),
      default: null,
    },
    attachmentData: { type: Buffer, select: false },

    // A transaction with recurring.enabled is a "template": the scheduler
    // creates a copy on each nextDate and advances it.
    recurring: {
      enabled: { type: Boolean, default: false },
      frequency: { type: String, enum: FREQUENCIES },
      nextDate: { type: Date },
      occurrences: { type: Number, default: 0 },
    },
    generatedFrom: { type: ObjectId, ref: 'Transaction', default: null },
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, date: -1, createdAt: -1 });
transactionSchema.index({ user: 1, account: 1 });
transactionSchema.index({ user: 1, type: 1, category: 1, date: -1 });
transactionSchema.index({ 'recurring.enabled': 1, 'recurring.nextDate': 1 });
transactionSchema.index({ generatedFrom: 1, date: -1 });

transactionSchema.set('toJSON', {
  versionKey: false,
  transform(_doc, ret) {
    delete ret.attachmentData;
    return ret;
  },
});

module.exports = mongoose.model('Transaction', transactionSchema);
