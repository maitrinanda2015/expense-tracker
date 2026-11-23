const Budget = require('../models/Budget');
const { budgetsForMonth } = require('../services/budgetService');
const { resolveCategory } = require('../services/categoryService');
const { parseMonth } = require('../utils/dates');
const { notFound } = require('../utils/AppError');

async function list(req, res) {
  const { month } = req.valid.query;
  res.json({ data: await budgetsForMonth(req.user, month ? parseMonth(month) : new Date()) });
}

/** Create or replace the overall budget (category: null) or a category budget. */
async function upsert(req, res) {
  const userId = req.user._id;
  let { category } = req.valid.body;
  if (category) category = await resolveCategory(userId, 'expense', category);

  let budget = await Budget.findOne({ user: userId, category });
  const created = !budget;
  if (!budget) budget = new Budget({ user: userId, category });
  budget.amount = req.valid.body.amount;
  await budget.save();

  res.status(created ? 201 : 200).json({ data: budget });
}

async function remove(req, res) {
  const result = await Budget.deleteOne({ _id: req.valid.params.id, user: req.user._id });
  if (result.deletedCount === 0) throw notFound('Budget');
  res.status(204).end();
}

module.exports = { list, upsert, remove };
