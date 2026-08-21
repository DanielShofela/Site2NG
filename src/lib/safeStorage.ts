/**
 * Safe localStorage wrapper that handles QuotaExceededError and prevents runtime crashes.
 */

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    // Step 1: Cleanup non-essential keys quietly
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('viewed_job_') || k.startsWith('saved_job_') || k.includes('_temp_') || k.includes('cache'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      // ignore
    }

    // Step 2: Retry after initial cleanup
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e2) {
      return false;
    }
  }
}

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn(`[safeGetItem] Error reading "${key}" from localStorage:`, e);
    return null;
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`[safeRemoveItem] Error removing "${key}" from localStorage:`, e);
  }
}
