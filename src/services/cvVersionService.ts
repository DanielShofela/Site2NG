import { CVVersion } from '@/types/cvlm';
import { safeSetItem, safeGetItem } from '@/lib/safeStorage';
import { db, auth } from '@/lib/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const PREF = 'cvlm_';

export const getAllVersions = (): CVVersion[] => {
  const stored = safeGetItem(`${PREF}versions`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error loading cvlm_versions', e);
    }
  }
  return [];
};

export const saveVersion = async (version: CVVersion): Promise<CVVersion[]> => {
  const currentUser = auth.currentUser;
  const updatedVersion: CVVersion = {
    ...version,
    userId: version.userId || currentUser?.uid || 'guest',
    userEmail: version.userEmail || currentUser?.email || '',
    updatedAt: new Date().toISOString()
  };

  const versions = getAllVersions();
  const existingIndex = versions.findIndex(v => v.id === updatedVersion.id);

  if (existingIndex > -1) {
    versions[existingIndex] = updatedVersion;
  } else {
    versions.push(updatedVersion);
  }

  safeSetItem(`${PREF}versions`, JSON.stringify(versions));

  // Async sync with Firestore
  try {
    const docRef = doc(db, 'cv_versions', updatedVersion.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(updatedVersion)), { merge: true });
  } catch (err) {
    console.error('Firestore saveVersion error:', err);
  }

  return versions;
};

export const getVersionById = (id: string): CVVersion | undefined => {
  return getAllVersions().find(v => v.id === id);
};

export const hasAnyVersions = (): boolean => {
  return getAllVersions().length > 0;
};

export const deleteVersion = async (id: string): Promise<CVVersion[]> => {
  const versions = getAllVersions();
  const filtered = versions.filter(v => v.id !== id);
  safeSetItem(`${PREF}versions`, JSON.stringify(filtered));

  try {
    const docRef = doc(db, 'cv_versions', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Firestore deleteVersion error:', err);
  }

  return filtered;
};

export const duplicateVersion = async (id: string): Promise<CVVersion | null> => {
  const versions = getAllVersions();
  const original = versions.find(v => v.id === id);
  if (!original) return null;

  const duplicated: CVVersion = {
    ...original,
    id: `cv-version-${Date.now()}`,
    name: `${original.name} (Copie)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await saveVersion(duplicated);
  return duplicated;
};

/**
 * Real-time synchronization listener for CV versions in Firestore
 */
export const subscribeToVersions = (onUpdate: (versions: CVVersion[]) => void, userId?: string) => {
  try {
    const versionsRef = collection(db, 'cv_versions');
    return onSnapshot(versionsRef, (snapshot) => {
      const remoteVersions: CVVersion[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as CVVersion;
        if (!userId || !data.userId || data.userId === userId || data.userId === 'guest') {
          remoteVersions.push(data);
        }
      });

      if (remoteVersions.length > 0) {
        // Merge local & remote
        const local = getAllVersions();
        const map = new Map<string, CVVersion>();
        local.forEach(v => map.set(v.id, v));
        remoteVersions.forEach(v => map.set(v.id, v));

        const merged = Array.from(map.values());
        safeSetItem(`${PREF}versions`, JSON.stringify(merged));
        onUpdate(merged);
      } else {
        onUpdate(getAllVersions());
      }
    }, (err) => {
      console.warn('Firestore versions listener notice:', err);
      onUpdate(getAllVersions());
    });
  } catch (e) {
    console.error('Failed to subscribe to versions:', e);
    onUpdate(getAllVersions());
    return () => {};
  }
};
