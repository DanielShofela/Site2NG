import { CVVersion, CVFormData } from '@/types/cvlm';

const PREF = 'cvlm_';

export const getAllVersions = (): CVVersion[] => {
  const stored = localStorage.getItem(`${PREF}versions`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error loading cvlm_versions', e);
    }
  }
  return [];
};

export const saveVersion = (version: CVVersion): CVVersion[] => {
  const versions = getAllVersions();
  const existingIndex = versions.findIndex(v => v.id === version.id);
  
  const updatedVersion = {
    ...version,
    updatedAt: new Date().toISOString()
  };

  if (existingIndex > -1) {
    versions[existingIndex] = updatedVersion;
  } else {
    versions.push(updatedVersion);
  }

  localStorage.setItem(`${PREF}versions`, JSON.stringify(versions));
  return versions;
};

export const getVersionById = (id: string): CVVersion | undefined => {
  return getAllVersions().find(v => v.id === id);
};

export const hasAnyVersions = (): boolean => {
  return getAllVersions().length > 0;
};

export const deleteVersion = (id: string): CVVersion[] => {
  const versions = getAllVersions();
  const filtered = versions.filter(v => v.id !== id);
  localStorage.setItem(`${PREF}versions`, JSON.stringify(filtered));
  return filtered;
};

export const duplicateVersion = (id: string): CVVersion | null => {
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

  versions.push(duplicated);
  localStorage.setItem(`${PREF}versions`, JSON.stringify(versions));
  return duplicated;
};
