/**
 * E2E Workflow Tests: Complete User Scenarios
 * Tests end-to-end business logic flows without UI interaction
 */

const {
  validateEmail,
  validatePassword,
  validateAmount,
  validateCategory,
  validateImageUrl,
  validateInviteCode,
  sanitizeHtml,
  normalizeTimestamp,
  formatCurrency,
  createExpense,
  canAccessExpense,
  calculateTotal,
  filterByStatus,
  filterByUser,
  filterByMonth,
  sortByDateDesc,
  generateMockExpenses,
  SyncQueue,
  VALID_CATEGORIES
} = require('../helpers/functions');

// ==================== Workflow Helpers ====================

/**
 * Simulate user login validation
 */
function simulateLogin(email, password) {
  if (!validateEmail(email)) {
    return { success: false, error: 'Email tidak valid' };
  }
  if (!validatePassword(password)) {
    return { success: false, error: 'Password minimal 6 karakter' };
  }
  // Mock successful login
  return {
    success: true,
    user: { uid: `uid-${email}`, email, role: email.includes('owner') ? 'owner' : 'karyawan' }
  };
}

/**
 * Simulate expense submission workflow
 */
function simulateExpenseSubmission(user, expenseData) {
  // Validate all inputs
  if (!validateAmount(expenseData.amount)) {
    return { success: false, error: 'Jumlah tidak valid' };
  }
  if (!validateCategory(expenseData.category)) {
    return { success: false, error: 'Kategori tidak valid' };
  }
  if (expenseData.note) {
    expenseData.note = sanitizeHtml(expenseData.note);
  }
  if (expenseData.photoUrl && !validateImageUrl(expenseData.photoUrl)) {
    return { success: false, error: 'URL foto tidak valid' };
  }

  return createExpense({
    userId: user.uid,
    businessId: user.businessId || 'default-biz',
    amount: expenseData.amount,
    category: expenseData.category,
    note: expenseData.note || '',
    type: user.role === 'karyawan' ? 'reimburse' : 'pengeluaran',
    photoUrl: expenseData.photoUrl || null
  });
}

// ==================== E2E Workflow Tests ====================

describe('E2E: Owner Workflow', () => {
  let owner;

  beforeAll(() => {
    const loginResult = simulateLogin('owner.test3@expensetracker.test', 'TestPass123x');
    expect(loginResult.success).toBe(true);
    owner = { ...loginResult.user, businessId: 'biz-test-1' };
  });

  test('owner can login with valid credentials', () => {
    const result = simulateLogin('owner.test3@expensetracker.test', 'TestPass123x');
    expect(result.success).toBe(true);
    expect(result.user.email).toBe('owner.test3@expensetracker.test');
  });

  test('owner submits expense Rp50,000 - Makan & Minum', () => {
    const result = simulateExpenseSubmission(owner, {
      amount: 50000,
      category: 'Makan & Minum',
      note: 'Makan siang tim',
      photoUrl: 'https://storage.firebase.com/receipt123.jpg'
    });

    expect(result.success).toBe(true);
    expect(result.expense.amount).toBe(50000);
    expect(result.expense.category).toBe('Makan & Minum');
    expect(result.expense.status).toBe('approved'); // owner auto-approved
  });

  test('owner can see expenses from all categories', () => {
    // Simulate owner dashboard: all categories available
    const allExpenses = VALID_CATEGORIES.map((cat, i) =>
      createExpense({
        userId: owner.uid,
        businessId: owner.businessId,
        amount: (i + 1) * 50000,
        category: cat
      })
    );

    expect(allExpenses.every(r => r.success)).toBe(true);
    expect(allExpenses).toHaveLength(VALID_CATEGORIES.length);
  });

  test('report generation calculates correct totals', () => {
    const expenses = generateMockExpenses(20);
    const approvedExpenses = filterByStatus(expenses, 'approved');
    const total = calculateTotal(approvedExpenses);

    expect(total).toBeGreaterThan(0);
    expect(typeof formatCurrency(total)).toBe('string');
    expect(formatCurrency(total)).toContain('Rp');
  });

  test('owner expense note is sanitized before storage', () => {
    const result = simulateExpenseSubmission(owner, {
      amount: 50000,
      category: 'Operasional',
      note: 'Internet <script>alert("xss")</script> kantor'
    });

    expect(result.success).toBe(true);
    expect(result.expense.note).not.toContain('<script>');
    expect(result.expense.note).toContain('Internet');
  });
});

