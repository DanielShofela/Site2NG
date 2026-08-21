import { storage } from './firebase';
import { ref, uploadString, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Utility to compress uploaded images into clean base64 strings
 */
export function compressImage(
  file: File, 
  maxWidth: number = 600, 
  maxHeight: number = 600, 
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function compressDataUrl(
  dataUrl: string, 
  maxWidth: number = 600, 
  maxHeight: number = 800, 
  quality: number = 0.75
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return Promise.resolve(dataUrl);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Uploads a base64 Data URL or File/Blob directly to Firebase Storage and returns the public HTTP URL.
 * Replaces heavy base64 strings with permanent Firebase Storage URLs to prevent 'Storage quota exceeded' errors.
 */
export async function uploadImageToStorage(
  input: File | Blob | string,
  folder: string = 'images'
): Promise<string> {
  if (!input) return '';

  // If it's already an HTTP/HTTPS URL, return as is
  if (typeof input === 'string' && (input.startsWith('http://') || input.startsWith('https://'))) {
    return input;
  }

  const randomId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const filePath = `${folder}/${randomId}.jpg`;
  const storageRef = ref(storage, filePath);

  try {
    if (typeof input === 'string') {
      if (input.startsWith('data:image/')) {
        const compressed = await compressDataUrl(input, 800, 1000, 0.8);
        const snapshot = await uploadString(storageRef, compressed, 'data_url');
        return await getDownloadURL(snapshot.ref);
      }
      return input;
    } else if (input instanceof File || input instanceof Blob) {
      const snapshot = await uploadBytes(storageRef, input);
      return await getDownloadURL(snapshot.ref);
    }
  } catch (error) {
    console.warn('Firebase Storage upload warning (falling back to compressed data):', error);
    if (typeof input === 'string' && input.startsWith('data:image/')) {
      return await compressDataUrl(input, 500, 600, 0.7);
    }
    if (typeof input === 'string') return input;
  }
  return '';
}


