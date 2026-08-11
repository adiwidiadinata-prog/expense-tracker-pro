const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { getPlans, createSubscription, paymentWebhook, getPaymentStatus, getInvoices } = require('../controllers/paymentController');
const { verifyJwt, requireOwner } = require('../middleware/auth');
const { validateRequest } = require('../middleware/errorHandler');

// Public: available plans
router.get('/plans', getPlans);

// Webhook: no auth (verified by Midtrans signature internally)
router.post('/webhook', paymentWebhook);

// Protected routes
router.use(verifyJwt);

// Create subscription: owner only
router.post('/subscribe',
  requireOwner,
  body('plan').optional().isIn(['monthly', 'annual']),
  validateRequest,
  createSubscription
);

// Check payment status
router.get('/status/:orderId', getPaymentStatus);

// Payment history
router.get('/invoices', requireOwner, getInvoices);

module.exports = router;
