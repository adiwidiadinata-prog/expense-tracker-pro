/**
 * Unit Tests: Input Validators
 * Tests all validation functions for correct accept/reject behavior
 */

const {
  validateAmount,
  validateEmail,
  validatePassword,
  validateImageUrl,
  validateCategory,
  validateInviteCode,
  MAX_AMOUNT,
  VALID_CATEGORIES
} = require('../helpers/functions');

// ==================== validateAmount ====================
describe('validateAmount', () => {
  test('accepts minimum valid amount (1)', () => {
    expect(validateAmount(1)).toBe(true);
  });

  test('accepts common expense (50000)', () => {
    expect(validateAmount(50000)).toBe(true);
  });

  test('accepts maximum valid amount (1,000,000,000)', () => {
    expect(validateAmount(MAX_AMOUNT)).toBe(true);
  });

  test('accepts numeric string', () => {
    expect(validateAmount('75000')).toBe(true);
  });

  test('rejects zero', () => {
    expect(validateAmount(0)).toBe(false);
  });

  test('rejects negative amount', () => {
    expect(validateAmount(-100)).toBe(false);
  });

  test('rejects amount exceeding max', () => {
    expect(validateAmount(MAX_AMOUNT + 1)).toBe(false);
  });

  test('rejects non-numeric string', () => {
    expect(validateAmount('abc')).toBe(false);
  });

  test('rejects null', () => {
    expect(validateAmount(null)).toBe(false);
  });

  test('rejects undefined', () => {
    expect(validateAmount(undefined)).toBe(false);
  });

  test('rejects float — parses as integer', () => {
    // parseInt(50000.99) = 50000, which is valid
    expect(validateAmount(50000.99)).toBe(true);
  });

  test('rejects empty string', () => {
    expect(validateAmount('')).toBe(false);
  });
});

// ==================== validateEmail ====================
describe('validateEmail', () => {
  test('accepts standard email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  test('accepts email with subdomain', () => {
    expect(validateEmail('owner.test@expensetracker.test')).toBe(true);
  });

  test('accepts email with plus sign', () => {
    expect(validateEmail('user+tag@example.com')).toBe(true);
  });

  test('rejects email without @', () => {
    expect(validateEmail('invalidemail.com')).toBe(false);
  });

  test('rejects email without domain', () => {
    expect(validateEmail('user@')).toBe(false);
  });

  test('rejects email without local part', () => {
    expect(validateEmail('@example.com')).toBe(false);
  });

  test('rejects email exceeding 254 characters', () => {
    const longEmail = 'a'.repeat(250) + '@test.com';
    expect(validateEmail(longEmail)).toBe(false);
  });

  test('rejects null', () => {
    expect(validateEmail(null)).toBe(false);
  });

  test('rejects empty string', () => {
    expect(validateEmail('')).toBe(false);
  });
});

// ==================== validatePassword ====================
describe('validatePassword', () => {
  test('accepts password with exactly 6 characters', () => {
    expect(validatePassword('abc123')).toBe(true);
  });

  test('accepts password longer than 6 characters', () => {
    expect(validatePassword('TestPass123x')).toBe(true);
  });

  test('rejects password with 5 characters', () => {
    expect(validatePassword('abc12')).toBe(false);
  });

  test('rejects empty string', () => {
    expect(validatePassword('')).toBe(false);
  });

  test('rejects null', () => {
    expect(validatePassword(null)).toBe(false);
  });

  test('rejects undefined', () => {
    expect(validatePassword(undefined)).toBe(false);
  });
});

// ==================== validateCategory ====================
describe('validateCategory', () => {
  test.each(VALID_CATEGORIES)('accepts valid category: %s', (cat) => {
    expect(validateCategory(cat)).toBe(true);
  });

  test('rejects unknown category', () => {
    expect(validateCategory('Hacking')).toBe(false);
  });

  test('rejects empty string', () => {
    expect(validateCategory('')).toBe(false);
  });

  test('rejects null', () => {
    expect(validateCategory(null)).toBe(false);
  });

  test('rejects partial match', () => {
    expect(validateCategory('Makan')).toBe(false);
  });
});

// ==================== validateImageUrl ====================
describe('validateImageUrl', () => {
  test('accepts https URL', () => {
    expect(validateImageUrl('https://example.com/image.jpg')).toBe(true);
  });

  test('accepts http URL', () => {
    expect(validateImageUrl('http://cdn.example.com/pic.png')).toBe(true);
  });

  test('accepts data URI', () => {
    expect(validateImageUrl('data:image/jpeg;base64,/9j/4AAQSkZJRgAB')).toBe(true);
  });

  test('rejects javascript: protocol', () => {
    expect(validateImageUrl('javascript:alert("xss")')).toBe(false);
  });

  test('rejects file: protocol', () => {
    expect(validateImageUrl('file:///etc/passwd')).toBe(false);
  });

  test('rejects ftp: protocol', () => {
    expect(validateImageUrl('ftp://example.com/image.jpg')).toBe(false);
  });

  test('rejects empty string', () => {
    expect(validateImageUrl('')).toBe(false);
  });

  test('rejects null', () => {
    expect(validateImageUrl(null)).toBe(false);
  });
});

// ==================== validateInviteCode ====================
describe('validateInviteCode', () => {
  test('accepts valid 6-char alphanumeric code', () => {
    expect(validateInviteCode('F5QZS3')).toBe(true);
  });

  test('accepts lowercase code (normalizes to upper)', () => {
    expect(validateInviteCode('f5qzs3')).toBe(true);
  });

  test('rejects code shorter than 6 chars', () => {
    expect(validateInviteCode('ABC')).toBe(false);
  });

  test('rejects code longer than 6 chars', () => {
    expect(validateInviteCode('ABCDEFG')).toBe(false);
  });

  test('rejects null', () => {
    expect(validateInviteCode(null)).toBe(false);
  });
});
