import { auth } from './firebase';
import { getApiUrl } from './utils';

export function validateUpload(file: File): string | null {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'].includes(file.type)) {
    return 'Formato no soportado. Usa JPEG, PNG, WEBP, HEIC, HEIF o PDF.';
  }
  return file.size > 6 * 1024 * 1024 || file.size === 0 ? 'Selecciona un archivo de hasta 6 MB.' : null;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const user = auth?.currentUser;
  if (!user) throw new Error('Inicia sesión para utilizar esta función.');
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  return fetch(getApiUrl(path), { ...init, headers });
}
