import { LMVersion } from '@/types/cvlm';
import { safeSetItem, safeGetItem } from '@/lib/safeStorage';
import { db, auth } from '@/lib/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const PREF = 'cvlm_';

export const getAllLMVersions = (): LMVersion[] => {
  const stored = safeGetItem(`${PREF}lm_versions`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error loading cvlm_lm_versions', e);
    }
  }
  return [];
};

export const saveLMVersion = async (version: LMVersion): Promise<LMVersion[]> => {
  const currentUser = auth.currentUser;
  const updatedVersion: LMVersion = {
    ...version,
    userId: version.userId || currentUser?.uid || 'guest',
    userEmail: version.userEmail || currentUser?.email || '',
    updatedAt: new Date().toISOString()
  };

  const versions = getAllLMVersions();
  const existingIndex = versions.findIndex(v => v.id === updatedVersion.id);

  if (existingIndex > -1) {
    versions[existingIndex] = updatedVersion;
  } else {
    versions.push(updatedVersion);
  }

  safeSetItem(`${PREF}lm_versions`, JSON.stringify(versions));

  // Async sync with Firestore
  try {
    const docRef = doc(db, 'lm_versions', updatedVersion.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(updatedVersion)), { merge: true });
  } catch (err) {
    console.error('Firestore saveLMVersion error:', err);
  }

  return versions;
};

export const getLMVersionById = (id: string): LMVersion | undefined => {
  return getAllLMVersions().find(v => v.id === id);
};

export const hasAnyLMVersions = (): boolean => {
  return getAllLMVersions().length > 0;
};

export const deleteLMVersion = async (id: string): Promise<LMVersion[]> => {
  const versions = getAllLMVersions();
  const filtered = versions.filter(v => v.id !== id);
  safeSetItem(`${PREF}lm_versions`, JSON.stringify(filtered));

  try {
    const docRef = doc(db, 'lm_versions', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Firestore deleteLMVersion error:', err);
  }

  return filtered;
};

export const duplicateLMVersion = async (id: string): Promise<LMVersion | null> => {
  const versions = getAllLMVersions();
  const original = versions.find(v => v.id === id);
  if (!original) return null;

  const duplicated: LMVersion = {
    ...original,
    id: `lm-version-${Date.now()}`,
    name: `${original.name} (Copie)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await saveLMVersion(duplicated);
  return duplicated;
};

/**
 * Real-time synchronization listener for LM versions in Firestore
 */
export const subscribeToLMVersions = (onUpdate: (versions: LMVersion[]) => void, userId?: string) => {
  try {
    const versionsRef = collection(db, 'lm_versions');
    return onSnapshot(versionsRef, (snapshot) => {
      const remoteVersions: LMVersion[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as LMVersion;
        if (!userId || !data.userId || data.userId === userId || data.userId === 'guest') {
          remoteVersions.push(data);
        }
      });

      safeSetItem(`${PREF}lm_versions`, JSON.stringify(remoteVersions));
      onUpdate(remoteVersions);
    }, (err) => {
      console.warn('Firestore LM versions listener notice:', err);
      onUpdate(getAllLMVersions());
    });
  } catch (e) {
    console.error('Failed to subscribe to LM versions:', e);
    onUpdate(getAllLMVersions());
    return () => {};
  }
};
