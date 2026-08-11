/**
 * Auth Controller
 * Register, Login, Invite Code, Token Refresh
 */

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb, getAuth } = require('../config/firebase');
const logger = require('../utils/logger');

const FREE_TRIAL_DAYS = parseInt(process.env.FREE_TRIAL_DAYS || '14');

/**
 * POST /api/auth/register
 * Register owner (creates new business) or karyawan (joins existing business)
 */
async function register(req, res) {
  try {
    const { email, password, name, role = 'owner', inviteCode } = req.body;
    const db = getDb();
    const auth = getAuth();

    // Create Firebase Auth user
    const userRecord = await auth.createUser({ email, password, displayName: name });
    const uid = userRecord.uid;

    let businessId, trialEndDate;

    if (role === 'owner') {
      // Create new business
      businessId = uuidv4();
      trialEndDate = new Date(Date.now() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();

      await db.collection('businesses').doc(businessId).set({
        id: businessId,
        ownerId: uid,
        ownerEmail: email,
        name: name ? `Bisnis ${name}` : 'Bisnis Saya',
        createdAt: new Date().toISOString(),
        trialEndDate,
        plan: 'trial',
        maxUsers: 2,
        maxExpensesPerMonth: 50
      });

      // Create invite code for this business
      const code = generateInviteCode();
      await db.collection('inviteCodes').doc(code).set({
        code,
        businessId,
        createdBy: uid,
        createdAt: new Date().toISOString(),
        usageCount: 0,
        maxUsage: 10,
        active: true
      });

    } else if (role === 'karyawan') {
      // Verify invite code
      if (!inviteCode) {
        return res.status(400).json({ error: 'Kode undangan wajib untuk karyawan' });
      }

      const codeDoc = await db.collection('inviteCodes').doc(inviteCode.toUpperCase()).get();
      if (!codeDoc.exists || !codeDoc.data().active) {
        return res.status(400).json({ error: 'Kode undangan tidak valid atau sudah tidak aktif' });
      }

      businessId = codeDoc.data().businessId;

      // Increment usage
      await db.collection('inviteCodes').doc(inviteCode.toUpperCase()).update({
        usageCount: (codeDoc.data().usageCount || 0) + 1
      });
    } else {
      return res.status(400).json({ error: 'Role tidak valid' });
    }

    // Save user to Firestore
    await db.collection('users').doc(uid).set({
      uid,
      email,
      name: name || email.split('@')[0],
      role,
      businessId,
      createdAt: new Date().toISOString(),
      active: true
    });

    // Generate backend JWT
    const token = generateJwt({ uid, email, role, businessId });

    logger.info('User registered', { uid, role, businessId });

    res.status(201).json({
      message: 'Registrasi berhasil',
      user: { uid, email, name, role, businessId },
      token,
      trialEndDate: trialEndDate || null
    });

  } catch (error) {
    logger.error('Register failed', { error: error.message });
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Email sudah terdaftar' });
    }
    res.status(500).json({ error: 'Gagal mendaftarkan akun' });
  }
}

/**
 * POST /api/auth/login
 * Login via Firebase Auth token (sent from frontend after firebase.signIn)
 */
async function login(req, res) {
  try {
    const { firebaseToken } = req.body;
    const auth = getAuth();
    const db = getDb();

    if (!firebaseToken) {
      return res.status(400).json({ error: 'Firebase token wajib' });
    }

    const decoded = await auth.verifyIdToken(firebaseToken);
    const userDoc = await db.collection('users').doc(decoded.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    const user = userDoc.data();
    const token = generateJwt({
      uid: user.uid,
      email: user.email,
      role: user.role,
      businessId: user.businessId
    });

    res.json({
      message: 'Login berhasil',
      user: { uid: user.uid, email: user.email, name: user.name, role: user.role, businessId: user.businessId },
      token
    });

  } catch (error) {
    logger.error('Login failed', { error: error.message });
    res.status(401).json({ error: 'Login gagal. Periksa email dan password.' });
  }
}

/**
 * POST /api/auth/verify-invite
 * Check if invite code is valid
 */
async function verifyInvite(req, res) {
  try {
    const { code } = req.body;
    const db = getDb();

    const codeDoc = await db.collection('inviteCodes').doc(code.toUpperCase()).get();

    if (!codeDoc.exists || !codeDoc.data().active) {
      return res.status(400).json({ valid: false, error: 'Kode undangan tidak valid' });
    }

    const bizDoc = await db.collection('businesses').doc(codeDoc.data().businessId).get();
    const bizName = bizDoc.exists ? bizDoc.data().name : 'Bisnis';

    res.json({
      valid: true,
      businessId: codeDoc.data().businessId,
      businessName: bizName
    });

  } catch (error) {
    res.status(500).json({ valid: false, error: 'Gagal memverifikasi kode' });
  }
}

/**
 * POST /api/auth/refresh-token
 */
function refreshToken(req, res) {
  try {
    const { token } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });

    // Only refresh if expired less than 7 days ago
    const expiredAt = decoded.exp * 1000;
    const gracePeriod = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - expiredAt > gracePeriod) {
      return res.status(401).json({ error: 'Token terlalu lama. Silakan login ulang.' });
    }

    const newToken = generateJwt({
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role,
      businessId: decoded.businessId
    });

    res.json({ token: newToken });
  } catch (error) {
    res.status(401).json({ error: 'Gagal refresh token' });
  }
}

// ==================== HELPERS ====================

function generateJwt(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY || '7d' });
}

function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

module.exports = { register, login, verifyInvite, refreshToken };
