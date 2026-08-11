/**
 * Expense Controller
 * CRUD + Approval workflow
 */

const { getDb } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const MAX_AMOUNT = 1_000_000_000;

/**
 * GET /api/expenses
 * Owner: all business expenses | Karyawan: own expenses only
 */
async function listExpenses(req, res) {
  try {
    const db = getDb();
    const { role, uid, businessId } = req.user;
    const { month, status, limit: limitParam = 100 } = req.query;

    let query = db.collection('expenses').where('businessId', '==', businessId);

    if (role === 'karyawan') {
      query = query.where('userId', '==', uid);
    }
    if (status) {
      query = query.where('status', '==', status);
    }
    if (month) {
      query = query.where('month', '==', month);
    }

    query = query.orderBy('createdAt', 'desc').limit(Math.min(parseInt(limitParam), 500));

    const snapshot = await query.get();
    const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ expenses, total: expenses.length });

  } catch (error) {
    logger.error('List expenses failed', { error: error.message, user: req.user?.uid });
    res.status(500).json({ error: 'Gagal mengambil data pengeluaran' });
  }
}

/**
 * POST /api/expenses
 * Create new expense
 */
async function createExpense(req, res) {
  try {
    const db = getDb();
    const { uid, role, businessId } = req.user;
    const { amount, category, note, photoUrl, type } = req.body;

    const expenseId = uuidv4();
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Owner expenses auto-approved; karyawan needs approval
    const status = role === 'owner' ? 'approved' : 'pending';
    const expenseType = type || (role === 'karyawan' ? 'reimburse' : 'pengeluaran');

    const expense = {
      id: expenseId,
      userId: uid,
      businessId,
      amount: parseInt(amount),
      category,
      note: sanitize(note || ''),
      photoUrl: photoUrl || null,
      type: expenseType,
      status,
      month,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      approvedBy: role === 'owner' ? uid : null,
      approvedAt: role === 'owner' ? now.toISOString() : null
    };

    await db.collection('expenses').doc(expenseId).set(expense);

    // Audit log
    await db.collection('auditLogs').add({
      action: 'CREATE_EXPENSE',
      userId: uid,
      businessId,
      expenseId,
      amount: expense.amount,
      timestamp: now.toISOString()
    });

    logger.info('Expense created', { expenseId, userId: uid, amount: expense.amount });

    res.status(201).json({ message: 'Pengeluaran berhasil disimpan', expense });

  } catch (error) {
    logger.error('Create expense failed', { error: error.message, user: req.user?.uid });
    res.status(500).json({ error: 'Gagal menyimpan pengeluaran' });
  }
}

/**
 * GET /api/expenses/:id
 */
async function getExpense(req, res) {
  try {
    const db = getDb();
    const { id } = req.params;
    const { uid, role, businessId } = req.user;

    const doc = await db.collection('expenses').doc(id).get();

    if (!doc.exists) return res.status(404).json({ error: 'Pengeluaran tidak ditemukan' });

    const expense = { id: doc.id, ...doc.data() };

    // Access control
    if (expense.businessId !== businessId) {
      return res.status(403).json({ error: 'Akses ditolak' });
    }
    if (role === 'karyawan' && expense.userId !== uid) {
      return res.status(403).json({ error: 'Akses ditolak' });
    }

    res.json({ expense });

  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil pengeluaran' });
  }
}

/**
 * PUT /api/expenses/:id/approve
 * Owner only
 */
async function approveExpense(req, res) {
  try {
    const db = getDb();
    const { id } = req.params;
    const { uid, businessId } = req.user;
    const { action } = req.body; // 'approve' or 'reject'

    const doc = await db.collection('expenses').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Pengeluaran tidak ditemukan' });

    const expense = doc.data();
    if (expense.businessId !== businessId) return res.status(403).json({ error: 'Akses ditolak' });
    if (expense.status !== 'pending') return res.status(400).json({ error: 'Pengeluaran bukan dalam status pending' });

    const newStatus = action === 'reject' ? 'rejected' : 'approved';
    const now = new Date().toISOString();

    await db.collection('expenses').doc(id).update({
      status: newStatus,
      approvedBy: uid,
      approvedAt: now,
      updatedAt: now
    });

    // Audit log
    await db.collection('auditLogs').add({
      action: `${newStatus.toUpperCase()}_EXPENSE`,
      userId: uid,
      businessId,
      expenseId: id,
      timestamp: now
    });

    logger.info('Expense status updated', { expenseId: id, newStatus, approvedBy: uid });

    res.json({
      message: newStatus === 'approved' ? 'Pengeluaran disetujui' : 'Pengeluaran ditolak',
      status: newStatus
    });

  } catch (error) {
    logger.error('Approve expense failed', { error: error.message });
    res.status(500).json({ error: 'Gagal memperbarui status pengeluaran' });
  }
}

/**
 * PUT /api/expenses/:id
 * Update own pending expense
 */
async function updateExpense(req, res) {
  try {
    const db = getDb();
    const { id } = req.params;
    const { uid } = req.user;

    const doc = await db.collection('expenses').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Pengeluaran tidak ditemukan' });

    const expense = doc.data();
    if (expense.userId !== uid) return res.status(403).json({ error: 'Hanya bisa edit pengeluaran sendiri' });
    if (expense.status !== 'pending') return res.status(400).json({ error: 'Hanya bisa edit pengeluaran yang masih pending' });

    const { amount, category, note, photoUrl } = req.body;
    const updates = { updatedAt: new Date().toISOString() };
    if (amount) updates.amount = parseInt(amount);
    if (category) updates.category = category;
    if (note !== undefined) updates.note = sanitize(note);
    if (photoUrl !== undefined) updates.photoUrl = photoUrl;

    await db.collection('expenses').doc(id).update(updates);

    res.json({ message: 'Pengeluaran berhasil diperbarui' });

  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui pengeluaran' });
  }
}

/**
 * DELETE /api/expenses/:id
 * Delete own pending expense (or owner can delete any)
 */
async function deleteExpense(req, res) {
  try {
    const db = getDb();
    const { id } = req.params;
    const { uid, role, businessId } = req.user;

    const doc = await db.collection('expenses').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Pengeluaran tidak ditemukan' });

    const expense = doc.data();
    if (expense.businessId !== businessId) return res.status(403).json({ error: 'Akses ditolak' });
    if (role !== 'owner' && expense.userId !== uid) return res.status(403).json({ error: 'Hanya bisa hapus pengeluaran sendiri' });
    if (role !== 'owner' && expense.status !== 'pending') return res.status(400).json({ error: 'Hanya bisa hapus pengeluaran yang masih pending' });

    await db.collection('expenses').doc(id).delete();

    res.json({ message: 'Pengeluaran berhasil dihapus' });

  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus pengeluaran' });
  }
}

// ==================== HELPER ====================
function sanitize(str) {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    .replace(/javascript:/gi, '')
    .substring(0, 500);
}

module.exports = { listExpenses, createExpense, getExpense, approveExpense, updateExpense, deleteExpense };
