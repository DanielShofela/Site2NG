import { LMVersion, LMFormData } from '@/types/cvlm';

const PREF = 'cvlm_';

export const getAllLMVersions = (): LMVersion[] => {
  const stored = localStorage.getItem(`${PREF}lm_versions`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error loading cvlm_lm_versions', e);
    }
  }
  return [];
};

export const saveLMVersion = (version: LMVersion): LMVersion[] => {
  const versions = getAllLMVersions();
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

  localStorage.setItem(`${PREF}lm_versions`, JSON.stringify(versions));
  return versions;
};

export const getLMVersionById = (id: string): LMVersion | undefined => {
  return getAllLMVersions().find(v => v.id === id);
};

export const hasAnyLMVersions = (): boolean => {
  return getAllLMVersions().length > 0;
};

export const deleteLMVersion = (id: string): LMVersion[] => {
  const versions = getAllLMVersions();
  const filtered = versions.filter(v => v.id !== id);
  localStorage.setItem(`${PREF}lm_versions`, JSON.stringify(filtered));
  return filtered;
};

export const duplicateLMVersion = (id: string): LMVersion | null => {
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

  versions.push(duplicated);
  localStorage.setItem(`${PREF}lm_versions`, JSON.stringify(versions));
  return duplicated;
};
