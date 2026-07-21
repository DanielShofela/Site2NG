export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export const showToast = (message: string, type: ToastType = 'success') => {
  const event = new CustomEvent('cvlm_toast', {
    detail: { id: `toast-${Date.now()}`, message, type }
  });
  window.dispatchEvent(event);
};
