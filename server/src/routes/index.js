const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { uploadAttachment } = require('../middleware/upload');
const { validate } = require('../middleware/validate');
const { idParams } = require('../validators/common');
const authSchemas = require('../validators/auth');
const txSchemas = require('../validators/transactions');
const { accounts, categories, budgets, goals, analytics } = require('../validators/resources');

const auth = require('../controllers/authController');
const transactions = require('../controllers/transactionController');
const accountCtrl = require('../controllers/accountController');
const categoryCtrl = require('../controllers/categoryController');
const budgetCtrl = require('../controllers/budgetController');
const goalCtrl = require('../controllers/goalController');
const analyticsCtrl = require('../controllers/analyticsController');
const dashboardCtrl = require('../controllers/dashboardController');

const byId = validate({ params: idParams });

// ---- Auth --------------------------------------------------------------
const authRouter = express.Router();
authRouter.post('/register', authLimiter, validate({ body: authSchemas.register }), auth.register);
authRouter.post('/login', authLimiter, validate({ body: authSchemas.login }), auth.login);
authRouter.post('/logout', requireAuth, auth.logout);
authRouter.get('/me', requireAuth, auth.me);
authRouter.patch('/me', requireAuth, validate({ body: authSchemas.updateProfile }), auth.updateMe);

// ---- Transactions ------------------------------------------------------
const txRouter = express.Router();
txRouter.use(requireAuth);
txRouter.get('/', validate({ query: txSchemas.list }), transactions.list);
txRouter.get('/export', validate({ query: txSchemas.exportQuery }), transactions.exportCsv);
txRouter.post('/', validate({ body: txSchemas.create }), transactions.create);
txRouter.get('/:id', byId, transactions.getOne);
txRouter.patch('/:id', validate({ params: idParams, body: txSchemas.update }), transactions.update);
txRouter.delete('/:id', byId, transactions.remove);
txRouter.post('/:id/attachment', byId, uploadAttachment, transactions.uploadAttachment);
txRouter.get('/:id/attachment', byId, transactions.downloadAttachment);
txRouter.delete('/:id/attachment', byId, transactions.deleteAttachment);

// ---- Accounts ----------------------------------------------------------
const accountRouter = express.Router();
accountRouter.use(requireAuth);
accountRouter.get('/', accountCtrl.list);
accountRouter.post('/', validate({ body: accounts.create }), accountCtrl.create);
accountRouter.patch('/:id', validate({ params: idParams, body: accounts.update }), accountCtrl.update);
accountRouter.delete('/:id', byId, accountCtrl.remove);

// ---- Categories --------------------------------------------------------
const categoryRouter = express.Router();
categoryRouter.use(requireAuth);
categoryRouter.get('/', categoryCtrl.list);
categoryRouter.post('/', validate({ body: categories.create }), categoryCtrl.create);
categoryRouter.delete('/:id', byId, categoryCtrl.remove);

// ---- Budgets -----------------------------------------------------------
const budgetRouter = express.Router();
budgetRouter.use(requireAuth);
budgetRouter.get('/', validate({ query: budgets.query }), budgetCtrl.list);
budgetRouter.put('/', validate({ body: budgets.upsert }), budgetCtrl.upsert);
budgetRouter.delete('/:id', byId, budgetCtrl.remove);

// ---- Savings goals -----------------------------------------------------
const goalRouter = express.Router();
goalRouter.use(requireAuth);
goalRouter.get('/', goalCtrl.list);
goalRouter.post('/', validate({ body: goals.create }), goalCtrl.create);
goalRouter.patch('/:id', validate({ params: idParams, body: goals.update }), goalCtrl.update);
goalRouter.post('/:id/contribute', validate({ params: idParams, body: goals.contribute }), goalCtrl.contribute);
goalRouter.delete('/:id', byId, goalCtrl.remove);

// ---- Analytics & dashboard --------------------------------------------
const analyticsRouter = express.Router();
analyticsRouter.use(requireAuth);
analyticsRouter.get('/summary', validate({ query: analytics.summary }), analyticsCtrl.summary);
analyticsRouter.get('/monthly', validate({ query: analytics.monthly }), analyticsCtrl.monthly);

const api = express.Router();
api.use('/auth', authRouter);
api.use('/transactions', txRouter);
api.use('/accounts', accountRouter);
api.use('/categories', categoryRouter);
api.use('/budgets', budgetRouter);
api.use('/goals', goalRouter);
api.use('/analytics', analyticsRouter);
api.get('/dashboard', requireAuth, dashboardCtrl.getDashboard);

module.exports = api;
