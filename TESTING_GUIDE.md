# 🧪 Advanced Testing Guide
**Expense Tracker Pro - Comprehensive Test Suite**

---

## 📋 **Testing Overview**

This guide covers:
- ✅ **Unit Tests** - Individual functions & validation
- ✅ **Integration Tests** - Firebase, offline sync, data flow
- ✅ **E2E Tests** - Complete user workflows
- ✅ **Security Tests** - Input validation, XSS prevention
- ✅ **Performance Tests** - Load handling, OCR speed
- ✅ **Mobile Tests** - Responsive, touch interactions

---

## 🎯 **Test Scenarios by User Role**

### **Owner Tests**
```
1. Login dengan valid credentials
   ✓ Email: owner.test3@expensetracker.test
   ✓ Password: TestPass123x
   ✓ Expected: Dashboard loaded dengan data existing

2. Submit pengeluaran Rp50.000
   ✓ Category: Makan & Minum
   ✓ Note: Makan siang tim
   ✓ Photo: Upload receipt image
   ✓ Expected: Appears di riwayat with "Approved" status

3. View Laporan (Report)
   ✓ Filter by month
   ✓ Export as PDF
   ✓ Expected: Correct totals (Pengeluaran Owner + Reimburse Karyawan)

4. Approve employee expense
   ✓ Click "Setuju" on karyawan's expense
   ✓ Expected: Status changes to "Approved"

5. Manage employees
   ✓ Share invitation code
   ✓ Remove employee
   ✓ Expected: Code works for new registration
```

### **Employee (Karyawan) Tests**
```
1. Register dengan invitation code
   ✓ Email: karyawan.test@expensetracker.test
   ✓ Password: TestPass123
   ✓ Invitation Code: F5QZS3 (or actual code)
   ✓ Expected: Account created & linked to business

2. Submit reimbursement request
   ✓ Amount: Rp75.000
   ✓ Category: Transportasi
   ✓ Photo: Receipt image
   ✓ Expected: Awaiting owner approval

3. View personal expenses
   ✓ Only sees own expenses + approved reimbursements
   ✓ Cannot see other employees' expenses
   ✓ Expected: Correct data isolation

4. View Stok (Inventory)
   ✓ Sees only shared inventory (read-only)
   ✓ Expected: Cannot edit
```

---

## 🔬 **Unit Tests**

### **1. Input Validation Tests**

```javascript
// test/validators.test.js

describe('Input Validators', () => {
  
  test('validateAmount - valid inputs', () => {
    expect(validateAmount(50000)).toBe(true);
    expect(validateAmount(1)).toBe(true);
    expect(validateAmount(1000000000)).toBe(true);
  });

  test('validateAmount - invalid inputs', () => {
    expect(validateAmount(0)).toBe(false);
    expect(validateAmount(-100)).toBe(false);
    expect(validateAmount(1000000001)).toBe(false); // Exceeds max
    expect(validateAmount('abc')).toBe(false);
    expect(validateAmount(null)).toBe(false);
  });

  test('validateEmail - valid emails', () => {
    expect(validateEmail('owner.test3@expensetracker.test')).toBe(true);
    expect(validateEmail('user@example.com')).toBe(true);
  });

  test('validateEmail - invalid emails', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
    expect(validateEmail('a'.repeat(300) + '@test.com')).toBe(false); // Too long
  });

  test('validateCategory - valid categories', () => {
    const validCats = ['Makan & Minum', 'Transportasi', 'Operasional', 'Pembelian Barang', 'Lainnya'];
    validCats.forEach(cat => {
      expect(validateCategory(cat)).toBe(true);
    });
  });

  test('validateCategory - invalid category', () => {
    expect(validateCategory('Hacking')).toBe(false);
    expect(validateCategory('')).toBe(false);
  });

  test('validateImageUrl - valid URLs', () => {
    expect(validateImageUrl('https://example.com/image.jpg')).toBe(true);
    expect(validateImageUrl('http://cdn.example.com/pic.png')).toBe(true);
    expect(validateImageUrl('data:image/jpeg;base64,...')).toBe(true);
  });

  test('validateImageUrl - invalid URLs', () => {
    expect(validateImageUrl('javascript:alert("xss")')).toBe(false);
    expect(validateImageUrl('ftp://example.com/image.jpg')).toBe(false);
    expect(validateImageUrl('file:///etc/passwd')).toBe(false);
    expect(validateImageUrl('')).toBe(false);
  });

});
```

