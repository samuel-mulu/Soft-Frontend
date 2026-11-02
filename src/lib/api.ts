import { clearQueryCacheOnLogout } from '@/lib/query-client';
import { ApiRequestError, parseApiErrorMessage } from '@/lib/sale-errors';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
export type RecordData = Record<string, any>;
export function getToken() {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem('sd_token') || '';
}
export function saveSession(token: string, user: RecordData) {
  sessionStorage.setItem('sd_token', token);
  sessionStorage.setItem('sd_user', JSON.stringify(user));
}
export function getUser(): RecordData | null {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(sessionStorage.getItem('sd_user') || 'null');
  } catch {
    return null;
  }
}
export function logout() {
  clearQueryCacheOnLogout();
  sessionStorage.removeItem('sd_token');
  sessionStorage.removeItem('sd_user');
  location.href = '/login';
}
export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers, cache: 'no-store' });
  } catch {
    throw new Error('Cannot reach backend. Check NEXT_PUBLIC_API_URL and start the NestJS server.');
  }
  if (response.status === 401 && typeof window !== 'undefined' && !path.includes('/auth/login')) {
    logout();
    throw new Error('Session expired');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiRequestError(parseApiErrorMessage(data, response.status), response.status);
  }
  return data as T;
}
const fmtAmount = (v: any) =>
  Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
export const amount = (v: any) => fmtAmount(v);
export const money = (v: any) => `${fmtAmount(v)} ETB`;
export const date = (v: any) =>
  v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const post = (path: string, data: any) => api(path, { method: 'POST', body: JSON.stringify(data) });
export const patch = (path: string, data: any) => api(path, { method: 'PATCH', body: JSON.stringify(data) });
