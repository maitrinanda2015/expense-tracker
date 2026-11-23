const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    targetAmount: { type: Number, required: true, min: 0.01 },
    currentAmount: { type: Number, default: 0, min: 0 },
    targetDate: { type: Date, default: null },
  },
  { timestamps: true }
);

goalSchema.virtual('progress').get(function progress() {
  if (!this.targetAmount) return 0;
  return Math.min(100, Math.floor((this.currentAmount / this.targetAmount) * 100));
});

goalSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (_doc, ret) => { delete ret.id; return ret; } });

module.exports = mongoose.model('Goal', goalSchema);
