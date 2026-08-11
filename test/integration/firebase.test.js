/**
 * Integration Tests: Firebase Firestore (mocked)
 * Tests data flow, query logic, and role-based filtering
 * Uses in-memory mock - does not hit real Firebase
 */

const {
  createExpense,
  canAccessExpense,
  calculateTotal,
  filterByStatus,
  filterByUser,
  filterByMonth,
  sortByDateDesc,
  generateMockExpenses,
  normalizeTimestamp,
  createMockFirebaseTimestamp,
  VALID_CATEGORIES
} = require('../helpers/functions');

// ==================== Mock Firestore ====================
class MockFirestore {
  constructor() {
    this._collections = {};
  }

  collection(name) {
    if (!this._collections[name]) {
      this._collections[name] = [];
    }
    return new MockCollection(this._collections[name]);
  }
}

class MockCollection {
  constructor(data) {
    this._data = data;
    this._filters = [];
    this._orderByField = null;
    this._limitCount = null;
  }

  add(doc) {
    const id = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const entry = { id, ...doc };
    this._data.push(entry);
    return Promise.resolve({ id, get: () => Promise.resolve({ data: () => entry }) });
  }

  where(field, op, value) {
    const clone = new MockCollection(this._data);
    clone._filters = [...this._filters, { field, op, value }];
    clone._orderByField = this._orderByField;
    clone._limitCount = this._limitCount;
    return clone;
  }

  orderBy(field) {
    const clone = new MockCollection(this._data);
    clone._filters = [...this._filters];
    clone._orderByField = field;
    clone._limitCount = this._limitCount;
    return clone;
  }

  limit(n) {
    const clone = new MockCollection(this._data);
    clone._filters = [...this._filters];
    clone._orderByField = this._orderByField;
    clone._limitCount = n;
    return clone;
  }

  get() {
    let results = this._data.filter(doc => {
      return this._filters.every(({ field, op, value }) => {
        switch (op) {
          case '==': return doc[field] === value;
          case '>': return doc[field] > value;
          case '<': return doc[field] < value;
          case '>=': return doc[field] >= value;
          case '<=': return doc[field] <= value;
          default: return true;
        }
      });
    });

    if (this._orderByField) {
      const field = this._orderByField;
      results = results.sort((a, b) =>
        new Date(b[field]) - new Date(a[field])
      );
    }

    if (this._limitCount) {
      results = results.slice(0, this._limitCount);
    }

    return Promise.resolve({
      size: results.length,
      docs: results.map(doc => ({ id: doc.id, data: () => doc })),
      empty: results.length === 0
    });
  }
}

// ==================== Tests ====================

