import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
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
  
  return firebaseConfig;
};

const config = getFirebaseConfig();
const app = !getApps().length ? initializeApp(config) : getApp();

export const db = getFirestore(app, config.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Connection test helper
export async function testFirebaseConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('✅ Firebase Firestore database connected successfully.');
    return { success: true };
  } catch (error: any) {
    console.warn('Firebase connection check result:', error?.message || error);
    // If doc doesn't exist, it's still a successful connection to Firestore
    if (error?.code === 'not-found' || error?.message?.includes('No document to update')) {
      return { success: true };
    }
    return { success: false, error: error?.message || String(error) };
  }
}




