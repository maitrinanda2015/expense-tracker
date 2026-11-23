const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Account = require('../models/Account');
const { env } = require('../config/env');
const { signToken } = require('../middleware/auth');
const { processDueRecurring } = require('../services/recurringService');
const { AppError } = require('../utils/AppError');

// Compared against when the email is unknown, so a failed login takes the
// same time whether or not the account exists.
let dummyHash;
const getDummyHash = async () => {
  dummyHash = dummyHash || (await bcrypt.hash('not-a-real-password', env.bcryptRounds));
  return dummyHash;
};

const authResponse = (user) => ({ ...signToken(user._id), user });

async function register(req, res) {
  const { name, email, password, currency } = req.valid.body;

  if (await User.exists({ email })) {
    throw new AppError(409, 'An account with this email already exists', 'EMAIL_TAKEN', [
      { field: 'email', message: 'An account with this email already exists' },
    ]);
  }

  const user = await User.create({ name, email, password, currency });
  // Every transaction needs an account, so start new users with one.
  await Account.create({ user: user._id, name: 'Cash', type: 'cash' });

  res.status(201).json(authResponse(user));
}

async function login(req, res) {
  const { email, password } = req.valid.body;
  const user = await User.findOne({ email }).select('+password');

  const valid = user
    ? await user.comparePassword(password)
    : await bcrypt.compare(password, await getDummyHash());
  if (!user || !valid) {
    throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  await processDueRecurring({ userId: user._id });
  res.json(authResponse(user));
}

// JWTs are stateless: the client discards its token. The endpoint exists so
// clients have a single, authenticated place to end a session.
function logout(_req, res) {
  res.status(204).end();
}

function me(req, res) {
  res.json({ data: req.user });
}

async function updateMe(req, res) {
  Object.assign(req.user, req.valid.body);
  await req.user.save();
  res.json({ data: req.user });
}

module.exports = { register, login, logout, me, updateMe };
