const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const { listCategories, findDefault } = require('../services/categoryService');
const { AppError, notFound } = require('../utils/AppError');

async function list(req, res) {
  res.json({ data: await listCategories(req.user._id) });
}

async function create(req, res) {
  const { name, type, icon } = req.valid.body;
  if (findDefault(type, name)) {
    throw new AppError(409, `"${name}" is already a built-in ${type} category`, 'DUPLICATE');
  }
  const category = await Category.create({ user: req.user._id, name, type, icon });
  res.status(201).json({ data: category });
}

async function remove(req, res) {
  const userId = req.user._id;
  const category = await Category.findOne({ _id: req.valid.params.id, user: userId });
  if (!category) throw notFound('Category');

  if (await Transaction.exists({ user: userId, type: category.type, category: category.name })) {
    throw new AppError(
      409,
      'This category is used by existing transactions and cannot be deleted.',
      'CATEGORY_IN_USE'
    );
  }

  await category.deleteOne();
  res.status(204).end();
}

module.exports = { list, create, remove };
