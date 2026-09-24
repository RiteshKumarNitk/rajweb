import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        },
      }
    : {}),
  base: {
    app: "rra-platform",
    env: process.env.NODE_ENV,
  },
  redact: {
    paths: ["password", "passwordHash", "token", "authorization", "cookie"],
    censor: "[REDACTED]",
  },
});

export type LogContext = {
  requestId?: string;
  userId?: string;
  module?: string;
  action?: string;
  [key: string]: unknown;
};

export function createModuleLogger(module: string) {
  return logger.child({ module });
}
