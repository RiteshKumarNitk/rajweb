import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import { AppError, fromUnknownError, isAppError } from "@/core/errors/app-error";
import { ErrorCodes } from "@/core/errors/error-codes";
import { apiError, apiSuccess } from "@/core/api/api-response";
import { generateRequestId, getClientIp } from "@/core/api/request-context";
import { logger } from "@/core/logger";
import { captureException } from "@/core/monitoring/sentry";
import { checkRateLimit } from "@/security/rate-limit";
import { isMutatingMethod, validateCsrf } from "@/security/csrf";

type ApiHandler = (
  request: NextRequest,
  context: { requestId: string; params?: Record<string, string | string[]> }
) => Promise<NextResponse>;

interface ApiHandlerOptions {
  module?: string;
  rateLimit?: { limit: number; windowMs: number };
  requireAuth?: boolean;
  requireCsrf?: boolean;
}

export function withApiHandler(handler: ApiHandler, options: ApiHandlerOptions = {}) {
  return async function routeHandler(
    request: NextRequest,
    routeContext?: { params?: Promise<Record<string, string | string[]>> }
  ) {
    const requestId = generateRequestId();
    const ip = getClientIp(request.headers);
    const module = options.module ?? "api";
    const start = Date.now();

    try {
      if (options.rateLimit) {
        const allowed = await checkRateLimit(
          `${module}:${ip}`,
          options.rateLimit.limit,
          options.rateLimit.windowMs
        );
        if (!allowed) {
          throw AppError.rateLimited();
        }
      }

      if (options.requireCsrf && isMutatingMethod(request.method) && !validateCsrf(request)) {
        throw AppError.forbidden("Invalid or missing CSRF token");
      }

      const params = routeContext?.params ? await routeContext.params : undefined;
      const response = await handler(request, { requestId, params });

      logger.info({
        requestId,
        module,
        method: request.method,
        path: request.nextUrl.pathname,
        ip,
        durationMs: Date.now() - start,
        status: response.status,
      });

      return response;
    } catch (error) {
      const appError = fromUnknownError(error);

      if (error instanceof ZodError) {
        const validationError = AppError.validation("Invalid request data", error.issues);
        logger.warn({
          requestId,
          module,
          code: validationError.code,
          details: error.issues,
          path: request.nextUrl.pathname,
        });
        return NextResponse.json(
          apiError(validationError.code, validationError.message, requestId, error.issues),
          { status: validationError.statusCode }
        );
      }

      if (isAppError(appError) && appError.isOperational) {
        logger.warn({
          requestId,
          module,
          code: appError.code,
          message: appError.message,
          path: request.nextUrl.pathname,
        });
      } else {
        logger.error({
          requestId,
          module,
          err: error,
          path: request.nextUrl.pathname,
        });
        captureException(error, { requestId, module, path: request.nextUrl.pathname });
      }

      return NextResponse.json(
        apiError(appError.code, appError.message, requestId, appError.details),
        { status: appError.statusCode }
      );
    }
  };
}

export function jsonSuccess<T>(data: T, requestId: string, message?: string, status = 200) {
  return NextResponse.json(apiSuccess(data, requestId, message), { status });
}

export { ErrorCodes, AppError };
