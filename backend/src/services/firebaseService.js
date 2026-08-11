/**
 * Firebase Service - Reusable Firestore helpers
 */

const { getDb } = require('../config/firebase');

/**
 * Check if business subscription is active
 * @returns { active: bool, reason: string }
 */
async function checkSubscription(businessId) {
  const db = getDb();
  const doc = await db.collection('businesses').doc(businessId).get();

  if (!doc.exists) return { active: false, reason: 'Bisnis tidak ditemukan' };

  const biz = doc.data();
  const now = new Date();

  // Check trial
  if (biz.plan === 'trial') {
    if (new Date(biz.trialEndDate) > now) {
      const daysLeft = Math.ceil((new Date(biz.trialEndDate) - now) / (1000 * 60 * 60 * 24));
      return { active: true, plan: 'trial', daysLeft };
    }
    return { active: false, reason: 'Trial sudah berakhir. Silakan upgrade ke Pro.' };
  }

  // Check Pro subscription
  if (biz.plan === 'pro') {
    if (new Date(biz.subscriptionEndDate) > now) {
      const daysLeft = Math.ceil((new Date(biz.subscriptionEndDate) - now) / (1000 * 60 * 60 * 24));
      return { active: true, plan: 'pro', daysLeft };
    }
    return { active: false, reason: 'Langganan Pro sudah berakhir. Silakan perpanjang.' };
  }

  return { active: false, reason: 'Status langganan tidak valid' };
}

/**
 * Check quota (expenses per month)
 */
async function checkQuota(businessId, month) {
  const db = getDb();
  const bizDoc = await db.collection('businesses').doc(businessId).get();
  if (!bizDoc.exists) return { exceeded: true };

  const biz = bizDoc.data();
  const maxExpenses = biz.maxExpensesPerMonth || 50;

  const snapshot = await db.collection('expenses')
    .where('businessId', '==', businessId)
    .where('month', '==', month)
    .get();

  return {
    exceeded: snapshot.size >= maxExpenses,
    current: snapshot.size,
    max: maxExpenses
  };
}

/**
 * Get business info
 */
async function getBusiness(businessId) {
  const db = getDb();
  const doc = await db.collection('businesses').doc(businessId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

/**
 * Get user info
 */
async function getUser(uid) {
  const db = getDb();
  const doc = await db.collection('users').doc(uid).get();
  return doc.exists ? doc.data() : null;
}

/**
 * Get businesses with trials ending in N days (for reminder emails)
 */
async function getExpiringTrials(daysAhead = 3) {
  const db = getDb();
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysAhead);

  // Get businesses with trial ending around target date
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await db.collection('businesses')
    .where('plan', '==', 'trial')
    .where('trialEndDate', '>=', startOfDay.toISOString())
    .where('trialEndDate', '<=', endOfDay.toISOString())
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

module.exports = { checkSubscription, checkQuota, getBusiness, getUser, getExpiringTrials };
