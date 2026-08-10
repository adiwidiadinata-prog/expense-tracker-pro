# 🚀 Deployment & DevOps Guide
**Expense Tracker Pro - Production Deployment**

---

## 📋 **Deployment Overview**

### **Current Architecture**
```
Frontend (PWA) ──→ Firebase (Firestore + Auth) ──→ Cloudinary (Images)
  Vercel                  expense-tracker-pro-99692        ojoxjoz8
```

### **Phase 2 Architecture** (When Backend Ready)
```
Frontend ──→ Backend API ──→ Firebase ──→ Cloudinary
  Vercel    Node.js/Express    Firestore    Storage
           (Railway/Render)
```

---

## 🔧 **Frontend Deployment (Current)**

### **Step 1: Deploy to Vercel**

#### **Prerequisites**
- [ ] GitHub account
- [ ] Vercel account (free tier available)
- [ ] Repo with expense-tracker-secured.html

#### **Option A: Deploy from GitHub**

```bash
# 1. Create GitHub repository
git init
git add .
git commit -m "Initial commit: Expense Tracker Pro"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/expense-tracker.git
git push -u origin main

# 2. Connect to Vercel (via Vercel Dashboard)
# - Go to https://vercel.com/dashboard
# - Click "New Project"
# - Select your GitHub repository
# - Click "Import"
# - Configure build settings (see below)
# - Deploy
```

#### **Option B: Deploy via Vercel CLI**

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel --prod

# 4. Set custom domain (optional)
# In Vercel Dashboard → Project Settings → Domains
```

#### **Build Configuration**

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "REACT_APP_FIREBASE_API_KEY": "@firebase_api_key",
    "REACT_APP_FIREBASE_AUTH_DOMAIN": "@firebase_auth_domain",
    "REACT_APP_FIREBASE_PROJECT_ID": "@firebase_project_id",
    "REACT_APP_FIREBASE_STORAGE_BUCKET": "@firebase_storage_bucket",
    "REACT_APP_CLOUDINARY_CLOUD": "ojoxjoz8",
    "REACT_APP_CLOUDINARY_PRESET": "expense_receipts"
  }
}
```

#### **Environment Variables in Vercel**

1. Go to Project Settings → Environment Variables
2. Add:
   ```
   REACT_APP_FIREBASE_API_KEY=xxxxx
   REACT_APP_FIREBASE_AUTH_DOMAIN=xxxxx
   REACT_APP_FIREBASE_PROJECT_ID=expense-tracker-pro-99692
   REACT_APP_FIREBASE_STORAGE_BUCKET=xxxxx
   REACT_APP_CLOUDINARY_CLOUD=ojoxjoz8
   REACT_APP_CLOUDINARY_PRESET=expense_receipts
   NODE_ENV=production
   ```

### **Step 2: Post-Deployment Verification**

```bash
# 1. Check SSL Certificate
curl -I https://expense-tracker-pwa-murex.vercel.app
# Should see: Strict-Transport-Security

# 2. Check PWA manifest
curl https://expense-tracker-pwa-murex.vercel.app/manifest.json

# 3. Test service worker
# Open DevTools → Application → Service Workers
# Should show: Active and running

# 4. Check CORS headers (for Cloudinary)
curl -I -H "Origin: https://expense-tracker-pwa-murex.vercel.app" \
  https://res.cloudinary.com/ojoxjoz8/...
```

---

## 🗂️ **Database Management (Firestore)**

### **Backup Strategy**

#### **Automated Backups (Recommended)**

```bash
# Google Cloud CLI setup
gcloud auth login
gcloud config set project expense-tracker-pro-99692

# Create scheduled backup (daily at 2 AM UTC)
gcloud firestore backups create \
  --collection=expenses,users,businesses,inviteCodes \
  --retention-days=30 \
  --schedule="0 2 * * *"

# View backup status
gcloud firestore backups list

# Restore from backup (if needed)
gcloud firestore restore BACKUP_ID
```

#### **Manual Backup (CLI)**

```bash
# Export Firestore data to JSON
gcloud firestore export gs://expense-tracker-backup/export-$(date +%Y%m%d)

# Download locally
gsutil -m cp -r gs://expense-tracker-backup/export-20260810 ./backups/

# Import from backup
gcloud firestore import gs://expense-tracker-backup/export-20260810
```

