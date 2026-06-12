// Shared fetch wrapper for the NewsAgg API: attaches the Bearer token and
// turns a 401 on a protected route into a global sign-out signal so every
// screen reacts consistently to an expired session.

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Dispatched when a request with a token comes back 401 (token expired or
 * revoked). AppContext listens and clears the in-memory user. */
export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized';

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('authToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  if (res.status === 401 && token) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
  }
  if (!res.ok) {
    throw new ApiError(`HTTP ${res.status}: ${res.statusText}`, res.status);
  }
  return res.json() as Promise<T>;
}
