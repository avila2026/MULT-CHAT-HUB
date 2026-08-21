const STORAGE_KEY = 'mch:activation-secret';

export function getBackendAuthHeaders(): Record<string, string> {
  const envSecret = import.meta.env.VITE_APP_ACTIVATION_SECRET as string | undefined;
  const storedSecret = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : undefined;
  const activationSecret = (envSecret || storedSecret || '').trim();

  return activationSecret ? { 'x-mch-activation-secret': activationSecret } : {};
}
