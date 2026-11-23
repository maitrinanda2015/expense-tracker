const mongoose = require('mongoose');
const { ACCOUNT_TYPES } = require('../constants');

const accountSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    type: { type: String, enum: ACCOUNT_TYPES, required: true },
  },
  { timestamps: true }
);

// Account names are unique per user, ignoring case.
accountSchema.index(
  { user: 1, name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

accountSchema.set('toJSON', { versionKey: false });

module.exports = mongoose.model('Account', accountSchema);
