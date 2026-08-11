const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { getMe, updateMe, listUsers, generateInvite, removeUser } = require('../controllers/userController');
const { verifyJwt, requireOwner } = require('../middleware/auth');
const { validateRequest } = require('../middleware/errorHandler');

router.use(verifyJwt);

router.get('/me', getMe);

router.put('/me',
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('phone').optional().matches(/^[0-9+\-\s]{8,20}$/),
  validateRequest,
  updateMe
);

router.get('/', requireOwner, listUsers);

router.post('/invite', requireOwner, generateInvite);

router.delete('/:id', requireOwner, removeUser);

module.exports = router;
