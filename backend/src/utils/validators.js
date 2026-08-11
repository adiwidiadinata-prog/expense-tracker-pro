/**
 * Input Validators (mirrors frontend validation)
 * Used by express-validator middleware
 */

const { body, param, query } = require('express-validator');

const MAX_AMOUNT = 1_000_000_000;
const VALID_CATEGORIES = ['Makan & Minum', 'Transportasi', 'Operasional', 'Pembelian Barang', 'Lainnya'];
const VALID_IMAGE_PROTOCOLS = ['http:', 'https:'];

// ==================== EXPENSE VALIDATORS ====================
const expenseValidators = {
  create: [
    body('amount')
      .isInt({ min: 1, max: MAX_AMOUNT })
      .withMessage(`Jumlah harus antara 1 dan ${MAX_AMOUNT.toLocaleString('id-ID')}`),
    body('category')
      .isIn(VALID_CATEGORIES)
      .withMessage(`Kategori tidak valid. Pilih: ${VALID_CATEGORIES.join(', ')}`),
    body('note')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Catatan maksimal 500 karakter'),
    body('photoUrl')
      .optional()
      .custom((url) => {
        if (!url) return true;
        try {
          const u = new URL(url);
          if (!VALID_IMAGE_PROTOCOLS.includes(u.protocol)) {
            throw new Error('URL foto harus https:// atau http://');
          }
        } catch {
          if (!url.startsWith('data:image/')) {
            throw new Error('URL foto tidak valid');
          }
        }
        return true;
      }),
    body('type')
      .optional()
      .isIn(['pengeluaran', 'reimburse'])
      .withMessage('Tipe harus pengeluaran atau reimburse')
  ]
};

// ==================== AUTH VALIDATORS ====================
const authValidators = {
  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .isLength({ max: 254 })
      .withMessage('Email tidak valid'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password minimal 6 karakter'),
    body('role')
      .optional()
      .isIn(['owner', 'karyawan'])
      .withMessage('Role harus owner atau karyawan'),
    body('inviteCode')
      .optional()
      .isLength({ min: 6, max: 6 })
      .isAlphanumeric()
      .withMessage('Kode undangan harus 6 karakter alfanumerik')
  ],
  login: [
    body('email').isEmail().normalizeEmail().withMessage('Email tidak valid'),
    body('password').notEmpty().withMessage('Password wajib diisi')
  ]
};

// ==================== USER VALIDATORS ====================
const userValidators = {
  update: [
    body('name')
      .optional()
      .isString()
      .isLength({ min: 2, max: 100 })
      .withMessage('Nama 2-100 karakter'),
    body('phone')
      .optional()
      .isMobilePhone('id-ID')
      .withMessage('Nomor HP tidak valid')
  ]
};

module.exports = {
  expenseValidators,
  authValidators,
  userValidators,
  MAX_AMOUNT,
  VALID_CATEGORIES
};
