const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { listExpenses, createExpense, getExpense, approveExpense, updateExpense, deleteExpense } = require('../controllers/expenseController');
const { verifyJwt, requireSubscription } = require('../middleware/auth');
const { validateRequest } = require('../middleware/errorHandler');

// All expense routes require JWT auth
router.use(verifyJwt);

router.get('/', requireSubscription, listExpenses);

router.post('/',
  requireSubscription,
  body('amount').isInt({ min: 1, max: 1000000000 }),
  body('category').isIn(['makanan', 'transportasi', 'akomodasi', 'pembelian', 'lainnya']),
  body('note').optional().isString().trim().isLength({ max: 500 }),
  body('photoUrl').optional().isURL(),
  body('type').optional().isIn(['pengeluaran', 'reimburse']),
  validateRequest,
  createExpense
);

router.get('/:id', requireSubscription, getExpense);

router.put('/:id/approve',
  body('action').isIn(['approve', 'reject']),
  validateRequest,
  approveExpense
);

router.put('/:id',
  body('amount').optional().isInt({ min: 1, max: 1000000000 }),
  body('category').optional().isIn(['makanan', 'transportasi', 'akomodasi', 'pembelian', 'lainnya']),
  body('note').optional().isString().trim().isLength({ max: 500 }),
  validateRequest,
  updateExpense
);

router.delete('/:id', deleteExpense);

module.exports = router;
