// The one way the app talks to the Django API (lunch-backend). Requests go to /api on the
// app's own origin: Vite's dev server proxies them (vite.config.ts), Firebase Hosting rewrites
// them when deployed. Money crosses this line in paise.

import { idToken } from '@/lib/firebase';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
};

// DRF answers errors as {"detail": "..."} or {"field": ["..."]}; show the first sentence a
// person can act on.
function messageOf(status: number, body: unknown): string {
  if (status === 401) return 'Your sign-in has expired. Sign in again.';
  if (body && typeof body === 'object') {
    const detail = (body as { detail?: unknown }).detail;
    if (typeof detail === 'string') return detail;
    const first = Object.values(body as Record<string, unknown>)[0];
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
    if (typeof first === 'string') return first;
  }
  if (status === 502 || status === 503 || status === 504) return "The lunch server isn't answering. Try again in a minute.";
  return `Something went wrong on the lunch server (${status}). Try again.`;
}

export async function api<T>(path: string, { method = 'GET', body, params, signal }: Options = {}): Promise<T> {
  const query = params
    ? `?${new URLSearchParams(Object.entries(params).flatMap(([k, v]) => (v === undefined ? [] : [[k, String(v)]])))}`
    : '';
  const token = await idToken(); // the signed-in person's Google sign-in, checked by the API
  let response: Response;
  try {
    response = await fetch(`/api/${path}${query}`, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ApiError(0, "Can't reach the lunch server. Check your connection and try again.");
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => undefined);
  if (!response.ok) throw new ApiError(response.status, messageOf(response.status, data));
  return data as T;
}
