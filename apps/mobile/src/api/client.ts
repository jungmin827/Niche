import { env } from '../lib/env';
import { ApiError } from '../lib/error';
import { getAccessToken } from './auth';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  accessToken?: string | null;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  if (!env.apiBaseUrl) {
    throw new ApiError(
      'API_NOT_CONFIGURED',
      'API base URL이 설정되지 않았습니다.',
    );
  }

  const accessToken = options.accessToken ?? (await getAccessToken());

  if (!accessToken) {
    throw new ApiError('UNAUTHORIZED', '로그인이 필요합니다.');
  }

  let response: Response;

  try {
    response = await fetch(`${env.apiBaseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    throw new ApiError(
      'NETWORK_ERROR',
      '네트워크 상태를 확인해 주세요.',
      error instanceof Error ? { message: error.message } : undefined,
    );
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as
      | { error?: { code?: string; message?: string; details?: unknown } }
      | null;

    throw new ApiError(
      data?.error?.code ?? 'INTERNAL_ERROR',
      data?.error?.message ?? '요청을 처리하지 못했습니다.',
      data?.error?.details,
    );
  }

  return (await response.json()) as T;
}
