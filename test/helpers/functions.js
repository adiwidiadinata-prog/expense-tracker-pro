/**
 * test/helpers/functions.js
 * Testable implementations of core app functions
 * Extracted from expense-tracker-secured.html for unit testing
 */

// ==================== CONSTANTS ====================
const MAX_AMOUNT = 1000000000;
const VALID_CATEGORIES = ['Makan & Minum', 'Transportasi', 'Operasional', 'Pembelian Barang', 'Lainnya'];
const VALID_IMAGE_PROTOCOLS = ['http:', 'https:', 'data:'];
const DB_NAME = 'ExpenseTrackerSecured';

// ==================== VALIDATORS ====================

/**
 * Validate expense amount (1 - 1,000,000,000 IDR)
 */
function validateAmount(amount) {
  const num = parseInt(amount);
  return !isNaN(num) && num > 0 && num <= MAX_AMOUNT;
}

/**
 * Validate email address format and length
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email) && email.length <= 254;
}

/**
 * Validate password minimum length
 */
function validatePassword(password) {
  return !!(password && password.length >= 6);
}

/**
 * Validate image URL - only http, https, data: protocols allowed
 */
function validateImageUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return VALID_IMAGE_PROTOCOLS.includes(u.protocol);
  } catch {
    return url.startsWith('data:image/');
  }
}

/**
 * Validate expense category against allowed list
 */
function validateCategory(category) {
  return VALID_CATEGORIES.includes(category);
}

/**
 * Validate invitation code format (6 chars, alphanumeric)
 */
function validateInviteCode(code) {
  if (!code || typeof code !== 'string') return false;
  return /^[A-Z0-9]{6}$/.test(code.toUpperCase()) && code.length === 6;
}

// ==================== SANITIZATION ====================

/**
 * Sanitize HTML string - escapes dangerous characters, removes script tags
 * Equivalent to: div.textContent = str; return div.innerHTML;
 */
function sanitizeHtml(str) {
  if (!str) return '';
  // Remove script tags and content
  let clean = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi, '');
  // Remove event handler attributes
  clean = clean.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
  // Remove javascript: protocol references
  clean = clean.replace(/javascript:/gi, '');
  // Escape remaining dangerous characters
  return clean
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Escape special characters for display (safe text output)
 */
function escapeText(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ==================== TIMESTAMP ====================

/**
 * Normalize various timestamp formats to ISO string
 */
function normalizeTimestamp(timestamp) {
  if (!timestamp) return new Date().toISOString();
  if (typeof timestamp === 'string') return timestamp;
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  if (timestamp instanceof Date) return timestamp.toISOString();
  return new Date(timestamp).toISOString();
}

/**
 * Format ISO timestamp to Indonesian date string
 */
function formatDateId(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

// ==================== CURRENCY ====================

/**
 * Format number to Indonesian Rupiah currency
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

/**
 * Parse currency string back to number
 */
function parseCurrency(str) {
  if (!str) return 0;
  const cleaned = String(str).replace(/[^0-9]/g, '');
  return parseInt(cleaned) || 0;
}

// ==================== EXPENSE HELPERS ====================

/**
 * Generate mock expense objects for testing
 */
function generateMockExpenses(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `expense-${i}`,
    userId: `user-${i % 5}`,
    businessId: 'test-business-1',
    amount: Math.floor((i + 1) * 10000),
    category: VALID_CATEGORIES[i % VALID_CATEGORIES.length],
    note: `Test expense ${i + 1}`,
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    month: '2026-08',
    status: i % 3 === 0 ? 'pending' : 'approved',
    type: i % 5 === 0 ? 'reimburse' : 'pengeluaran'
  }));
}

/**
 * Calculate total amount from expense list
 */
function calculateTotal(expenses) {
  if (!Array.isArray(expenses)) return 0;
  return expenses.reduce((sum, exp) => sum + (parseInt(exp.amount) || 0), 0);
}

/**
 * Filter expenses by status
 */
function filterByStatus(expenses, status) {
  return expenses.filter(exp => exp.status === status);
}

/**
 * Filter expenses by userId
 */
function filterByUser(expenses, userId) {
  return expenses.filter(exp => exp.userId === userId);
}

/**
 * Filter expenses by month (YYYY-MM format)
 */
function filterByMonth(expenses, month) {
  return expenses.filter(exp => {
    const expMonth = exp.createdAt ? exp.createdAt.substring(0, 7) : '';
    return expMonth === month;
  });
}

/**
 * Sort expenses by date descending
 */
function sortByDateDesc(expenses) {
  return [...expenses].sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );
}

// ==================== SYNC QUEUE ====================

/**
 * In-memory sync queue (simulates IndexedDB syncQueue)
 */
class SyncQueue {
  constructor() {
    this._queue = [];
  }

  add(item) {
    this._queue.push({ ...item, _queuedAt: new Date().toISOString() });
    return this._queue.length;
  }

  getAll() {
    return [...this._queue];
  }

  clear() {
    const count = this._queue.length;
    this._queue = [];
    return count;
  }

  size() {
    return this._queue.length;
  }

  process(processFn) {
    const items = [...this._queue];
    this._queue = [];
    return items.map(processFn);
  }
}

// ==================== FIREBASE MOCK HELPERS ====================

/**
 * Create a mock Firebase Timestamp
 */
function createMockFirebaseTimestamp(date) {
  const d = date || new Date();
  return {
    seconds: Math.floor(d.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => d,
    toMillis: () => d.getTime()
  };
}

/**
 * Simulate expense creation with validation
 */
function createExpense(data) {
  const errors = [];

  if (!validateAmount(data.amount)) {
    errors.push('amount: invalid (must be 1 - 1,000,000,000)');
  }
  if (!validateCategory(data.category)) {
    errors.push(`category: invalid (must be one of ${VALID_CATEGORIES.join(', ')})`);
  }
  if (!data.userId) {
    errors.push('userId: required');
  }
  if (!data.businessId) {
    errors.push('businessId: required');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    expense: {
      ...data,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      month: new Date().toISOString().substring(0, 7),
      status: data.type === 'reimburse' ? 'pending' : 'approved'
    }
  };
}

/**
 * Simulate role-based access check
 */
function canAccessExpense(expense, user) {
  if (!user || !expense) return false;
  if (user.role === 'owner' && user.businessId === expense.businessId) return true;
  if (user.role === 'karyawan' && user.uid === expense.userId) return true;
  return false;
}

module.exports = {
  // Constants
  MAX_AMOUNT,
  VALID_CATEGORIES,
  VALID_IMAGE_PROTOCOLS,
  DB_NAME,
  // Validators
  validateAmount,
  validateEmail,
  validatePassword,
  validateImageUrl,
  validateCategory,
  validateInviteCode,
  // Sanitization
  sanitizeHtml,
  escapeText,
  // Timestamps
  normalizeTimestamp,
  formatDateId,
  // Currency
  formatCurrency,
  parseCurrency,
  // Expense helpers
  generateMockExpenses,
  calculateTotal,
  filterByStatus,
  filterByUser,
  filterByMonth,
  sortByDateDesc,
  createExpense,
  canAccessExpense,
  // Sync queue
  SyncQueue,
  // Firebase mock helpers
  createMockFirebaseTimestamp
};
