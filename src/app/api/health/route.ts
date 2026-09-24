import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import prisma from "@/infrastructure/database/prisma";

export const GET = withApiHandler(async (_request, { requestId }) => {
  const checks: Record<string, string> = {
    app: "ok",
    database: "unknown",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "1.0.0",
    environment: process.env.NODE_ENV ?? "development",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "unavailable";
  }

  const healthy = checks.database === "ok";

  return jsonSuccess(
    { status: healthy ? "healthy" : "degraded", checks },
    requestId,
    healthy ? "Service is healthy" : "Service degraded — database unavailable",
    healthy ? 200 : 503
  );
}, { module: "health" });
