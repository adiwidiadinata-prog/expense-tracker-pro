const express = require('express');
const router = express.Router();
const { getMonthlySummary, exportCsv, getAnalytics } = require('../controllers/reportController');
const { verifyJwt, requireOwner } = require('../middleware/auth');

router.use(verifyJwt);

// Summary: owner only (full view); karyawan gets 403 from requireOwner
router.get('/summary', requireOwner, getMonthlySummary);

// CSV export: all users (filtered by role inside controller)
router.get('/export/csv', exportCsv);

// 6-month analytics: owner only
router.get('/analytics', requireOwner, getAnalytics);

module.exports = router;