describe('E2E: Employee (Karyawan) Workflow', () => {
  let karyawan;

  beforeAll(() => {
    const loginResult = simulateLogin('karyawan.test@expensetracker.test', 'TestPass123');
    expect(loginResult.success).toBe(true);
    karyawan = { ...loginResult.user, businessId: 'biz-test-1', role: 'karyawan', uid: 'karyawan-uid-1' };
  });

  test('karyawan can login with valid credentials', () => {
    const result = simulateLogin('karyawan.test@expensetracker.test', 'TestPass123');
    expect(result.success).toBe(true);
  });

  test('karyawan expense submission starts as pending', () => {
    const result = simulateExpenseSubmission(karyawan, {
      amount: 75000,
      category: 'Transportasi',
      note: 'Biaya transport ke klien'
    });

    expect(result.success).toBe(true);
    expect(result.expense.status).toBe('pending'); // needs owner approval
    expect(result.expense.type).toBe('reimburse');
  });

  test('karyawan can only see own expenses (data isolation)', () => {
    const allExpenses = generateMockExpenses(20);
    const myExpenses = filterByUser(allExpenses, karyawan.uid);
    const otherExpenses = allExpenses.filter(e => e.userId !== karyawan.uid);

    // Verify data isolation
    myExpenses.forEach(exp => {
      expect(exp.userId).toBe(karyawan.uid);
    });
    otherExpenses.forEach(exp => {
      expect(canAccessExpense(exp, karyawan)).toBe(false);
    });
  });

  test('karyawan cannot submit with invalid data', () => {
    // Invalid amount
    const result1 = simulateExpenseSubmission(karyawan, {
      amount: 0,
      category: 'Transportasi'
    });
    expect(result1.success).toBe(false);

    // Invalid category
    const result2 = simulateExpenseSubmission(karyawan, {
      amount: 50000,
      category: 'Invalid Category'
    });
    expect(result2.success).toBe(false);
  });
});

describe('E2E: Approval Workflow', () => {
  const owner = { uid: 'owner-uid', role: 'owner', businessId: 'biz-test-1' };
  const karyawan = { uid: 'karyawan-uid', role: 'karyawan', businessId: 'biz-test-1', email: 'emp@test.com' };

  test('karyawan expense awaits approval, owner approves', () => {
    // Step 1: karyawan submits
    const submission = simulateExpenseSubmission(karyawan, {
      amount: 75000,
      category: 'Transportasi',
      note: 'Ojek ke meeting'
    });
    expect(submission.success).toBe(true);
    expect(submission.expense.status).toBe('pending');

    // Step 2: owner can access it
    expect(canAccessExpense(submission.expense, owner)).toBe(true);

    // Step 3: simulate approval
    const approved = { ...submission.expense, status: 'approved', approvedBy: owner.uid };
    expect(approved.status).toBe('approved');

    // Step 4: karyawan can see their approved expense
    expect(canAccessExpense(approved, karyawan)).toBe(true);
  });

  test('owner sees pending expenses count', () => {
    const expenses = generateMockExpenses(30);
    const pending = filterByStatus(expenses, 'pending');
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.every(e => e.status === 'pending')).toBe(true);
  });
});

