/**
 * Performance Tests: Response Time Benchmarks
 * Ensures core operations complete within acceptable time limits
 */

const {
  validateAmount,
  validateEmail,
  validateImageUrl,
  sanitizeHtml,
  normalizeTimestamp,
  formatCurrency,
  generateMockExpenses,
  calculateTotal,
  sortByDateDesc,
  filterByStatus,
  filterByMonth,
  createExpense,
  SyncQueue,
  VALID_CATEGORIES
} = require('../helpers/functions');

describe('Performance - Validator Throughput', () => {
  test('validateAmount handles 10,000 calls in < 100ms', () => {
    const start = Date.now();
    for (let i = 0; i < 10000; i++) {
      validateAmount(Math.floor(Math.random() * 1000000));
    }
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });

  test('validateEmail handles 5,000 calls in < 100ms', () => {
    const emails = [
      'user@example.com', 'invalid', 'owner@test.test',
      'a'.repeat(300) + '@test.com', 'valid+tag@domain.org'
    ];
    const start = Date.now();
    for (let i = 0; i < 5000; i++) {
      validateEmail(emails[i % emails.length]);
    }
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });

  test('validateImageUrl handles 5,000 calls in < 100ms', () => {
    const urls = [
      'https://example.com/img.jpg',
      'javascript:alert(1)',
      'data:image/jpeg;base64,/9j',
      'ftp://bad.com/img.png',
      'http://valid.com/photo.webp'
    ];
    const start = Date.now();
    for (let i = 0; i < 5000; i++) {
      validateImageUrl(urls[i % urls.length]);
    }
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });
});

describe('Performance - Sanitization Throughput', () => {
  test('sanitizeHtml handles 1,000 calls in < 200ms', () => {
    const inputs = [
      'Normal text',
      '<script>alert(1)</script>',
      'Makan siang di <b>cafe</b>',
      '<img src=x onerror="xss()">',
      'Pengeluaran bulan Agustus 2026'
    ];
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      sanitizeHtml(inputs[i % inputs.length]);
    }
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(200);
  });
});

describe('Performance - Timestamp Processing', () => {
  test('normalizeTimestamp handles 10,000 calls in < 200ms', () => {
    const timestamps = [
      new Date(),
      '2026-08-10T14:30:00Z',
      Date.now(),
      null,
      { toDate: () => new Date() }
    ];
    const start = Date.now();
    for (let i = 0; i < 10000; i++) {
      normalizeTimestamp(timestamps[i % timestamps.length]);
    }
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(200);
  });
});

describe('Performance - Currency Formatting', () => {
  test('formatCurrency handles 5,000 calls in < 500ms', () => {
    const amounts = [50000, 1000000, 75000, 500000, 1];
    const start = Date.now();
    for (let i = 0; i < 5000; i++) {
      formatCurrency(amounts[i % amounts.length]);
    }
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });
});

describe('Performance - Large Dataset Operations', () => {
  test('generates 1,000 mock expenses in < 500ms', () => {
    const start = Date.now();
    const expenses = generateMockExpenses(1000);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
    expect(expenses).toHaveLength(1000);
  });

  test('calculates total of 1,000 expenses in < 50ms', () => {
    const expenses = generateMockExpenses(1000);
    const start = Date.now();
    const total = calculateTotal(expenses);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(50);
    expect(total).toBeGreaterThan(0);
  });

  test('sorts 1,000 expenses by date in < 100ms', () => {
    const expenses = generateMockExpenses(1000);
    const start = Date.now();
    sortByDateDesc(expenses);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });

  test('filters 1,000 expenses by status in < 50ms', () => {
    const expenses = generateMockExpenses(1000);
    const start = Date.now();
    filterByStatus(expenses, 'pending');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(50);
  });

  test('filters 1,000 expenses by month in < 50ms', () => {
    const expenses = generateMockExpenses(1000);
    const start = Date.now();
    filterByMonth(expenses, '2026-08');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(50);
  });
});

describe('Performance - Expense Creation Throughput', () => {
  test('creates 100 expenses with validation in < 100ms', () => {
    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      createExpense({
        userId: `user-${i}`,
        businessId: 'biz-1',
        amount: (i + 1) * 10000,
        category: VALID_CATEGORIES[i % VALID_CATEGORIES.length]
      });
    }
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });
});

describe('Performance - Sync Queue Operations', () => {
  test('queues 1,000 items in < 50ms', () => {
    const queue = new SyncQueue();
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      queue.add({ amount: i * 1000, category: 'Operasional' });
    }
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(50);
    expect(queue.size()).toBe(1000);
  });

  test('processes 1,000 queued items in < 100ms', () => {
    const queue = new SyncQueue();
    for (let i = 0; i < 1000; i++) {
      queue.add({ amount: (i + 1) * 1000, category: 'Operasional' });
    }
    const start = Date.now();
    queue.process(item => ({ ...item, synced: true }));
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });
});
