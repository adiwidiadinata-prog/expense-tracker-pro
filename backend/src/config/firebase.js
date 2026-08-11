/**
 * Firebase Admin SDK Configuration
 * Handles server-side Firebase operations (Firestore, Auth)
 */

const admin = require('firebase-admin');

let firebaseApp;

function initFirebase() {
  if (firebaseApp) return firebaseApp;

  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey
    })
  });

  console.log('✅ Firebase Admin initialized');
  return firebaseApp;
}

function getDb() {
  return admin.firestore();
}

function getAuth() {
  return admin.auth();
}

module.exports = { initFirebase, getDb, getAuth, admin };
