import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Retrieve configuration, supporting optional Vite environment variables first
const getFirebaseConfig = () => {
  const metaEnv = (import.meta as any).env;
  if (metaEnv && metaEnv.VITE_FIREBASE_API_KEY) {
    return {
      apiKey: metaEnv.VITE_FIREBASE_API_KEY,
      authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
      projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
      storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
      messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
      appId: metaEnv.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
      firestoreDatabaseId: metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId
    };
  }
  
  // Note: We avoid overriding the authDomain with the live web domain on Hostinger.
  // When hosting the frontend statically on custom servers like Hostinger, 
  // they cannot perform routing proxying for Firebase Auth's standard endpoints (e.g., `__/auth/iframe`),
  // leading to 404 errors. Instead, we use the original firebaseapp.com authDomain.
  return firebaseConfig;
};

const config = getFirebaseConfig();
const app = initializeApp(config);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, config.firestoreDatabaseId || (config as any).firestoreDatabaseId);
export const auth = getAuth(app);


