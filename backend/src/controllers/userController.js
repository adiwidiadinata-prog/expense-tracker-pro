/**
 * User Controller
 * Profile management, employee management, invite codes
 */

const { getDb, getAuth } = require('../config/firebase');
const logger = require('../utils/logger');

/**
 * GET /api/users/me
 */
async function getMe(req, res) {
  try {
    const db = getDb();
    const doc = await db.collection('users').doc(req.user.uid).get();
    if (!doc.exists) return res.status(404).json({ error: 'User tidak ditemukan' });

    const user = doc.data();
    // Ambil info bisnis juga
    const bizDoc = await db.collection('businesses').doc(user.businessId).get();
    const business = bizDoc.exists ? bizDoc.data() : null;

    res.json({
      user: {
        uid: user.uid, email: user.email, name: user.name,
        role: user.role, businessId: user.businessId
      },
      business: business ? {
        id: business.id, name: business.name, plan: business.plan,
        trialEndDate: business.trialEndDate,
        subscriptionEndDate: business.subscriptionEndDate
      } : null
    });

  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil profil' });
  }
}

/**
 * PUT /api/users/me
 */
async function updateMe(req, res) {
  try {
    const db = getDb();
    const { name, phone } = req.body;
    const updates = { updatedAt: new Date().toISOString() };
    if (name) updates.name = name;
    if (phone) updates.phone = phone;

    await db.collection('users').doc(req.user.uid).update(updates);
    res.json({ message: 'Profil berhasil diperbarui' });

  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui profil' });
  }
}

/**
 * GET /api/users - Owner only: list all users in business
 */
async function listUsers(req, res) {
  try {
    const db = getDb();
    const { businessId } = req.user;

    const snapshot = await db.collection('users')
      .where('businessId', '==', businessId)
      .get();

    const users = snapshot.docs.map(doc => {
      const u = doc.data();
      return { uid: u.uid, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt, active: u.active };
    });

    res.json({ users, total: users.length });

  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil daftar karyawan' });
  }
}

/**
 * POST /api/users/invite - Owner only: generate invite code
 */
async function generateInvite(req, res) {
  try {
    const db = getDb();
    const { uid, businessId } = req.user;

    const code = Array.from({ length: 6 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join('');

    await db.collection('inviteCodes').doc(code).set({
      code,
      businessId,
      createdBy: uid,
      createdAt: new Date().toISOString(),
      usageCount: 0,
      maxUsage: 10,
      active: true
    });

    res.status(201).json({
      message: 'Kode undangan berhasil dibuat',
      code,
      shareText: `Bergabunglah ke bisnis saya di Expense Tracker Pro! Kode undangan: ${code}\nDownload: https://expense-tracker-pro-h4ru.vercel.app`
    });

  } catch (error) {
    res.status(500).json({ error: 'Gagal membuat kode undangan' });
  }
}

/**
 * DELETE /api/users/:id - Owner only: remove employee
 */
async function removeUser(req, res) {
  try {
    const db = getDb();
    const { id } = req.params;
    const { businessId } = req.user;

    if (id === req.user.uid) {
      return res.status(400).json({ error: 'Tidak bisa menghapus akun sendiri' });
    }

    const userDoc = await db.collection('users').doc(id).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User tidak ditemukan' });
    if (userDoc.data().businessId !== businessId) return res.status(403).json({ error: 'Akses ditolak' });

    // Deactivate (don't delete Firebase Auth account)
    await db.collection('users').doc(id).update({
      active: false,
      removedAt: new Date().toISOString(),
      removedBy: req.user.uid
    });

    res.json({ message: 'Karyawan berhasil dinonaktifkan' });

  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus karyawan' });
  }
}

module.exports = { getMe, updateMe, listUsers, generateInvite, removeUser };