describe('Firebase Integration - Expense CRUD', () => {
  let db;
  const testBusinessId = 'biz-test-1';

  beforeEach(() => {
    db = new MockFirestore();
  });

  test('creates expense and returns document ID', async () => {
    const expense = {
      userId: 'user-1',
      businessId: testBusinessId,
      amount: 50000,
      category: 'Makan & Minum',
      note: 'Lunch meeting',
      createdAt: new Date().toISOString(),
      status: 'approved'
    };

    const docRef = await db.collection('expenses').add(expense);
    expect(docRef.id).toBeDefined();
    expect(typeof docRef.id).toBe('string');
  });

  test('reads back expense data correctly', async () => {
    const expense = {
      userId: 'user-1',
      businessId: testBusinessId,
      amount: 75000,
      category: 'Transportasi',
      status: 'pending'
    };

    const docRef = await db.collection('expenses').add(expense);
    const doc = await docRef.get();
    expect(doc.data().amount).toBe(75000);
    expect(doc.data().category).toBe('Transportasi');
  });

  test('queries expenses by businessId', async () => {
    const expenses = [
      { userId: 'u1', businessId: testBusinessId, amount: 50000, createdAt: new Date().toISOString(), status: 'approved' },
      { userId: 'u2', businessId: testBusinessId, amount: 30000, createdAt: new Date().toISOString(), status: 'pending' },
      { userId: 'u3', businessId: 'other-biz', amount: 10000, createdAt: new Date().toISOString(), status: 'approved' }
    ];

    for (const exp of expenses) {
      await db.collection('expenses').add(exp);
    }

    const snapshot = await db.collection('expenses')
      .where('businessId', '==', testBusinessId)
      .get();

    expect(snapshot.size).toBe(2);
  });

  test('queries expenses by status', async () => {
    const expenses = [
      { userId: 'u1', businessId: testBusinessId, amount: 50000, createdAt: new Date().toISOString(), status: 'approved' },
      { userId: 'u2', businessId: testBusinessId, amount: 30000, createdAt: new Date().toISOString(), status: 'pending' },
      { userId: 'u3', businessId: testBusinessId, amount: 20000, createdAt: new Date().toISOString(), status: 'pending' }
    ];

    for (const exp of expenses) {
      await db.collection('expenses').add(exp);
    }

    const pendingSnapshot = await db.collection('expenses')
      .where('businessId', '==', testBusinessId)
      .where('status', '==', 'pending')
      .get();

    expect(pendingSnapshot.size).toBe(2);
    pendingSnapshot.docs.forEach(doc => {
      expect(doc.data().status).toBe('pending');
    });
  });

  test('owner sees more expenses than karyawan', async () => {
    const expenses = generateMockExpenses(10);

    // Verify logic: owner query (all from business) returns more than single user query
    const ownerDocs = filterByStatus(expenses, 'approved').length + filterByStatus(expenses, 'pending').length;
    const karyawanDocs = filterByUser(expenses, 'user-0').length;

    expect(ownerDocs).toBeGreaterThanOrEqual(karyawanDocs);
  });

  test('expense totals calculate correctly', async () => {
    const expenses = [
      { amount: 50000, status: 'approved' },
      { amount: 30000, status: 'approved' },
      { amount: 75000, status: 'pending' }
    ];

    const approvedOnly = expenses.filter(e => e.status === 'approved');
    const total = calculateTotal(approvedOnly);

    expect(total).toBe(80000);
  });
});

describe('Firebase Integration - Timestamp Handling', () => {
  test('Firebase Timestamp converts to ISO string', () => {
    const mockTs = createMockFirebaseTimestamp(new Date('2026-08-10T12:00:00Z'));
    const iso = normalizeTimestamp(mockTs);
    expect(iso).toContain('2026-08-10');
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('regular Date object normalizes correctly', () => {
    const date = new Date('2026-08-11T00:00:00Z');
    expect(normalizeTimestamp(date)).toContain('2026-08-11');
  });

  test('sorts expenses by createdAt descending', () => {
    const expenses = [
      { id: '1', createdAt: '2026-08-01T10:00:00Z' },
      { id: '2', createdAt: '2026-08-10T10:00:00Z' },
      { id: '3', createdAt: '2026-08-05T10:00:00Z' }
    ];

    const sorted = sortByDateDesc(expenses);
    expect(sorted[0].id).toBe('2'); // newest first
    expect(sorted[2].id).toBe('1'); // oldest last
  });

  test('filters expenses by month', () => {
    const expenses = [
      { createdAt: '2026-08-01T00:00:00Z', amount: 50000 },
      { createdAt: '2026-08-15T00:00:00Z', amount: 30000 },
      { createdAt: '2026-07-20T00:00:00Z', amount: 20000 }
    ];

    const augustExpenses = filterByMonth(expenses, '2026-08');
    expect(augustExpenses).toHaveLength(2);
    expect(calculateTotal(augustExpenses)).toBe(80000);
  });
});

describe('Firebase Integration - Data Validation', () => {
  test('expense creation validates all required fields', () => {
    const validResult = createExpense({
      userId: 'user-1',
      businessId: 'biz-1',
      amount: 50000,
      category: 'Operasional'
    });
    expect(validResult.success).toBe(true);
  });

  test('expense category must be from valid list', () => {
    const invalidResult = createExpense({
      userId: 'user-1',
      businessId: 'biz-1',
      amount: 50000,
      category: 'InvalidCategory'
    });
    expect(invalidResult.success).toBe(false);
  });

  test('all created expenses have auto-generated IDs', () => {
    const results = VALID_CATEGORIES.map(cat =>
      createExpense({
        userId: 'user-1',
        businessId: 'biz-1',
        amount: 50000,
        category: cat
      })
    );

    results.forEach(result => {
      expect(result.success).toBe(true);
      expect(result.expense.id).toBeDefined();
    });

    // IDs should be unique
    const ids = results.map(r => r.expense.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
