/**
 * Centralized API Client
 * - Base URL: http://localhost:3001/api/v1
 * - Injects Bearer token automatically
 * - Throws ApiError on non-2xx responses
 * - Redirects to /login on 401 UNLESS skipAutoLogout is set
 *   (used by the LiveKit token refresh path to avoid false logouts)
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface FetchOptions extends Omit<RequestInit, 'body'> {
  data?: unknown;
  body?: string; // allow legacy body: JSON.stringify() usage
  /**
   * When true, a 401 response throws ApiError instead of hard-redirecting
   * to /login. Use for service-level calls (e.g. LiveKit token refresh)
   * where a 401 means "LiveKit token expired", not "user logged out".
   */
  skipAutoLogout?: boolean;
}

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tenant_token');
}

export async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { data, headers: extraHeaders, skipAutoLogout, ...rest } = options;

  // Ensure endpoint starts with a slash
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Strip any leading /api prefix from endpoint if someone passed it by mistake
  const cleanEndpoint = normalizedEndpoint.replace(/^\/api(?=\/|$)/, '');

  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extraHeaders as Record<string, string> | undefined),
  };

  const config: RequestInit = {
    ...rest,
    headers,
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  };

  const response = await fetch(`${API_BASE}${cleanEndpoint}`, config);

  // Auto-logout on auth failure (unless caller opts out)
  if (response.status === 401) {
    if (!skipAutoLogout && typeof window !== 'undefined') {
      localStorage.removeItem('tenant_token');
      window.location.href = '/login';
    }
    throw new ApiError(401, 'Session expired. Please log in again.');
  }

  if (response.status === 204) {
    return {} as T;
  }

  if (!response.ok) {
    let errorData: { error?: string | { message?: string }; message?: string } = {};
    try {
      errorData = await response.json();
    } catch {
      // non-JSON error body
    }
    throw new ApiError(
      response.status,
      (typeof errorData.error === 'object' ? errorData.error?.message : errorData.error) ?? 
      errorData.message ?? 
      `API Error ${response.status}`,
      errorData
    );
  }

  return response.json() as Promise<T>;
}
