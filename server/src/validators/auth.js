const { z, safeText } = require('./common');

const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254));

// bcrypt only uses the first 72 bytes, so cap the length there.
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters');

const currency = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter code like USD');

const register = z.object({
  name: safeText(60, 1),
  email,
  password,
  currency: currency.optional(),
});

const login = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(72),
});

const updateProfile = z
  .object({ name: safeText(60, 1).optional(), currency: currency.optional() })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

module.exports = { register, login, updateProfile };
