import type { ApiErrorResponse } from '@crm/types';
import { API_PREFIX, HTTP_HEADERS } from '@crm/shared';

export class ApiClientError extends Error {
  public code: string;
  public requestId: string;
  public details?: unknown;
  public status?: number;

  constructor(errorResponse: ApiErrorResponse['error'], status?: number) {
    super(errorResponse.message);
    this.name = 'ApiClientError';
    this.code = errorResponse.code;
    this.requestId = errorResponse.requestId;
    this.details = errorResponse.details;
    this.status = status;
  }
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Standard typed HTTP client for SR Enterprises CRM
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers, ...customConfig } = options;

  let url = endpoint.startsWith('http') ? endpoint : `${API_PREFIX}${endpoint}`;
  if (typeof window !== 'undefined' && (!window.location?.origin || window.location.origin === 'null')) {
    if (!url.startsWith('http')) {
      url = `http://localhost:3000${url.startsWith('/') ? '' : '/'}${url}`;
    }
  }

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const defaultHeaders: Record<string, string> = {
    Accept: 'application/json',
    [HTTP_HEADERS.REQUEST_ID]: crypto.randomUUID(),
  };

  if (customConfig.body) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error('Request timeout after 30 seconds')), 30000);
  if (customConfig.signal) {
    customConfig.signal.addEventListener('abort', () => controller.abort(customConfig.signal?.reason));
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        ...defaultHeaders,
        ...headers,
      },
      credentials: 'include', // Send secure HTTP-only cookies
      ...customConfig,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    if (response.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/captcha')) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized', {
          detail: { message: data?.error?.message || 'Authentication required' },
        }));
      }
    }

    if (data && typeof data === 'object') {
      if ('error' in data && data.error) {
        const errorObj = typeof data.error === 'object' ? data.error : { message: String(data.error) };
        throw new ApiClientError(errorObj, response.status);
      }
      if ('message' in data && typeof data.message === 'string' && data.message.trim() !== '') {
        throw new ApiClientError({
          code: 'HTTP_ERROR',
          message: data.message,
          requestId: response.headers.get(HTTP_HEADERS.REQUEST_ID) || 'unknown',
        }, response.status);
      }
    }
    throw new ApiClientError({
      code: response.status === 401 ? 'UNAUTHORIZED' : (response.status === 403 ? 'FORBIDDEN' : 'HTTP_ERROR'),
      message: response.statusText || 'An unexpected error occurred',
      requestId: response.headers.get(HTTP_HEADERS.REQUEST_ID) || 'unknown',
    }, response.status);
  }

  // If response follows ApiSuccessResponse envelope
  if (data && typeof data === 'object' && 'success' in data && data.success === true) {
    return data as T;
  }

  return data as T;
}

/**
 * Convenient REST methods on apiClient
 */
export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<{ success: boolean; data: T }>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<{ success: boolean; data: T }>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<{ success: boolean; data: T }>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<{ success: boolean; data: T }>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<{ success: boolean; data: T }>(endpoint, { ...options, method: 'DELETE' }),
};