### **Firestore Security Rules**

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isOwner() {
      return request.auth.token.role == 'owner';
    }
    
    function isKaryawan() {
      return request.auth.token.role == 'karyawan';
    }
    
    function belongsToSameBusiness() {
      return request.auth.token.businessId == resource.data.businessId;
    }
    
    // Users collection
    match /users/{userId} {
      // Own user can read
      allow read: if request.auth.uid == userId;
      // Owner can read all users in business
      allow read: if isOwner() && belongsToSameBusiness();
      // Can create own user
      allow create: if request.auth.uid == userId;
      // Can update own profile
      allow update: if request.auth.uid == userId;
    }
    
    // Expenses collection
    match /expenses/{docId} {
      // Owner can read all in business
      allow read: if isOwner() && belongsToSameBusiness();
      // Karyawan can read own expenses
      allow read: if isKaryawan() && resource.data.userId == request.auth.uid;
      
      // Anyone can create own expense
      allow create: if belongsToSameBusiness() && 
                       resource.data.userId == request.auth.uid;
      
      // Can update own pending expenses
      allow update: if resource.data.userId == request.auth.uid && 
                       resource.data.status == 'pending';
      
      // Owner can approve/reject
      allow update: if isOwner() && belongsToSameBusiness() && 
                       request.resource.data.status in ['approved', 'rejected'];
    }
    
    // Invitation codes
    match /inviteCodes/{code} {
      // Only owners can read
      allow read: if isOwner();
      // Only owners can create
      allow create: if isOwner();
    }
    
    // Businesses collection
    match /businesses/{docId} {
      allow read: if belongsToSameBusiness();
      allow create, update: if isOwner();
    }
  }
}
```

### **Deploy Security Rules**

```bash
# Deploy rules to Firebase
firebase deploy --only firestore:rules

# Validate rules before deployment
firebase firestore:rules:test
```

---

## 📊 **Monitoring & Logging**

### **Firebase Console Monitoring**

1. **Authentication Metrics**
   - Go to Firebase Console → Authentication
   - Monitor: Sign-ups, Sign-in methods, Active users

2. **Firestore Metrics**
   - Go to Firestore → Metrics
   - Monitor: Read/Write operations, Database size

3. **Storage Metrics**
   - Go to Storage → Metrics
   - Monitor: Upload/Download, Storage usage

### **Application Error Tracking**

```javascript
// Add to your app (expense-tracker-secured.html)
// Send errors to Firebase Cloud Logging

async function logError(errorMessage, stackTrace) {
  try {
    await db.collection('errors').add({
      message: errorMessage,
      stack: stackTrace,
      userEmail: currentUser?.email,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });
  } catch (e) {
    console.error('Failed to log error:', e);
  }
}

// Catch uncaught errors
window.addEventListener('error', (event) => {
  logError(event.message, event.error?.stack);
});

// Catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  logError(event.reason, event.reason?.stack);
});
```

### **Performance Monitoring**

```javascript
// Monitor web vitals
function measureWebVitals() {
  // Largest Contentful Paint (LCP)
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);
  }).observe({ entryTypes: ['largest-contentful-paint'] });

  // First Input Delay (FID)
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log('FID:', entry.processingDuration);
    }
  }).observe({ entryTypes: ['first-input'] });

  // Cumulative Layout Shift (CLS)
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) {
        console.log('CLS:', entry.value);
      }
    }
  }).observe({ entryTypes: ['layout-shift'] });
}
```

---

## 🔐 **Security Hardening Checklist**

### **Frontend Security**

- [ ] **HTTPS Only**
  ```
  Vercel automatically enables HTTPS
  Verify: curl -I https://expense-tracker-pwa-murex.vercel.app | grep Strict-Transport-Security
  ```

- [ ] **Content Security Policy**
  ```javascript
  // In HTML <head>
  <meta http-equiv="Content-Security-Policy" 
        content="default-src 'self'; 
                 script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.tailwindcss.com;
                 img-src 'self' data: https:;
                 style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com;
                 connect-src 'self' https://*.firebaseio.com https://*.firebasedatabase.app">
  ```

- [ ] **X-Frame-Options** (Prevent clickjacking)
  ```
  vercel.json:
  {
    "headers": [
      {
        "source": "/(.*)",
        "headers": [
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          }
        ]
      }
    ]
  }
  ```

### **Firebase Security**

- [ ] **Disable Anonymous Auth**
  - Firebase Console → Authentication → Sign-in method
  - Disable "Anonymous"

- [ ] **Enable App Check**
  ```
  Firebase Console → App Check → Register app
  This prevents unauthorized access to Firestore
  ```

- [ ] **Set Read Quotas**
  - Firebase Console → Firestore → Quotas & limits
  - Set daily read/write limits to prevent abuse

### **Data Security**

- [ ] **Enable Encryption at Rest**
  - Firebase automatically encrypts data at rest

- [ ] **Enable Encryption in Transit**
  - All Firebase traffic uses TLS 1.2+

- [ ] **Backup Strategy Active**
  - Automated daily backups enabled
  - Backup retention: 30 days minimum

---

## 📱 **PWA Installation & Updates**

### **Service Worker Registration**

```javascript
// In your HTML head
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('✅ Service Worker registered');
        
        // Check for updates every hour
        setInterval(() => {
          registration.update();
        }, 3600000);
      })
      .catch(error => {
        console.error('❌ Service Worker registration failed:', error);
      });
  }
