export type ApiErrorShape = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

export function toApiError(error: unknown, fallbackMessage = '잠시 후 다시 시도해 주세요.') {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError('INTERNAL_ERROR', fallbackMessage);
}
