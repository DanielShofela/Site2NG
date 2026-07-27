/**
 * Safe localStorage wrapper that handles QuotaExceededError and prevents runtime crashes.
 */

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`[safeSetItem] Storage quota exceeded or error setting "${key}". Attempting cleanup...`, error);

    // Step 1: Cleanup non-essential keys
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
      console.warn('[safeSetItem] Error during non-essential key cleanup:', e);
    }

    // Step 2: Retry after initial cleanup
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e2) {
      console.warn(`[safeSetItem] Retry after cleanup failed for key "${key}". Cleaning data URLs...`, e2);
    }

    // Step 3: If value contains massive base64 images (data:image/...), replace long data URLs with standard placeholder URL
    try {
      let sanitizedValue = value;
      if (value.includes('data:image/')) {
        sanitizedValue = value.replace(
          /data:image\/[a-zA-Z0-9+=/;,.-\s]+/g,
          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=60'
        );
      }

      localStorage.setItem(key, sanitizedValue);
      return true;
    } catch (e3) {
      console.error(`[safeSetItem] Critical: Unable to write "${key}" to localStorage:`, e3);
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