</script>
```

### **Install Prompt Handling**

```javascript
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Show install button
  document.getElementById('install-btn').style.display = 'block';
  
  document.getElementById('install-btn').addEventListener('click', async () => {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    deferredPrompt = null;
  });
});

window.addEventListener('appinstalled', () => {
  console.log('✅ PWA installed successfully');
  deferredPrompt = null;
});
```

---

## 🔄 **CI/CD Pipeline (GitHub Actions)**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run tests
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: vercel/action@master
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          production: true
```

---

## 📊 **Database Migration Path**

### **Phase 1 (Current)**
- ✅ Frontend-only with Firestore
- ✅ Firebase Auth
- ✅ Cloudinary for images

### **Phase 2 (Ready to Deploy)**
- ✅ Backend API (Node.js/Express)
- ✅ JWT authentication
- ✅ Firestore integration

### **Phase 3 (Future)**
- 🔲 PostgreSQL database (optional)
- 🔲 Payment gateway integration
- 🔲 Email notifications

---

## ⚙️ **Backend Deployment (When Ready)**

### **Option A: Railway.app** (Recommended for beginners)

```bash
# 1. Create Railway project
# Go to https://railway.app/dashboard
# Click "New Project" → "Deploy from GitHub"

# 2. Configure environment variables in Railway
PORT=3000
NODE_ENV=production
JWT_SECRET=xxxxx
FIREBASE_PROJECT_ID=expense-tracker-pro-99692
DATABASE_URL=xxxxx (if using PostgreSQL)

# 3. Connect GitHub repository
# Railway will auto-deploy on push to main
```

### **Option B: Render.com**

```bash
# 1. Create new Web Service
# Go to https://render.com/dashboard
# Connect GitHub repository

# 2. Configure
Build Command: npm install
Start Command: npm start

# 3. Set environment variables
# Same as Railway.app above

# 4. Deploy
# Will auto-deploy on push
```

### **Option C: Docker + AWS/DigitalOcean**

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "src/server.js"]
```

```bash
# Build and push to Docker Hub
docker build -t username/expense-tracker-backend:latest .
docker push username/expense-tracker-backend:latest

# Deploy to AWS ECS / DigitalOcean App Platform
# (Platform-specific instructions)
```

---

## 🔍 **Post-Deployment Testing**

```bash
# 1. Test API endpoints
curl https://api.expense-tracker.com/api/health
# Expected: { "status": "ok", "timestamp": "2026-08-11T..." }

# 2. Test database connection
curl https://api.expense-tracker.com/api/expenses \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 3. Load test (simulate 100 concurrent users)
ab -n 1000 -c 100 https://expense-tracker-pwa-murex.vercel.app/

# 4. Security scan
npm audit
snyk test
```

---

## 📋 **Pre-Launch Checklist**

- [ ] **Frontend**
  - [ ] Deployed to Vercel
  - [ ] SSL certificate valid
  - [ ] Service worker active
  - [ ] Offline mode tested
  - [ ] All features working

- [ ] **Firebase**
  - [ ] Firestore rules deployed
  - [ ] Backups enabled
  - [ ] Authentication configured
  - [ ] Storage quotas set
  - [ ] Error logging active

- [ ] **Monitoring**
  - [ ] Error tracking enabled
  - [ ] Performance monitoring active
  - [ ] Uptime monitoring configured
  - [ ] Alert notifications set

- [ ] **Security**
  - [ ] No hardcoded credentials
  - [ ] Security audit passed
  - [ ] HTTPS enforced
  - [ ] CSP headers set
  - [ ] Rate limiting enabled

- [ ] **Data**
  - [ ] Backup strategy active
  - [ ] Data validation rules in place
  - [ ] Encryption enabled
  - [ ] No sensitive data in logs

---

## 🚨 **Troubleshooting**

### **Common Issues**

**Issue: "Service Worker registration failed"**
```
Solution:
1. Check HTTPS is enabled (Vercel uses https:// by default)
2. Verify service-worker.js is in root directory
3. Check browser console for CORS errors
```

**Issue: "Firebase config not found"**
```
Solution:
1. Verify environment variables in Vercel
2. Check .env.local has Firebase credentials
3. Run: vercel env pull
```

**Issue: "Cloudinary image uploads failing"**
```
Solution:
1. Verify cloud name: ojoxjoz8
2. Verify preset: expense_receipts
3. Check CORS settings in Cloudinary dashboard
```

**Issue: "Database timeout errors"**
```
Solution:
1. Check Firestore quotas (Firebase Console → Quotas)
2. Verify network connectivity
3. Check for unoptimized queries
```

---

**Status:** Ready for production deployment  
**Last Updated:** August 11, 2026  
**Next Step:** Deploy secured HTML to Vercel
