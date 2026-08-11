/**
 * Unit Tests: Currency Formatters & Expense Helpers
 * Verifies formatting, parsing, and utility functions
 */

const {
  formatCurrency,
  parseCurrency,
  generateMockExpenses,
  calculateTotal,
  filterByStatus,
  filterByUser,
  filterByMonth,
  sortByDateDesc,
  VALID_CATEGORIES
} = require('../helpers/functions');

// ==================== formatCurrency ====================
describe('formatCurrency', () => {
  test('formats 50000 as Indonesian Rupiah', () => {
    const result = formatCurrency(50000);
    expect(result).toContain('Rp');
    expect(result).toContain('50');
  });

  test('formats large amount (1,000,000)', () => {
    const result = formatCurrency(1000000);
    expect(result).toContain('1');
    expect(result).toContain('000');
  });

  test('formats zero', () => {
    const result = formatCurrency(0);
    expect(typeof result).toBe('string');
    expect(result).toContain('0');
  });

  test('returns string type', () => {
    expect(typeof formatCurrency(50000)).toBe('string');
  });
});

// ==================== parseCurrency ====================
describe('parseCurrency', () => {
  test('parses Rp string to number', () => {
    expect(parseCurrency('Rp50.000')).toBe(50000);
  });

  test('parses plain number string', () => {
    expect(parseCurrency('75000')).toBe(75000);
  });

  test('handles null', () => {
    expect(parseCurrency(null)).toBe(0);
  });

  test('handles empty string', () => {
    expect(parseCurrency('')).toBe(0);
  });
});

// ==================== generateMockExpenses ====================
describe('generateMockExpenses', () => {
  test('returns array with correct count', () => {
    const expenses = generateMockExpenses(10);
    expect(expenses).toHaveLength(10);
  });

  test('returns 1000 items for load testing', () => {
    const expenses = generateMockExpenses(1000);
    expect(expenses).toHaveLength(1000);
  });

  test('each expense has required fields', () => {
    const expenses = generateMockExpenses(5);
    expenses.forEach(exp => {
      expect(exp).toHaveProperty('id');
      expect(exp).toHaveProperty('userId');
      expect(exp).toHaveProperty('businessId');
      expect(exp).toHaveProperty('amount');
      expect(exp).toHaveProperty('category');
      expect(exp).toHaveProperty('note');
      expect(exp).toHaveProperty('createdAt');
      expect(exp).toHaveProperty('status');
    });
  });

  test('each expense has valid category', () => {
    const expenses = generateMockExpenses(20);
    expenses.forEach(exp => {
      expect(VALID_CATEGORIES).toContain(exp.category);
    });
  });

  test('createdAt is valid ISO string', () => {
    const expenses = generateMockExpenses(3);
    const ISO_REGEX = /^\d{4}-\d{2}-\d{2}T/;
    expenses.forEach(exp => {
      expect(exp.createdAt).toMatch(ISO_REGEX);
    });
  });

  test('statuses are either pending or approved', () => {
    const expenses = generateMockExpenses(10);
    expenses.forEach(exp => {
      expect(['pending', 'approved']).toContain(exp.status);
    });
  });

  test('returns empty array for count 0', () => {
    expect(generateMockExpenses(0)).toHaveLength(0);
  });
});

// ==================== calculateTotal ====================
describe('calculateTotal', () => {
  test('sums expense amounts correctly', () => {
    const expenses = [
      { amount: 50000 },
      { amount: 30000 },
      { amount: 20000 }
    ];
    expect(calculateTotal(expenses)).toBe(100000);
  });

  test('returns 0 for empty array', () => {
    expect(calculateTotal([])).toBe(0);
  });

  test('handles null amounts gracefully', () => {
    const expenses = [{ amount: 50000 }, { amount: null }];
    expect(calculateTotal(expenses)).toBe(50000);
  });

  test('returns 0 for non-array input', () => {
    expect(calculateTotal(null)).toBe(0);
  });
});

// ==================== filterByStatus ====================
describe('filterByStatus', () => {
  const expenses = generateMockExpenses(10);

  test('filters by pending status', () => {
    const pending = filterByStatus(expenses, 'pending');
    expect(pending.every(e => e.status === 'pending')).toBe(true);
  });

  test('filters by approved status', () => {
    const approved = filterByStatus(expenses, 'approved');
    expect(approved.every(e => e.status === 'approved')).toBe(true);
  });

  test('returns empty for non-existent status', () => {
    expect(filterByStatus(expenses, 'rejected')).toHaveLength(0);
  });
});

// ==================== filterByUser ====================
describe('filterByUser', () => {
  test('returns only expenses for specified user', () => {
    const expenses = generateMockExpenses(20);
    const filtered = filterByUser(expenses, 'user-0');
    expect(filtered.every(e => e.userId === 'user-0')).toBe(true);
  });

  test('returns empty array if user has no expenses', () => {
    const expenses = generateMockExpenses(5);
    expect(filterByUser(expenses, 'nonexistent-user')).toHaveLength(0);
  });
});

// ==================== sortByDateDesc ====================
describe('sortByDateDesc', () => {
  test('sorts expenses newest first', () => {
    const expenses = generateMockExpenses(10);
    const sorted = sortByDateDesc(expenses);
    for (let i = 1; i < sorted.length; i++) {
      expect(new Date(sorted[i - 1].createdAt) >= new Date(sorted[i].createdAt)).toBe(true);
    }
  });

  test('does not mutate original array', () => {
    const expenses = generateMockExpenses(5);
    const original = [...expenses];
    sortByDateDesc(expenses);
    expect(expenses[0]).toEqual(original[0]);
  });
});
