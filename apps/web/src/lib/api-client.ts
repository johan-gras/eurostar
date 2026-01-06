/**
 * API Client with fetch wrapper
 * Handles token refresh on 401 and error handling
 */

const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(error: ApiError, status: number) {
    super(error.message);
    this.name = 'ApiClientError';
    this.code = error.code;
    this.status = status;
    this.details = error.details;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
}

interface ApiResponse<T> {
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ErrorResponse {
  error: ApiError;
}

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? '/api/v1';

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempt to refresh the authentication token
 * Returns true if refresh succeeded, false otherwise
 */
async function refreshToken(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Handle token refresh with deduplication
 * Multiple concurrent 401s will share the same refresh attempt
 */
async function handleTokenRefresh(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = refreshToken().finally(() => {
    isRefreshing = false;
    refreshPromise = null;
  });

  return refreshPromise;
}

/**
 * Build URL with query parameters
 */
function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(endpoint, window.location.origin);

  if (!endpoint.startsWith('http')) {
    url.pathname = `${API_BASE_URL}${endpoint}`;
  }

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

/**
 * Core fetch wrapper with error handling and token refresh
 */
async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
  retryOnAuth = true
): Promise<ApiResponse<T>> {
  const { body, params, timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;

  const url = buildUrl(endpoint, params);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const config: RequestInit = {
    ...fetchOptions,
    credentials: 'include',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiClientError(
        { code: 'TIMEOUT', message: 'Request timed out. Please check your connection and try again.' },
        0
      );
    }
    throw new ApiClientError(
      { code: 'NETWORK_ERROR', message: 'Unable to connect. Please check your internet connection.' },
      0
    );
  } finally {
    clearTimeout(timeoutId);
  }

  // Handle 401 with token refresh
  if (response.status === 401 && retryOnAuth) {
    const refreshed = await handleTokenRefresh();

    if (refreshed) {
      // Retry the original request
      return request<T>(endpoint, options, false);
    }

    // Refresh failed - redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new ApiClientError(
      { code: 'UNAUTHORIZED', message: 'Session expired. Please log in again.' },
      401
    );
  }

  // Handle non-2xx responses
  if (!response.ok) {
    let errorData: ErrorResponse;
    try {
      errorData = await response.json() as ErrorResponse;
    } catch {
      throw new ApiClientError(
        { code: 'UNKNOWN_ERROR', message: 'An unexpected error occurred' },
        response.status
      );
    }

    throw new ApiClientError(errorData.error, response.status);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return { data: undefined as T };
  }

  return response.json() as Promise<ApiResponse<T>>;
}

/**
 * API client with typed methods
 */
export const apiClient = {
  get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) {
    const options: RequestOptions = { method: 'GET' };
    if (params) {
      options.params = params;
    }
    return request<T>(endpoint, options);
  },

  post<T>(endpoint: string, body?: unknown) {
    const options: RequestOptions = { method: 'POST' };
    if (body !== undefined) {
      options.body = body;
    }
    return request<T>(endpoint, options);
  },

  put<T>(endpoint: string, body?: unknown) {
    const options: RequestOptions = { method: 'PUT' };
    if (body !== undefined) {
      options.body = body;
    }
    return request<T>(endpoint, options);
  },

  patch<T>(endpoint: string, body?: unknown) {
    const options: RequestOptions = { method: 'PATCH' };
    if (body !== undefined) {
      options.body = body;
    }
    return request<T>(endpoint, options);
  },

  delete<T>(endpoint: string) {
    return request<T>(endpoint, { method: 'DELETE' });
  },
};

export default apiClient;
