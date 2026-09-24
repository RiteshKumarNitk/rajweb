import type { ErrorCode } from "@/core/errors/error-codes";

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  meta: ApiMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
  meta: ApiMeta;
}

export interface ApiMeta {
  requestId: string;
  timestamp: string;
}

export function apiSuccess<T>(
  data: T,
  requestId: string,
  message?: string
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(message ? { message } : {}),
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };
}

export function apiError(
  code: ErrorCode,
  message: string,
  requestId: string,
  details?: unknown
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };
}
