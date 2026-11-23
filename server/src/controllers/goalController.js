const Goal = require('../models/Goal');
const { notFound } = require('../utils/AppError');
const { roundMoney } = require('../utils/format');

async function findOwned(userId, id) {
  const goal = await Goal.findOne({ _id: id, user: userId });
  if (!goal) throw notFound('Goal');
  return goal;
}

async function list(req, res) {
  const goals = await Goal.find({ user: req.user._id }).sort({ targetDate: 1, createdAt: 1 });
  res.json({ data: goals });
}

async function create(req, res) {
  const goal = await Goal.create({ ...req.valid.body, user: req.user._id });
  res.status(201).json({ data: goal });
}

async function update(req, res) {
  const goal = await findOwned(req.user._id, req.valid.params.id);
  Object.assign(goal, req.valid.body);
  await goal.save();
  res.json({ data: goal });
}

/** Add to (or, with a negative amount, withdraw from) a goal's saved amount. */
async function contribute(req, res) {
  const goal = await findOwned(req.user._id, req.valid.params.id);
  goal.currentAmount = Math.max(0, roundMoney(goal.currentAmount + req.valid.body.amount));
  await goal.save();
  res.json({ data: goal });
}

async function remove(req, res) {
  const result = await Goal.deleteOne({ _id: req.valid.params.id, user: req.user._id });
  if (result.deletedCount === 0) throw notFound('Goal');
  res.status(204).end();
}

module.exports = { list, create, update, contribute, remove };
