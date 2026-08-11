/**
 * JWT Authentication Middleware
 * Verifies Firebase ID token OR backend JWT
 */

const jwt = require('jsonwebtoken');
const { getAuth, getDb } = require('../config/firebase');
const logger = require('../utils/logger');

/**
 * Verify Firebase ID token from frontend
 */
async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token tidak ditemukan' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);

    // Get user data from Firestore
    const db = getDb();
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return res.status(401).json({ error: 'User tidak ditemukan' });
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      ...userDoc.data()
    };

    next();
  } catch (error) {
    logger.error('Firebase token verification failed', { error: error.message });
    return res.status(401).json({ error: 'Token tidak valid atau kadaluarsa' });
  }
}

/**
 * Verify backend JWT (for API-only clients)
 */
function verifyJwt(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token tidak ditemukan' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token tidak valid atau kadaluarsa' });
  }
}

/**
 * Require owner role
 */
function requireOwner(req, res, next) {
  if (req.user?.role !== 'owner') {
    return res.status(403).json({ error: 'Hanya pemilik bisnis yang bisa akses' });
  }
  next();
}

/**
 * Check active subscription
 */
async function requireSubscription(req, res, next) {
  try {
    if (req.user?.role === 'karyawan') return next(); // karyawan tidak perlu cek

    const db = getDb();
    const bizDoc = await db.collection('businesses').doc(req.user.businessId).get();

    if (!bizDoc.exists) return next(); // bisnis baru, allow through

    const biz = bizDoc.data();
    const now = new Date();
    const trialEnd = biz.trialEndDate ? new Date(biz.trialEndDate) : null;
    const subEnd = biz.subscriptionEndDate ? new Date(biz.subscriptionEndDate) : null;

    const isTrialActive = trialEnd && trialEnd > now;
    const isSubActive = subEnd && subEnd > now;

    if (!isTrialActive && !isSubActive) {
      return res.status(402).json({
        error: 'Langganan tidak aktif',
        message: 'Silakan perpanjang langganan untuk melanjutkan',
        subscribeUrl: `${process.env.FRONTEND_URL}/subscribe`
      });
    }

    next();
  } catch (error) {
    logger.error('Subscription check failed', { error: error.message });
    next(); // fail open untuk menghindari lock-out
  }
}

module.exports = { verifyFirebaseToken, verifyJwt, requireOwner, requireSubscription };
