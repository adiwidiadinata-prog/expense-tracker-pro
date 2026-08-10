# 🔧 Backend API Setup Guide
**Expense Tracker Pro - Backend Architecture**

---

## 📋 **Phase 2 Backend Implementation**

### **Overview**
Backend will handle:
- ✅ Secure Firebase config storage (not in frontend)
- ✅ Payment gateway integration (Midtrans/Stripe)
- ✅ User authentication & authorization
- ✅ Data validation & encryption
- ✅ Business logic & audit logging

---

## 🏗️ **Recommended Stack**

```
Framework: Node.js + Express.js
Database: Firestore (existing) + PostgreSQL (optional)
Auth: Firebase Auth + JWT tokens
Payment: Midtrans Gateway
Hosting: Railway / Render / AWS
Environment: Docker + Docker Compose
```

---

## 📁 **Backend Folder Structure**

```
backend/
├── src/
│   ├── config/
│   │   ├── firebase.js (config management)
│   │   ├── database.js
│   │   └── payment.js
│   ├── middleware/
│   │   ├── auth.js (JWT verification)
│   │   ├── validation.js (input validation)
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── expenses.js
│   │   ├── users.js
│   │   ├── reports.js
│   │   └── payment.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── expenseController.js
│   │   ├── userController.js
│   │   ├── reportController.js
│   │   └── paymentController.js
│   ├── models/
│   │   ├── Expense.js
│   │   ├── User.js
│   │   ├── Business.js
│   │   └── Payment.js
│   ├── services/
│   │   ├── firebaseService.js
│   │   ├── encryptionService.js
│   │   ├── paymentService.js
│   │   └── emailService.js
│   ├── utils/
│   │   ├── validators.js
│   │   ├── formatters.js
│   │   └── logger.js
│   └── server.js
├── .env.example
├── .env.local (gitignore)
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── package.json
├── package-lock.json
└── README.md
```

---

## 🔐 **API Endpoints**

### **Authentication**
```
POST   /api/auth/register          (user registration)
POST   /api/auth/login             (user login)
POST   /api/auth/refresh-token     (refresh JWT)
POST   /api/auth/logout            (invalidate token)
POST   /api/auth/verify-invite     (verify invitation code)
```

### **Expenses**
```
GET    /api/expenses               (list expenses - filtered by role)
POST   /api/expenses               (create expense)
GET    /api/expenses/:id           (get expense detail)
PUT    /api/expenses/:id           (update expense)
DELETE /api/expenses/:id           (delete expense)
PUT    /api/expenses/:id/approve   (owner: approve expense)
PUT    /api/expenses/:id/reject    (owner: reject expense)
```

### **Users**
```
GET    /api/users/me               (get current user)
PUT    /api/users/me               (update profile)
GET    /api/users                  (owner only: list users)
POST   /api/users/invite           (owner: send invitation)
DELETE /api/users/:id              (owner: remove user)
```

### **Reports**
```
GET    /api/reports/summary        (owner: monthly summary)
GET    /api/reports/export/csv     (export as CSV)
GET    /api/reports/export/pdf     (export as PDF)
GET    /api/reports/analytics      (owner: analytics data)
```

### **Payment (Future)**
```
POST   /api/payment/subscription   (subscribe/upgrade)
GET    /api/payment/invoice        (get invoices)
POST   /api/payment/webhook        (payment gateway webhook)
```

---

## 🔑 **Environment Variables**

```env
# Server
PORT=3000
NODE_ENV=development
API_URL=http://localhost:3000

# Firebase
FIREBASE_API_KEY=xxxxx
FIREBASE_AUTH_DOMAIN=xxxxx
FIREBASE_PROJECT_ID=xxxxx
FIREBASE_STORAGE_BUCKET=xxxxx
FIREBASE_MESSAGING_SENDER_ID=xxxxx
FIREBASE_APP_ID=xxxxx

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRY=7d
REFRESH_TOKEN_EXPIRY=30d

# Database (if using PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_tracker
DB_USER=postgres
DB_PASSWORD=xxxxx

# Payment Gateway (Midtrans)
MIDTRANS_SERVER_KEY=xxxxx
MIDTRANS_CLIENT_KEY=xxxxx
MIDTRANS_ENV=sandbox

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=app-password

# Encryption
ENCRYPTION_KEY=your-encryption-key-32-chars
```

