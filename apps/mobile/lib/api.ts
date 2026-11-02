import { useAuth } from '@clerk/clerk-expo';
import { API_BASE } from '@/lib/config';

// Thrown for any non-2xx response. The message keeps the raw "API path → status: body" text (some screens match on it);
// use errorMessage() to show players the server's own wording instead.
export class ApiError extends Error {
  status: number;
  code: string | null;
  serverMessage: string | null;
  constructor(path: string, status: number, text: string) {
    super(`API ${path} → ${status}: ${text}`);
    this.status = status;
    let body: { error?: unknown; code?: unknown } | null = null;
    try { body = JSON.parse(text); } catch { body = null; }
    this.serverMessage = typeof body?.error === 'string' ? body.error : null;
    this.code = typeof body?.code === 'string' ? body.code : null;
  }
}

export function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return e.serverMessage ?? fallback;
  return fallback;
}

export function useApi() {
  const { getToken } = useAuth();

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await getToken();
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new ApiError(path, res.status, text);
    }

    return res.json() as Promise<T>;
  }

  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body: unknown) =>
      request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
    put: <T>(path: string, body: unknown) =>
      request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
    patch: <T>(path: string, body: unknown) =>
      request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  };
}
