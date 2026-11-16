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

// "delivery_address" → "Delivery address", for a complaint that doesn't name what it is about.
const labelOf = (field: string) => field.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

// The first thing the API complained about, as a sentence. It answers {"detail": "..."} for most
// errors and {"field": ["..."]} (sometimes nested) for a form that isn't right. Its own messages are
// written for people; the framework's stock ones ("This field is required.") need the field's name.
function firstComplaint(body: unknown, field = ''): string | undefined {
  if (typeof body === 'string') {
    if (!field || field === 'detail' || field === 'non_field_errors') return body;
    if (/^This field /.test(body)) return `${labelOf(field)} ${body.slice('This field '.length)}`;
    if (/^(Ensure|Enter|A valid|Not a valid|Expected|Invalid|Must be|".*" is not)/.test(body)) return `${labelOf(field)}: ${body}`;
    return body;
  }
  if (Array.isArray(body)) {
    for (const item of body) {
      const found = firstComplaint(item, field);
      if (found) return found;
    }
    return undefined;
  }
  if (body && typeof body === 'object') {
    for (const [key, value] of Object.entries(body)) {
      const found = firstComplaint(value, key);
      if (found) return found;
    }
  }
  return undefined;
}

// What to tell the person when a request fails: the API's own sentence when it has one, otherwise a
// plain one for the kind of failure. Never a bare status code.
export function messageOf(status: number, body: unknown): string {
  if (status === 401) return 'Your sign-in has expired. Sign in again.';
  const said = firstComplaint(body);
  if (said) return said;
  if (status === 403) return "You don't have access to do that. Ask a host if you need it.";
  if (status === 404) return "We couldn't find that. It may have been removed.";
  if (status === 409) return "That can't be done right now. Refresh and try again.";
  if (status === 413) return "That's too much to send at once. Try with less.";
  if (status === 429) return "That's a lot of requests at once. Wait a moment and try again.";
  if (status >= 500) return "The lunch server had a problem. Try again in a minute.";
  return "That didn't work. Check what you entered and try again.";
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
