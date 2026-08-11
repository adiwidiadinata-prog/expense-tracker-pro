/**
 * Integration Tests: Offline Sync Queue
 * Tests IndexedDB sync queue behavior using in-memory SyncQueue class
 */

const {
  SyncQueue,
  createExpense,
  validateAmount,
  VALID_CATEGORIES
} = require('../helpers/functions');

describe('Offline Sync Queue - Basic Operations', () => {
  let queue;

  beforeEach(() => {
    queue = new SyncQueue();
  });

  test('adds item to queue and returns new size', () => {
    const expense = {
      amount: 50000,
      category: 'Makan & Minum',
      note: 'Test offline'
    };
    const size = queue.add(expense);
    expect(size).toBe(1);
  });

  test('queue grows with multiple additions', () => {
    queue.add({ amount: 50000, category: 'Makan & Minum' });
    queue.add({ amount: 30000, category: 'Transportasi' });
    queue.add({ amount: 20000, category: 'Operasional' });
    expect(queue.size()).toBe(3);
  });

  test('retrieves all queued items', () => {
    const expense1 = { amount: 50000, category: 'Makan & Minum', note: 'Test 1' };
    const expense2 = { amount: 30000, category: 'Transportasi', note: 'Test 2' };

    queue.add(expense1);
    queue.add(expense2);

    const items = queue.getAll();
    expect(items).toHaveLength(2);
    expect(items[0].amount).toBe(50000);
    expect(items[1].amount).toBe(30000);
  });

  test('clears queue and returns count of processed items', () => {
    queue.add({ amount: 50000 });
    queue.add({ amount: 30000 });
    queue.add({ amount: 20000 });

    const count = queue.clear();
    expect(count).toBe(3);
    expect(queue.size()).toBe(0);
  });

  test('getAll returns empty array for empty queue', () => {
    expect(queue.getAll()).toHaveLength(0);
  });

  test('size returns 0 for empty queue', () => {
    expect(queue.size()).toBe(0);
  });
});

describe('Offline Sync Queue - Item Integrity', () => {
  let queue;

  beforeEach(() => {
    queue = new SyncQueue();
  });

  test('queued item retains original data', () => {
    const expense = {
      userId: 'user-1',
      businessId: 'biz-1',
      amount: 75000,
      category: 'Transportasi',
      note: 'Bus ticket'
    };

    queue.add(expense);
    const items = queue.getAll();
    expect(items[0].userId).toBe('user-1');
    expect(items[0].amount).toBe(75000);
    expect(items[0].note).toBe('Bus ticket');
  });

  test('queued item has _queuedAt timestamp', () => {
    queue.add({ amount: 50000 });
    const items = queue.getAll();
    expect(items[0]._queuedAt).toBeDefined();
    expect(items[0]._queuedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('adding item does not mutate original object', () => {
    const original = { amount: 50000, category: 'Makan & Minum' };
    queue.add(original);
    expect(original._queuedAt).toBeUndefined();
  });

  test('getAll returns copy, not reference', () => {
    queue.add({ amount: 50000 });
    const items1 = queue.getAll();
    const items2 = queue.getAll();
    expect(items1).not.toBe(items2); // Different array instances
    expect(items1[0]).toEqual(items2[0]); // Same data
  });
});

describe('Offline Sync Queue - Processing', () => {
  let queue;

  beforeEach(() => {
    queue = new SyncQueue();
  });

  test('processes all items and clears queue', () => {
    queue.add({ amount: 50000, category: 'Makan & Minum' });
    queue.add({ amount: 30000, category: 'Transportasi' });

    const processed = queue.process(item => ({ ...item, synced: true }));

    expect(processed).toHaveLength(2);
    expect(processed.every(p => p.synced === true)).toBe(true);
    expect(queue.size()).toBe(0); // Queue cleared after processing
  });

  test('process transforms items with provided function', () => {
    queue.add({ amount: 50000, category: 'Makan & Minum', userId: 'u1' });
    queue.add({ amount: 30000, category: 'Transportasi', userId: 'u2' });

    const processed = queue.process(item => createExpense({
      userId: item.userId || 'default',
      businessId: 'biz-1',
      amount: item.amount,
      category: item.category
    }));

    expect(processed.every(p => p.success === true)).toBe(true);
  });

  test('process on empty queue returns empty array', () => {
    const processed = queue.process(item => item);
    expect(processed).toHaveLength(0);
    expect(queue.size()).toBe(0);
  });
});

describe('Offline Sync Queue - Offline Simulation', () => {
  test('saves expenses to queue when offline (simulated)', () => {
    const queue = new SyncQueue();
    const isOnline = false;

    const submitExpense = (data) => {
      if (!isOnline) {
        queue.add(data);
        return { status: 'queued', message: '⏳ Offline - Perubahan akan disimpan' };
      }
      return { status: 'submitted' };
    };

    const result = submitExpense({ amount: 30000, category: 'Makan & Minum', note: 'Test offline' });
    expect(result.status).toBe('queued');
    expect(result.message).toContain('Offline');
    expect(queue.size()).toBe(1);
  });

  test('syncs queued items when coming back online', () => {
    const queue = new SyncQueue();
    const submitted = [];

    // Queue 3 expenses while offline
    queue.add({ amount: 50000, category: 'Makan & Minum' });
    queue.add({ amount: 30000, category: 'Transportasi' });
    queue.add({ amount: 20000, category: 'Operasional' });

    expect(queue.size()).toBe(3);

    // Simulate coming online
    const syncedCount = queue.process(item => {
      submitted.push(item);
      return { success: true, item };
    }).length;

    expect(syncedCount).toBe(3);
    expect(queue.size()).toBe(0); // Queue empty after sync
    expect(submitted).toHaveLength(3);
  });

  test('validates queued expense amounts before syncing', () => {
    const queue = new SyncQueue();
    queue.add({ amount: 50000, category: 'Makan & Minum', userId: 'u1', businessId: 'b1' });
    queue.add({ amount: -1000, category: 'Transportasi', userId: 'u1', businessId: 'b1' }); // invalid

    const results = queue.process(item =>
      createExpense({ ...item })
    );

    const validResults = results.filter(r => r.success);
    const invalidResults = results.filter(r => !r.success);

    expect(validResults).toHaveLength(1);
    expect(invalidResults).toHaveLength(1);
  });
});
