/**
 * Structured pipeline logger.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

export class AuditLogger {
  private prefix: string;

  constructor(context: string) {
    this.prefix = `[SiteLens:${context}]`;
  }

  private log(level: LogLevel, message: string, data?: unknown) {
    const timestamp = new Date().toISOString();
    const formatted = `${timestamp} ${this.prefix} [${level.toUpperCase()}] ${message}`;
    if (level === "error") {
      console.error(formatted, data ?? "");
    } else if (level === "warn") {
      console.warn(formatted, data ?? "");
    } else {
      console.log(formatted, data ?? "");
    }
  }

  debug(message: string, data?: unknown) {
    this.log("debug", message, data);
  }

  info(message: string, data?: unknown) {
    this.log("info", message, data);
  }

  warn(message: string, data?: unknown) {
    this.log("warn", message, data);
  }

  error(message: string, data?: unknown) {
    this.log("error", message, data);
  }
}
