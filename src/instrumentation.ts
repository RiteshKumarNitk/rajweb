export async function register() {
  if (process.env.SENTRY_DSN) {
    if (process.env.NEXT_RUNTIME === "nodejs") {
      await import("./sentry.server.config");
    }
    if (process.env.NEXT_RUNTIME === "edge") {
      await import("./sentry.edge.config");
    }
  }
}

export async function onRequestError(
  err: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string }
) {
  const { captureException } = await import("./core/monitoring/sentry");
  captureException(err, { path: request.path, method: request.method, ...context });
}
