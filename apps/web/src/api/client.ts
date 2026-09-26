// In development the API runs on its own port. Production builds are served by
// the same Express process, so requests stay on the current origin.
const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:4000/api' : '/api');
const TOKEN_KEY = 'jeddah-office-token';

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  public constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type QueryValue = string | number | undefined;
export type RequestBody = Record<string, unknown> | unknown[] | string | number | boolean | null;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: RequestBody;
  query?: Record<string, QueryValue>;
  token?: string | null;
}

function getStoredToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getToken(): string | null {
  return getStoredToken();
}

export function setToken(token: string | null): void {
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

function getErrorPayload(value: unknown): { code: string; message: string; details?: unknown } {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return { code: 'REQUEST_ERROR', message: 'تعذر إكمال الطلب' };
  }
  const error = value.error;
  if (typeof error !== 'object' || error === null) {
    return { code: 'REQUEST_ERROR', message: 'تعذر إكمال الطلب' };
  }
  const code = 'code' in error && typeof error.code === 'string' ? error.code : 'REQUEST_ERROR';
  const message = 'message' in error && typeof error.message === 'string' ? error.message : 'تعذر إكمال الطلب';
  const details = 'details' in error ? error.details : undefined;
  return { code, message, details };
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  }
  const queryString = query.toString();
  const url = `${API_BASE_URL}${path}${queryString ? `?${queryString}` : ''}`;
  const headers = new Headers({ Accept: 'application/json' });
  const token = options.token === undefined ? getStoredToken() : options.token;
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body,
  });
  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = null;
    }
  }
  if (!response.ok) {
    const error = getErrorPayload(payload);
    throw new ApiError(response.status, error.code, error.message, error.details);
  }
  return payload as T;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'حدث خطأ غير متوقع';
}

export function unwrapData<T>(response: { data: T }): T {
  return response.data;
}