---

## 📦 **package.json Template**

```json
{
  "name": "expense-tracker-backend",
  "version": "1.0.0",
  "description": "Expense Tracker Pro - Backend API",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest",
    "lint": "eslint src/"
  },
  "dependencies": {
    "express": "^4.18.2",
    "firebase-admin": "^12.0.0",
    "dotenv": "^16.3.1",
    "jsonwebtoken": "^9.1.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-validator": "^7.0.0",
    "midtrans-client": "^1.3.1",
    "nodemailer": "^6.9.7",
    "winston": "^3.11.0",
    "crypto-js": "^4.2.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "eslint": "^8.54.0"
  }
}
```

---

## 🔐 **Security Best Practices**

### **1. Authentication & Authorization**
```javascript
// JWT Middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based middleware
const requireOwner = (req, res, next) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Owner only' });
  }
  next();
};
```

### **2. Input Validation**
```javascript
const { body, validationResult } = require('express-validator');

const validateExpense = [
  body('amount').isInt({ min: 1, max: 1000000000 }).withMessage('Invalid amount'),
  body('category').isIn(VALID_CATEGORIES).withMessage('Invalid category'),
  body('note').isLength({ max: 200 }).withMessage('Note too long'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
```

### **3. Data Encryption**
```javascript
const crypto = require('crypto');

const encryptData = (data, key) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  let encrypted = cipher.update(JSON.stringify(data));
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decryptData = (encrypted, key) => {
  const parts = encrypted.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
  let decrypted = decipher.update(Buffer.from(parts[1], 'hex'));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return JSON.parse(decrypted.toString());
};
```

### **4. Rate Limiting**
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later'
});

app.use('/api/', limiter);
```

### **5. CORS Configuration**
```javascript
const corsOptions = {
  origin: [
    'https://expense-tracker-pwa-murex.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

---

## 🧪 **Testing Strategy**

### **Unit Tests**
- Validators & formatters
- Service layer functions
- Utility functions

### **Integration Tests**
- API endpoints
- Database operations
- Firebase integration

### **E2E Tests**
- Complete user flows
- Payment scenarios
- Error handling

---

## 🚀 **Deployment Checklist**

- [ ] All environment variables configured
- [ ] Database migrations run
- [ ] Tests passing (unit + integration)
- [ ] Security audit completed
- [ ] Rate limiting configured
- [ ] Error logging setup
- [ ] CORS configured
- [ ] HTTPS enabled
- [ ] Database backups enabled
- [ ] Monitoring/alerting setup

---

## 📊 **Database Schema (Firestore)**

### **Collections:**

**users**
```
├── uid (document ID)
├── email (string)
├── name (string)
├── role (owner | karyawan)
├── businessId (string)
├── inviteCode (string, owner only)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

**businesses**
```
├── id (document ID)
├── name (string)
├── ownerId (string)
├── address (string, optional)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

**expenses**
```
├── id (document ID)
├── userId (string)
├── userName (string)
├── businessId (string)
├── amount (number)
├── category (string)
├── note (string, encrypted)
├── type (owner | reimburse)
├── status (pending | approved | rejected)
├── photoURL (string, encrypted)
├── month (YYYY-MM)
├── createdAt (timestamp)
├── updatedAt (timestamp)
└── approvedBy (string, optional)
```

**inviteCodes**
```
├── code (document ID)
├── businessId (string)
├── createdAt (timestamp)
├── expiresAt (timestamp)
└── usedBy (array of userIds)
```

---

## 🔄 **Frontend to Backend Migration Path**

1. **Phase 1 (Current)** - Frontend-only with security
2. **Phase 2** - Deploy backend API
3. **Phase 3** - Migrate auth to backend JWT
4. **Phase 4** - Sync offline data to backend
5. **Phase 5** - Add payment gateway integration

---

**Status:** Planning Complete  
**Next Step:** Backend implementation (when ready)
