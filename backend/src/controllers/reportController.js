/**
 * Report Controller
 * Monthly summary, CSV/PDF export, analytics
 */

const { getDb } = require('../config/firebase');
const logger = require('../utils/logger');

/**
 * GET /api/reports/summary?month=2026-08
 * Owner only - monthly expense summary
 */
async function getMonthlySummary(req, res) {
  try {
    const db = getDb();
    const { businessId } = req.user;
    const { month } = req.query;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Parameter month wajib (format: YYYY-MM)' });
    }

    const snapshot = await db.collection('expenses')
      .where('businessId', '==', businessId)
      .where('month', '==', month)
      .get();

    const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Aggregate stats
    const approved = expenses.filter(e => e.status === 'approved');
    const pending = expenses.filter(e => e.status === 'pending');
    const rejected = expenses.filter(e => e.status === 'rejected');

    const totalApproved = approved.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalPending = pending.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Per category breakdown
    const byCategory = {};
    approved.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + (e.amount || 0);
    });

    // Per user breakdown (for owner)
    const byUser = {};
    approved.forEach(e => {
      byUser[e.userId] = (byUser[e.userId] || 0) + (e.amount || 0);
    });

    // Owner expenses vs karyawan reimbursements
    const ownerExpenses = approved.filter(e => e.type === 'pengeluaran');
    const reimburse = approved.filter(e => e.type === 'reimburse');

    res.json({
      month,
      summary: {
        totalApproved,
        totalPending,
        countApproved: approved.length,
        countPending: pending.length,
        countRejected: rejected.length,
        ownerTotal: ownerExpenses.reduce((s, e) => s + e.amount, 0),
        reimburseTotal: reimburse.reduce((s, e) => s + e.amount, 0)
      },
      byCategory,
      byUser,
      expenses
    });

  } catch (error) {
    logger.error('Report summary failed', { error: error.message });
    res.status(500).json({ error: 'Gagal mengambil laporan' });
  }
}

/**
 * GET /api/reports/export/csv?month=2026-08
 */
async function exportCsv(req, res) {
  try {
    const db = getDb();
    const { uid, role, businessId } = req.user;
    const { month } = req.query;

    let query = db.collection('expenses').where('businessId', '==', businessId);
    if (month) query = query.where('month', '==', month);
    if (role === 'karyawan') query = query.where('userId', '==', uid);
    query = query.orderBy('createdAt', 'desc');

    const snapshot = await query.get();
    const expenses = snapshot.docs.map(doc => doc.data());

    // Build CSV
    const headers = ['Tanggal', 'Kategori', 'Jumlah', 'Tipe', 'Status', 'Catatan', 'UserID'];
    const rows = expenses.map(e => [
      e.createdAt ? e.createdAt.split('T')[0] : '',
      e.category || '',
      e.amount || 0,
      e.type || '',
      e.status || '',
      `"${(e.note || '').replace(/"/g, '""')}"`,
      e.userId || ''
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const filename = `laporan-${month || 'semua'}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('﻿' + csv); // BOM for Excel compatibility

  } catch (error) {
    logger.error('CSV export failed', { error: error.message });
    res.status(500).json({ error: 'Gagal export CSV' });
  }
}

/**
 * GET /api/reports/analytics
 * Owner only - 6-month trend data
 */
async function getAnalytics(req, res) {
  try {
    const db = getDb();
    const { businessId } = req.user;

    // Get last 6 months
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const results = await Promise.all(months.map(async (month) => {
      const snap = await db.collection('expenses')
        .where('businessId', '==', businessId)
        .where('month', '==', month)
        .where('status', '==', 'approved')
        .get();
      const total = snap.docs.reduce((s, d) => s + (d.data().amount || 0), 0);
      return { month, total, count: snap.size };
    }));

    res.json({ months: results });

  } catch (error) {
    logger.error('Analytics failed', { error: error.message });
    res.status(500).json({ error: 'Gagal mengambil analytics' });
  }
}

module.exports = { getMonthlySummary, exportCsv, getAnalytics };
