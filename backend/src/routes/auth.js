const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { register, login, verifyInvite, refreshToken } = require('../controllers/authController');
const { validateRequest } = require('../middleware/errorHandler');

router.post('/register',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim().isLength({ max: 100 }),
  body('role').optional().isIn(['owner', 'karyawan']),
  body('inviteCode').optional().matches(/^[A-Z0-9]{6}$/),
  validateRequest,
  register
);

router.post('/login',
  body('firebaseToken').notEmpty(),
  validateRequest,
  login
);

router.post('/verify-invite',
  body('code').notEmpty().trim(),
  validateRequest,
  verifyInvite
);

router.post('/refresh-token',
  body('token').notEmpty(),
  validateRequest,
  refreshToken
);

module.exports = router;
