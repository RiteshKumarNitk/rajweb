type SentryModule = typeof import("@sentry/nextjs");

let sentryModule: SentryModule | null = null;

async function getSentry(): Promise<SentryModule | null> {
  if (!process.env.SENTRY_DSN) return null;
  if (!sentryModule) {
    sentryModule = await import("@sentry/nextjs");
  }
  return sentryModule;
}

export async function initSentry(options: {
  dsn?: string;
  tracesSampleRate?: number;
  environment?: string;
}) {
  const dsn = options.dsn ?? process.env.SENTRY_DSN;
  if (!dsn) return;

  const Sentry = await getSentry();
  if (!Sentry) return;

  Sentry.init({
    dsn,
    tracesSampleRate: options.tracesSampleRate ?? 0.1,
    environment: options.environment ?? process.env.NODE_ENV,
  });
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!process.env.SENTRY_DSN) return;

  void getSentry().then((Sentry) => {
    if (!Sentry) return;
    Sentry.captureException(error, { extra: context });
  });
}
