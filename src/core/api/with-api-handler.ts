import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import { AppError, fromUnknownError } from "@/core/errors/app-error";
import { ErrorCodes } from "@/core/errors/error-codes";
import { apiError, apiSuccess } from "@/core/api/api-response";
import { generateRequestId, getClientIp } from "@/core/api/request-context";
import { logger } from "@/core/logger";
import { captureException } from "@/core/monitoring/sentry";
import { checkRateLimit } from "@/security/rate-limit";
import { isMutatingMethod, validateCsrf } from "@/security/csrf";

type ApiHandler = (
  request: NextRequest,
  context: { requestId: string; params?: Record<string, string | string[] | undefined> }
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
    routeContext: { params: Promise<Record<string, string | string[] | undefined>> }
  ) {
    const requestId = generateRequestId();
    const ip = getClientIp(request.headers);
    const moduleName = options.module ?? "api";
    const start = Date.now();

    try {
      if (options.rateLimit) {
        const allowed = await checkRateLimit(
          `${moduleName}:${ip}`,
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

      // A body that is not valid JSON is a client error (400), not an
      // unexpected server failure — handlers that tolerate a missing body
      // still catch this themselves.
      const readJson = request.json.bind(request);
      request.json = () =>
        readJson().catch(() => {
          throw AppError.badRequest("Request body must be valid JSON");
        });

      const params = await routeContext.params;
      const response = await handler(request, { requestId, params });

      logger.info({
        requestId,
        module: moduleName,
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
          module: moduleName,
          code: validationError.code,
          details: error.issues,
          path: request.nextUrl.pathname,
        });
        return NextResponse.json(
          apiError(validationError.code, validationError.message, requestId, error.issues),
          { status: validationError.statusCode }
        );
      }

      // Decide on the status actually returned: client errors (4xx — including
      // converted ones such as a unique-constraint 409) are warnings; every
      // 5xx is logged with the original exception and sent to Sentry.
      if (appError.statusCode < 500) {
        logger.warn({
          requestId,
          module: moduleName,
          code: appError.code,
          message: appError.message,
          path: request.nextUrl.pathname,
        });
      } else {
        logger.error({
          requestId,
          module: moduleName,
          err: error,
          path: request.nextUrl.pathname,
        });
        captureException(error, { requestId, module: moduleName, path: request.nextUrl.pathname });
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
