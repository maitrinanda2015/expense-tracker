const Category = require('../models/Category');
const { DEFAULT_CATEGORIES } = require('../constants');
const { AppError } = require('../utils/AppError');

const CASE_INSENSITIVE = { locale: 'en', strength: 2 };

async function listCategories(userId) {
  const custom = await Category.find({ user: userId }).sort({ name: 1 }).collation(CASE_INSENSITIVE).lean();
  const result = {};
  for (const type of Object.keys(DEFAULT_CATEGORIES)) {
    result[type] = [
      ...DEFAULT_CATEGORIES[type].map((c) => ({ ...c, type, custom: false })),
      ...custom
        .filter((c) => c.type === type)
        .map((c) => ({ _id: c._id, name: c.name, icon: c.icon, type, custom: true })),
    ];
  }
  return result;
}

const findDefault = (type, name) =>
  DEFAULT_CATEGORIES[type].find((c) => c.name.toLowerCase() === name.toLowerCase());

/**
 * Returns the stored spelling of a category if it is valid for this user and
 * transaction type, otherwise throws a 400.
 */
async function resolveCategory(userId, type, name) {
  const builtIn = findDefault(type, name);
  if (builtIn) return builtIn.name;

  const custom = await Category.findOne({ user: userId, type, name }).collation(CASE_INSENSITIVE).lean();
  if (custom) return custom.name;

  throw new AppError(400, `"${name}" is not a valid ${type} category`, 'INVALID_CATEGORY', [
    { field: 'category', message: `Unknown ${type} category` },
  ]);
}

module.exports = { listCategories, resolveCategory, findDefault, CASE_INSENSITIVE };