### **2. Sanitization Tests**

```javascript
describe('HTML Sanitization', () => {
  
  test('sanitizeHtml - removes scripts', () => {
    const input = 'Hello <script>alert("xss")</script> World';
    const expected = 'Hello  World';
    expect(sanitizeHtml(input)).toBe(expected);
  });

  test('sanitizeHtml - escapes dangerous characters', () => {
    const input = 'Test<img src=x onerror="alert(1)">';
    expect(sanitizeHtml(input)).not.toContain('onerror');
  });

  test('sanitizeHtml - preserves normal text', () => {
    const input = 'Makan siang di Cafe Baru';
    expect(sanitizeHtml(input)).toBe(input);
  });

});
```

### **3. Timestamp Normalization Tests**

```javascript
describe('Timestamp Normalization', () => {

  test('normalizeTimestamp - from Firebase Timestamp', () => {
    const firebaseTs = new firebase.firestore.Timestamp(1691700000, 0);
    const result = normalizeTimestamp(firebaseTs);
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
  });

  test('normalizeTimestamp - from ISO string', () => {
    const isoStr = '2026-08-10T14:30:00Z';
    const result = normalizeTimestamp(isoStr);
    expect(result).toBe(isoStr);
  });

  test('normalizeTimestamp - from Date object', () => {
    const date = new Date('2026-08-10T14:30:00Z');
    const result = normalizeTimestamp(date);
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('normalizeTimestamp - from number (milliseconds)', () => {
    const ms = 1691700000000;
    const result = normalizeTimestamp(ms);
    expect(typeof result).toBe('string');
  });

  test('normalizeTimestamp - null/undefined returns current ISO', () => {
    const result1 = normalizeTimestamp(null);
    const result2 = normalizeTimestamp(undefined);
    expect(result1).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result2).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

});
```

---

## 🔗 **Integration Tests**

### **Firebase Integration**

```javascript
// test/firebase.integration.test.js

describe('Firebase Integration', () => {

  beforeAll(async () => {
    // Initialize Firebase test project
    initializeFirebase();
  });

  test('Create expense in Firestore', async () => {
    const expense = {
      userId: 'test-user-1',
      amount: 50000,
      category: 'Makan & Minum',
      note: 'Lunch meeting',
      createdAt: new Date().toISOString(),
      status: 'approved'
    };

    const docRef = await db.collection('expenses').add(expense);
    expect(docRef.id).toBeDefined();

    // Verify data written correctly
    const doc = await docRef.get();
    expect(doc.data().amount).toBe(50000);
  });

  test('Query expenses by month', async () => {
    const month = '2026-08';
    const query = db.collection('expenses')
      .where('month', '==', month)
      .orderBy('createdAt', 'desc');

    const snapshot = await query.get();
    expect(snapshot.size).toBeGreaterThan(0);
    
    // Verify sorting order
    let prevDate = new Date();
    snapshot.docs.forEach(doc => {
      const currDate = new Date(doc.data().createdAt);
      expect(currDate <= prevDate).toBe(true);
      prevDate = currDate;
    });
  });

  test('Role-based access control', async () => {
    // Owner should see all expenses
    const ownerQuery = db.collection('expenses')
      .where('businessId', '==', 'test-business');
    
    // Employee should only see own expenses
    const empQuery = db.collection('expenses')
      .where('userId', '==', 'karyawan-1')
      .where('businessId', '==', 'test-business');

    const ownerDocs = await ownerQuery.get();
    const empDocs = await empQuery.get();

    expect(ownerDocs.size).toBeGreaterThanOrEqual(empDocs.size);
  });

});
```

### **Offline Sync Tests**

```javascript
describe('Offline Sync Queue', () => {

  test('Save expense to sync queue when offline', async () => {
    const expense = {
      amount: 50000,
      category: 'Makan & Minum',
      note: 'Test offline'
    };

    // Simulate offline by disabling Firebase
    await disableFirebase();
    
    await submitExpense(expense);
    
    // Verify saved to IndexedDB sync queue
    const queue = await getFromIndexedDB('syncQueue');
    expect(queue.length).toBeGreaterThan(0);
    expect(queue[0]).toMatchObject(expense);
  });

  test('Sync queued expenses when online', async () => {
    await enableFirebase();
    
    const syncedCount = await syncQueuedExpenses();
    expect(syncedCount).toBeGreaterThan(0);
    
    // Verify sync queue emptied
    const queue = await getFromIndexedDB('syncQueue');
    expect(queue.length).toBe(0);
  });

});
```