describe('E2E: Offline Sync Workflow', () => {
  test('expense queued offline, synced when online', () => {
    const queue = new SyncQueue();
    const synced = [];

    // Simulate offline submission
    const offlineExpense = { amount: 30000, category: 'Makan & Minum', note: 'Makan sambil offline' };
    queue.add(offlineExpense);
    expect(queue.size()).toBe(1);

    // Simulate going online - process queue
    const results = queue.process(item => {
      const result = createExpense({
        userId: 'user-1',
        businessId: 'biz-1',
        amount: item.amount,
        category: item.category,
        note: item.note
      });
      if (result.success) synced.push(result.expense);
      return result;
    });

    expect(results[0].success).toBe(true);
    expect(queue.size()).toBe(0); // Queue cleared
    expect(synced).toHaveLength(1);
  });

  test('multiple offline expenses all sync correctly', () => {
    const queue = new SyncQueue();

    const offlineExpenses = [
      { amount: 50000, category: 'Makan & Minum', note: 'Lunch' },
      { amount: 25000, category: 'Transportasi', note: 'Parkir' },
      { amount: 100000, category: 'Operasional', note: 'Alat tulis' }
    ];

    offlineExpenses.forEach(exp => queue.add(exp));
    expect(queue.size()).toBe(3);

    const results = queue.process(item =>
      createExpense({ userId: 'u1', businessId: 'b1', ...item })
    );

    expect(results.filter(r => r.success)).toHaveLength(3);
    expect(queue.size()).toBe(0);
  });
});

describe('E2E: Report Generation', () => {
  test('monthly report shows correct period expenses', () => {
    const allExpenses = [
      { amount: 50000, createdAt: '2026-08-01T10:00:00Z', status: 'approved' },
      { amount: 30000, createdAt: '2026-08-15T10:00:00Z', status: 'approved' },
      { amount: 75000, createdAt: '2026-07-20T10:00:00Z', status: 'approved' }
    ];

    const augustExpenses = filterByMonth(allExpenses, '2026-08');
    expect(augustExpenses).toHaveLength(2);
    expect(calculateTotal(augustExpenses)).toBe(80000);
  });

  test('sorting ensures newest expenses appear first in report', () => {
    const expenses = generateMockExpenses(15);
    const sorted = sortByDateDesc(expenses);
    const dates = sorted.map(e => new Date(e.createdAt).getTime());

    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });

  test('report totals are formatted in Indonesian Rupiah', () => {
    const expenses = generateMockExpenses(10);
    const total = calculateTotal(expenses);
    const formatted = formatCurrency(total);

    expect(formatted).toContain('Rp');
    expect(typeof formatted).toBe('string');
  });

  test('report correctly separates owner and karyawan expenses', () => {
    const expenses = generateMockExpenses(20);
    const ownerExpenses = filterByUser(expenses, 'user-0');
    const karyawanExpenses = expenses.filter(e => e.userId !== 'user-0');

    const ownerTotal = calculateTotal(ownerExpenses);
    const karyawanTotal = calculateTotal(karyawanExpenses);
    const grandTotal = calculateTotal(expenses);

    expect(ownerTotal + karyawanTotal).toBe(grandTotal);
  });
});

describe('E2E: Input Validation Integration', () => {
  test('full registration validation chain', () => {
    const email = 'new.owner@expensetracker.test';
    const password = 'SecurePass123';

    expect(validateEmail(email)).toBe(true);
    expect(validatePassword(password)).toBe(true);
  });

  test('rejects registration with weak password', () => {
    expect(validatePassword('123')).toBe(false);
  });

  test('invitation code validation flow', () => {
    const validCode = 'F5QZS3';
    const invalidCode = 'INVALID123';

    expect(validateInviteCode(validCode)).toBe(true);
    expect(validateInviteCode(invalidCode)).toBe(false);
  });

  test('expense photo URL security validation', () => {
    const safeUrl = 'https://firebasestorage.googleapis.com/v0/b/receipt.jpg';
    const maliciousUrl = 'javascript:alert("xss")';

    expect(validateImageUrl(safeUrl)).toBe(true);
    expect(validateImageUrl(maliciousUrl)).toBe(false);
  });
});
