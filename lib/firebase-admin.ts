import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
let adminApp;

try {
  // Check if admin app is already initialized
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    
    // Check if we have service account credentials
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && projectId) {
      console.log('🔑 Initializing Firebase Admin with service account credentials');
      
      // Handle private key formatting for different environments
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      
      // For Vercel and other environments, handle escaped newlines
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      
      // Ensure the key has proper formatting
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        throw new Error('Invalid private key format');
      }

      const serviceAccount = {
        projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      };

      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.projectId,
      });
      
      console.log('✅ Firebase Admin initialized with service account');
    } else {
      console.log('⚠️  Missing Firebase Admin credentials:', {
        hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        hasProjectId: !!projectId
      });
      
      // Fallback for development or environments with default credentials
      if (projectId) {
        adminApp = initializeApp({
          projectId,
        });
        console.log('⚠️  Using default credentials (may not work in production)');
      } else {
        throw new Error('No Firebase project ID found');
      }
    }
  } else {
    adminApp = getApps()[0];
    console.log('✅ Using existing Firebase Admin app');
  }
  
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error);
  console.error('Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  });
  throw new Error(`Firebase Admin initialization failed: ${error.message}`);
}

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export { adminApp };