/**
 * Global Error Handler Middleware
 */

const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Check express-validator results
 */
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Data tidak valid',
      details: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
}

/**
 * 404 Handler
 */
function notFound(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.path} tidak ditemukan` });
}

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Terjadi kesalahan server'
    : err.message;

  res.status(status).json({ error: message });
}

module.exports = { validateRequest, notFound, errorHandler };
