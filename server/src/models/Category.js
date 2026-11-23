const mongoose = require('mongoose');
const { TRANSACTION_TYPES } = require('../constants');

// Custom, user-created categories. The built-in defaults live in
// constants/index.js and are merged in by the categories service.
const categorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    type: { type: String, enum: TRANSACTION_TYPES, required: true },
    icon: { type: String, default: '🏷️', maxlength: 8 },
  },
  { timestamps: true }
);

categorySchema.index(
  { user: 1, type: 1, name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

categorySchema.set('toJSON', { versionKey: false });

module.exports = mongoose.model('Category', categorySchema);