---

## 🔐 **Security Tests**

### **XSS Prevention**

```javascript
describe('XSS Prevention', () => {

  test('Script injection in note field', () => {
    const malicious = '<img src=x onerror="alert(1)">';
    const result = sanitizeHtml(malicious);
    
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('javascript:');
  });

  test('Photo URL XSS prevention', () => {
    const maliciousUrl = 'javascript:alert("xss")';
    const isValid = validateImageUrl(maliciousUrl);
    
    expect(isValid).toBe(false);
  });

  test('Data attribute XSS', () => {
    const malicious = '<div data-xss="test" onclick="alert(1)">Click me</div>';
    const result = sanitizeHtml(malicious);
    
    expect(result).not.toContain('onclick');
  });

});
```

### **Authentication Tests**

```javascript
describe('Authentication Security', () => {

  test('Invalid credentials rejected', async () => {
    const result = await login('wrong@email.com', 'WrongPassword123');
    expect(result.error).toBeDefined();
  });

  test('Password minimum length enforced', async () => {
    const result = await register('user@test.com', 'short', 'owner');
    expect(result.error).toContain('password');
  });

  test('Invitation code verification', async () => {
    const validCode = await verifyInvitationCode('F5QZS3');
    const invalidCode = await verifyInvitationCode('INVALID123');
    
    expect(validCode.valid).toBe(true);
    expect(invalidCode.valid).toBe(false);
  });

});
```

---

## 📊 **E2E Tests** (User Workflows)

### **Test Case 1: Complete Owner Workflow**

```gherkin
Feature: Owner Full Workflow

  Scenario: Owner submits expense and views report
    Given owner.test3@expensetracker.test logged in
    When owner submits Rp50.000 expense
      And selects category "Makan & Minum"
      And uploads receipt photo
      And clicks "Kirim"
    Then expense appears in riwayat with "Approved" status
    
    When owner opens "Laporan"
    Then sees "Pengeluaran Owner: Rp50,000"
    
    When owner exports report as PDF
    Then PDF file downloaded successfully
```

### **Test Case 2: Employee Reimbursement Workflow**

```gherkin
Feature: Employee Reimbursement

  Scenario: Employee requests reimbursement, owner approves
    Given employee karyawan.test@expensetracker.test logged in
    When employee submits Rp75.000 reimbursement request
      And selects category "Transportasi"
      And uploads receipt photo
      And clicks "Kirim"
    Then expense appears as "Pending" status
    
    When owner logs in and views karyawan expenses
    Then sees pending expense with "Setuju/Tolak" buttons
    
    When owner clicks "Setuju"
    Then expense status changes to "Approved"
    And karyawan sees updated status
```

### **Test Case 3: Offline Submission**

```gherkin
Feature: Offline Expense Submission

  Scenario: Submit expense while offline
    Given app is offline (network disabled)
    When user submits Rp30.000 expense
    Then sees "⏳ Offline - Perubahan akan disimpan"
    
    When network comes back online
    Then sync indicator shows "Syncing..."
    And expense auto-submits to Firebase
    And "Synced successfully" message appears
```

---

## ⚡ **Performance Tests**

### **Load Testing**

```javascript
// test/performance.test.js

describe('Performance Benchmarks', () => {

  test('OCR processing time < 3 seconds', async () => {
    const imageFile = new File([...], 'receipt.jpg');
    const startTime = performance.now();
    
    const result = await runOCR(imageFile);
    
    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(3000); // 3 seconds
  });

  test('Render 1000 expenses in riwayat < 2 seconds', async () => {
    const expenses = generateMockExpenses(1000);
    
    const startTime = performance.now();
    renderExpenseList(expenses);
    const duration = performance.now() - startTime;
    
    expect(duration).toBeLessThan(2000); // 2 seconds
  });

  test('Generate PDF with 500 expenses < 5 seconds', async () => {
    const expenses = generateMockExpenses(500);
    
    const startTime = performance.now();
    const pdf = await generateReport(expenses);
    const duration = performance.now() - startTime;
    
    expect(duration).toBeLessThan(5000); // 5 seconds
  });

  test('Firebase query response < 1 second', async () => {
    const startTime = performance.now();
    
    const snapshot = await db.collection('expenses')
      .where('businessId', '==', 'test-business')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    
    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(1000); // 1 second
  });

});
```

