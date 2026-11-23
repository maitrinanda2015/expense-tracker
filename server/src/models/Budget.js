const mongoose = require('mongoose');

// A standing monthly budget. category === null is the overall budget;
// otherwise it limits one expense category (e.g. Food — 400/month).
const budgetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, default: null, trim: true, maxlength: 40 },
    amount: { type: Number, required: true, min: 0.01 },
  },
  { timestamps: true }
);

budgetSchema.index({ user: 1, category: 1 }, { unique: true });

budgetSchema.set('toJSON', { versionKey: false });

module.exports = mongoose.model('Budget', budgetSchema);
