import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Override the auth domain to point to the current custom domain host if applicable.
// This allows Safari and Chrome on mobile to treat authentication as first-party, resolving cookie restrictions.
const getCustomConfig = () => {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isCustomDomain = host && 
    !host.includes('localhost') && 
    !host.includes('127.0.0.1') && 
    !host.includes('.run.app') && 
    !host.includes('.web.app') && 
    !host.includes('firebaseapp.com');
    
  if (isCustomDomain) {
    console.log(`Custom domain detected: ${host}. Overriding authDomain with ${host} for secure cookies.`);
    return {
      ...firebaseConfig,
      authDomain: host
    };
  }
  return firebaseConfig;
};

const config = getCustomConfig();
const app = initializeApp(config);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, config.firestoreDatabaseId);
export const auth = getAuth(app);

