/**
 * Security Tests: Authentication & Authorization
 * Verifies access control, input validation security
 */

const {
  validatePassword,
  validateEmail,
  validateAmount,
  validateCategory,
  validateImageUrl,
  validateInviteCode,
  canAccessExpense,
  createExpense,
  VALID_CATEGORIES
} = require('../helpers/functions');

describe('Authentication - Password Security', () => {
  test('rejects password shorter than 6 characters', () => {
    expect(validatePassword('abc')).toBe(false);
    expect(validatePassword('12345')).toBe(false);
  });

  test('rejects empty password', () => {
    expect(validatePassword('')).toBe(false);
    expect(validatePassword(null)).toBe(false);
  });

  test('accepts minimum valid password (6 chars)', () => {
    expect(validatePassword('Abc123')).toBe(true);
  });

  test('accepts strong password', () => {
    expect(validatePassword('TestPass123xSecure!')).toBe(true);
  });
});

describe('Authentication - Email Validation Security', () => {
  test('rejects SQL injection attempts in email field', () => {
    expect(validateEmail("' OR '1'='1")).toBe(false);
    expect(validateEmail("admin'--")).toBe(false);
  });

  test('rejects excessively long email (DoS prevention)', () => {
    const longEmail = 'a'.repeat(255) + '@test.com';
    expect(validateEmail(longEmail)).toBe(false);
  });

  test('rejects email with spaces (potential injection)', () => {
    expect(validateEmail('user @example.com')).toBe(false);
  });
});

describe('Authorization - Role-Based Access Control', () => {
  const ownerExpense = {
    id: 'exp-1',
    userId: 'owner-uid',
    businessId: 'biz-1',
    amount: 50000,
    status: 'approved'
  };
  const karyawanExpense = {
    id: 'exp-2',
    userId: 'karyawan-uid',
    businessId: 'biz-1',
    amount: 75000,
    status: 'pending'
  };

  const owner = { uid: 'owner-uid', role: 'owner', businessId: 'biz-1' };
  const karyawan = { uid: 'karyawan-uid', role: 'karyawan', businessId: 'biz-1' };
  const otherKaryawan = { uid: 'other-uid', role: 'karyawan', businessId: 'biz-1' };
  const otherBusiness = { uid: 'owner-uid', role: 'owner', businessId: 'biz-2' };

  test('owner can access own expenses', () => {
    expect(canAccessExpense(ownerExpense, owner)).toBe(true);
  });

  test('owner can access karyawan expenses in same business', () => {
    expect(canAccessExpense(karyawanExpense, owner)).toBe(true);
  });

  test('owner cannot access expenses from different business', () => {
    expect(canAccessExpense(karyawanExpense, otherBusiness)).toBe(false);
  });

  test('karyawan can access own expenses', () => {
    expect(canAccessExpense(karyawanExpense, karyawan)).toBe(true);
  });

  test('karyawan cannot access other karyawan expenses', () => {
    expect(canAccessExpense(karyawanExpense, otherKaryawan)).toBe(false);
  });

  test('karyawan cannot access owner expenses', () => {
    expect(canAccessExpense(ownerExpense, karyawan)).toBe(false);
  });

  test('returns false for null user', () => {
    expect(canAccessExpense(ownerExpense, null)).toBe(false);
  });

  test('returns false for null expense', () => {
    expect(canAccessExpense(null, owner)).toBe(false);
  });
});

describe('Authorization - Expense Creation Validation', () => {
  test('creates valid expense successfully', () => {
    const result = createExpense({
      userId: 'user-1',
      businessId: 'biz-1',
      amount: 50000,
      category: 'Makan & Minum',
      note: 'Makan siang'
    });
    expect(result.success).toBe(true);
    expect(result.expense).toBeDefined();
    expect(result.expense.id).toBeDefined();
  });

  test('rejects expense with invalid amount', () => {
    const result = createExpense({
      userId: 'user-1',
      businessId: 'biz-1',
      amount: -1000,
      category: 'Makan & Minum'
    });
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('amount'))).toBe(true);
  });

  test('rejects expense with invalid category', () => {
    const result = createExpense({
      userId: 'user-1',
      businessId: 'biz-1',
      amount: 50000,
      category: 'Hacking Tools'
    });
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('category'))).toBe(true);
  });

  test('rejects expense without userId', () => {
    const result = createExpense({
      businessId: 'biz-1',
      amount: 50000,
      category: 'Operasional'
    });
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('userId'))).toBe(true);
  });

  test('rejects expense without businessId', () => {
    const result = createExpense({
      userId: 'user-1',
      amount: 50000,
      category: 'Operasional'
    });
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('businessId'))).toBe(true);
  });

  test('reimburse expense starts as pending', () => {
    const result = createExpense({
      userId: 'user-1',
      businessId: 'biz-1',
      amount: 75000,
      category: 'Transportasi',
      type: 'reimburse'
    });
    expect(result.success).toBe(true);
    expect(result.expense.status).toBe('pending');
  });

  test('owner expense starts as approved', () => {
    const result = createExpense({
      userId: 'owner-1',
      businessId: 'biz-1',
      amount: 50000,
      category: 'Operasional',
      type: 'pengeluaran'
    });
    expect(result.success).toBe(true);
    expect(result.expense.status).toBe('approved');
  });
});

describe('Security - Invite Code Validation', () => {
  test('rejects code with special characters', () => {
    expect(validateInviteCode('!@#$%^')).toBe(false);
  });

  test('rejects code with spaces', () => {
    expect(validateInviteCode('ABC 12')).toBe(false);
  });

  test('accepts valid alphanumeric code', () => {
    expect(validateInviteCode('F5QZS3')).toBe(true);
    expect(validateInviteCode('ABC123')).toBe(true);
  });
});
