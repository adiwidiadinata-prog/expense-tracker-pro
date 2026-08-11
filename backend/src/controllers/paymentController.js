/**
 * Payment Controller - Midtrans Integration
 * Subscription: Rp 25,000/month atau Rp 250,000/year
 * Mendukung: QRIS, GoPay, OVO, DANA, Bank Transfer
 */

const midtransClient = require('midtrans-client');
const { getDb } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// ==================== PRICING ====================
const PLANS = {
  monthly: {
    id: 'monthly',
    name: 'Pro Bulanan',
    price: parseInt(process.env.PRICE_MONTHLY || '25000'),
    duration: 30, // days
    label: 'Rp 25.000/bulan'
  },
  annual: {
    id: 'annual',
    name: 'Pro Tahunan',
    price: parseInt(process.env.PRICE_ANNUAL || '250000'),
    duration: 365,
    label: 'Rp 250.000/tahun (hemat 17%)'
  }
};

// ==================== MIDTRANS SETUP ====================
function getMidtransSnap() {
  return new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_ENV === 'production',
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
  });
}

/**
 * GET /api/payment/plans
 * Get available subscription plans
 */
function getPlans(req, res) {
  res.json({
    plans: Object.values(PLANS),
    freeTier: {
      maxExpensesPerMonth: parseInt(process.env.MAX_FREE_EXPENSES || '50'),
      maxUsers: parseInt(process.env.MAX_FREE_USERS || '2'),
      trialDays: parseInt(process.env.FREE_TRIAL_DAYS || '14')
    }
  });
}

/**
 * POST /api/payment/subscribe
 * Create Midtrans payment token for subscription
 * Supports: QRIS, GoPay, OVO, DANA, ShopeePay, BCA, Mandiri, BNI, BRI
 */
async function createSubscription(req, res) {
  try {
    const { plan = 'monthly' } = req.body;
    const { uid, email, businessId } = req.user;
    const db = getDb();

    const selectedPlan = PLANS[plan];
    if (!selectedPlan) {
      return res.status(400).json({ error: 'Plan tidak valid. Pilih: monthly atau annual' });
    }

    // Get user data
    const userDoc = await db.collection('users').doc(uid).get();
    const user = userDoc.data();

    // Create order ID
    const orderId = `ET-${businessId.substring(0, 8)}-${Date.now()}`;

    // Create Midtrans transaction
    const snap = getMidtransSnap();
    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: orderId,
        gross_amount: selectedPlan.price
      },
      item_details: [{
        id: selectedPlan.id,
        price: selectedPlan.price,
        quantity: 1,
        name: selectedPlan.name,
        category: 'Subscription'
      }],
      customer_details: {
        first_name: user?.name || email.split('@')[0],
        email: email
      },
      enabled_payments: [
        'qris',
        'gopay', 'shopeepay', 'dana', 'ovo',
        'bca_va', 'bni_va', 'bri_va', 'mandiri_bill',
        'permata_va', 'other_va'
      ],
      callbacks: {
        finish: `${process.env.FRONTEND_URL}/payment/success?order=${orderId}`,
        error: `${process.env.FRONTEND_URL}/payment/failed?order=${orderId}`,
        pending: `${process.env.FRONTEND_URL}/payment/pending?order=${orderId}`
      },
      custom_field1: businessId,
      custom_field2: plan,
      custom_field3: uid
    });

    // Save pending payment to Firestore
    await db.collection('payments').doc(orderId).set({
      orderId,
      businessId,
      userId: uid,
      plan,
      amount: selectedPlan.price,
      status: 'pending',
      createdAt: new Date().toISOString(),
      token: transaction.token,
      redirectUrl: transaction.redirect_url
    });

    logger.info('Payment created', { orderId, plan, amount: selectedPlan.price, businessId });

    res.status(201).json({
      message: 'Pembayaran berhasil dibuat',
      orderId,
      token: transaction.token,
      redirectUrl: transaction.redirect_url,
      plan: selectedPlan,
      // Instruksi QRIS
      instructions: {
        qris: 'Scan QR code di aplikasi GoPay, OVO, DANA, ShopeePay, atau m-banking',
        va: 'Bayar via ATM, m-banking, atau internet banking',
        expiry: '24 jam'
      }
    });

  } catch (error) {
    logger.error('Create subscription failed', { error: error.message });
    res.status(500).json({ error: 'Gagal membuat pembayaran. Coba lagi nanti.' });
  }
}