---

## 📱 **Mobile & Responsive Tests**

```javascript
describe('Mobile Responsiveness', () => {

  test('Touch interactions work on mobile', async () => {
    // Simulate mobile viewport
    window.innerWidth = 375;
    window.innerHeight = 667;
    
    const addButton = document.querySelector('#btn-tambah');
    addButton.dispatchEvent(new TouchEvent('touchend'));
    
    expect(addForm.style.display).not.toBe('none');
  });

  test('Keyboard doesn\'t hide important UI', async () => {
    // Simulate mobile keyboard showing (50% height)
    const inputField = document.querySelector('input[type="number"]');
    inputField.focus();
    
    window.innerHeight = 333.5; // Simulated with keyboard
    
    const form = document.querySelector('#expense-form');
    const formRect = form.getBoundingClientRect();
    
    expect(formRect.bottom).toBeLessThan(window.innerHeight);
  });

  test('Images load with appropriate sizes', async () => {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      expect(img.naturalWidth).toBeGreaterThan(0);
      expect(img.naturalHeight).toBeGreaterThan(0);
    });
  });

});
```

---

## 🧬 **Data Integrity Tests**

```javascript
describe('Data Integrity', () => {

  test('Expense amounts calculated correctly', async () => {
    const expenses = [
      { amount: 50000, status: 'approved' },
      { amount: 75000, status: 'approved' },
      { amount: 25000, status: 'approved' }
    ];

    const total = calculateTotal(expenses);
    expect(total).toBe(150000);
  });

  test('Monthly summary accuracy', async () => {
    const expenses = await getExpensesByMonth('2026-08');
    const summary = generateMonthlySummary(expenses);

    let manualTotal = 0;
    expenses.forEach(exp => {
      if (exp.status === 'approved') {
        manualTotal += exp.amount;
      }
    });

    expect(summary.total).toBe(manualTotal);
  });

  test('No duplicate expenses after sync', async () => {
    const expenseId = 'expense-123';
    
    // Simulate sync with network hiccup
    await submitExpense({ id: expenseId });
    await submitExpense({ id: expenseId }); // Retry
    
    const docs = await db.collection('expenses')
      .where('id', '==', expenseId)
      .get();

    expect(docs.size).toBe(1);
  });

});
```

---

## ✅ **Pre-Release Testing Checklist**

### **Functional Testing**
- [ ] Login/Registration flow works
- [ ] Submit expense with photo (owner)
- [ ] Submit reimbursement (employee)
- [ ] Approve/Reject expenses (owner only)
- [ ] View reports with correct totals
- [ ] Export PDF without errors
- [ ] Offline mode saves data
- [ ] Online sync completes successfully

### **Security Testing**
- [ ] No XSS vulnerabilities in form inputs
- [ ] Firebase config not exposed in localStorage
- [ ] Invitation codes validated properly
- [ ] Role-based access enforced
- [ ] All API responses validated
- [ ] No console errors/warnings

### **Performance Testing**
- [ ] Page load < 2 seconds
- [ ] OCR processing < 3 seconds
- [ ] Rendering 1000+ items responsive
- [ ] PDF generation doesn't freeze UI
- [ ] No memory leaks on open/close

### **Mobile Testing**
- [ ] Works on iOS Safari (iPhone 12+)
- [ ] Works on Android Chrome
- [ ] Touch interactions responsive
- [ ] Forms usable with keyboard open
- [ ] Images load correctly

### **Data Integrity**
- [ ] Amounts calculated correctly
- [ ] Timestamps consistent
- [ ] No data loss on offline/online switch
- [ ] PDF exports match screen data
- [ ] Monthly summaries accurate

---

## 🚀 **Running Tests**

```bash
# Install dependencies
npm install --save-dev jest @testing-library/html

# Run all tests
npm test

# Run specific test suite
npm test -- validators.test.js

# Run with coverage report
npm test -- --coverage

# Watch mode for development
npm test -- --watch

# Generate HTML coverage report
npm test -- --coverage --coverage-providers=v8
# Open coverage/index.html in browser
```

---

## 📊 **Coverage Goals**

```
Statements   : 85% or higher
Branches     : 80% or higher
Functions    : 85% or higher
Lines        : 85% or higher
```

---

**Status:** Ready for implementation  
**Next Step:** Deploy secured version + run test suite
