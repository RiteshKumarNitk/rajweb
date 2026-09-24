import { ErrorCodes, type ErrorCode } from "./error-codes";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;
  readonly isOperational: boolean;

  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.INTERNAL_ERROR,
    statusCode = 500,
    details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(message, ErrorCodes.BAD_REQUEST, 400, details);
  }

  static validation(message: string, details?: unknown) {
    return new AppError(message, ErrorCodes.VALIDATION_ERROR, 400, details);
  }

  static unauthorized(message = "Unauthorized") {
    return new AppError(message, ErrorCodes.UNAUTHORIZED, 401);
  }

  static forbidden(message = "Forbidden") {
    return new AppError(message, ErrorCodes.FORBIDDEN, 403);
  }

  static notFound(message = "Resource not found") {
    return new AppError(message, ErrorCodes.NOT_FOUND, 404);
  }

  static conflict(message: string) {
    return new AppError(message, ErrorCodes.CONFLICT, 409);
  }

  static rateLimited(message = "Too many requests") {
    return new AppError(message, ErrorCodes.RATE_LIMITED, 429);
  }

  static internal(message = "Internal server error") {
    return new AppError(message, ErrorCodes.INTERNAL_ERROR, 500);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function fromUnknownError(error: unknown): AppError {
  if (isAppError(error)) return error;

  if (error instanceof Error) {
    if (error.message === "Unauthorized") return AppError.unauthorized();
    if (error.message === "Forbidden") return AppError.forbidden();
    return AppError.internal(
      process.env.NODE_ENV === "production" ? "Internal server error" : error.message
    );
  }

  return AppError.internal();
}