/**
 * POST /api/payment/webhook
 * Midtrans payment notification webhook
 * URL ini harus didaftarkan di Midtrans Dashboard → Settings → Payment Notification URL
 */
async function paymentWebhook(req, res) {
  try {
    const snap = getMidtransSnap();
    const db = getDb();

    // Verify notification from Midtrans
    const notification = await snap.transaction.notification(req.body);
    const { order_id, transaction_status, fraud_status, custom_field1: businessId, custom_field2: plan } = notification;

    logger.info('Payment webhook received', { order_id, transaction_status, fraud_status });

    let paymentStatus;
    if (transaction_status === 'capture' && fraud_status === 'accept') {
      paymentStatus = 'paid';
    } else if (transaction_status === 'settlement') {
      paymentStatus = 'paid';
    } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
      paymentStatus = 'failed';
    } else if (transaction_status === 'pending') {
      paymentStatus = 'pending';
    } else {
      paymentStatus = transaction_status;
    }

    // Update payment record
    await db.collection('payments').doc(order_id).update({
      status: paymentStatus,
      midtransStatus: transaction_status,
      updatedAt: new Date().toISOString(),
      rawNotification: JSON.stringify(req.body)
    });

    // If paid → activate subscription
    if (paymentStatus === 'paid' && businessId) {
      const selectedPlan = PLANS[plan] || PLANS.monthly;
      const now = new Date();
      const endDate = new Date(now.getTime() + selectedPlan.duration * 24 * 60 * 60 * 1000);

      await db.collection('businesses').doc(businessId).update({
        plan: 'pro',
        subscriptionEndDate: endDate.toISOString(),
        lastPaymentAt: now.toISOString(),
        lastPaymentPlan: plan,
        maxUsers: 100,
        maxExpensesPerMonth: 99999
      });

      logger.info('Subscription activated', { businessId, plan, endDate: endDate.toISOString() });
    }

    res.status(200).json({ status: 'OK' });

  } catch (error) {
    logger.error('Payment webhook failed', { error: error.message });
    // Always return 200 to prevent Midtrans retry storm
    res.status(200).json({ status: 'ERROR', message: error.message });
  }
}

/**
 * GET /api/payment/status/:orderId
 * Check payment status
 */
async function getPaymentStatus(req, res) {
  try {
    const db = getDb();
    const { orderId } = req.params;

    const doc = await db.collection('payments').doc(orderId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Pembayaran tidak ditemukan' });

    const payment = doc.data();
    if (payment.businessId !== req.user.businessId) {
      return res.status(403).json({ error: 'Akses ditolak' });
    }

    res.json({
      orderId,
      status: payment.status,
      plan: payment.plan,
      amount: payment.amount,
      createdAt: payment.createdAt
    });

  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil status pembayaran' });
  }
}

/**
 * GET /api/payment/invoices
 * List payment history
 */
async function getInvoices(req, res) {
  try {
    const db = getDb();
    const { businessId } = req.user;

    const snapshot = await db.collection('payments')
      .where('businessId', '==', businessId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const invoices = snapshot.docs.map(doc => {
      const p = doc.data();
      return {
        orderId: p.orderId,
        plan: p.plan,
        amount: p.amount,
        status: p.status,
        createdAt: p.createdAt
      };
    });

    res.json({ invoices });

  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil riwayat pembayaran' });
  }
}

module.exports = { getPlans, createSubscription, paymentWebhook, getPaymentStatus, getInvoices };
