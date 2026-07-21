import { CVRequest } from '@/types/cvlm';

const PREF = 'cvlm_';

export const saveCVRequest = async (request: Omit<CVRequest, 'id' | 'date'>): Promise<CVRequest> => {
  const stored = localStorage.getItem(`${PREF}requests`);
  let requests: CVRequest[] = [];
  if (stored) {
    try {
      requests = JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
  }

  const newRequest: CVRequest = {
    ...request,
    id: `req-${Date.now()}`,
    date: new Date().toLocaleDateString('fr-FR'),
  };

  requests.push(newRequest);
  localStorage.setItem(`${PREF}requests`, JSON.stringify(requests));
  return newRequest;
};

export const getLMRequests = async (): Promise<CVRequest[]> => {
  const stored = localStorage.getItem(`${PREF}requests`);
  if (stored) {
    try {
      const requests: CVRequest[] = JSON.parse(stored);
      return requests.filter(r => r.templateName.toLowerCase().includes('lettre') || r.id.startsWith('req-lm'));
    } catch (e) {
      console.error(e);
    }
  }
  return [];
};

export const getAllRequests = async (): Promise<CVRequest[]> => {
  const stored = localStorage.getItem(`${PREF}requests`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
  }
  return [];
};
