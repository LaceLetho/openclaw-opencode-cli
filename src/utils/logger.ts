/**
 * Structured logging utility for Railway Dashboard visibility
 * Outputs to stdout/stderr for Railway log capture
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private level: LogLevel;
  private prefix: string;

  constructor(prefix = "[openclaw-opencode]") {
    this.prefix = prefix;
    this.level = this.getLogLevelFromEnv();
  }

  private getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
    if (envLevel && envLevel in LOG_LEVELS) {
      return envLevel;
    }
    return "info";
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} ${this.prefix} [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog("debug")) {
      console.log(this.formatMessage("debug", message, meta));
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog("info")) {
      console.log(this.formatMessage("info", message, meta));
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, meta));
    }
  }

  error(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("error", message, meta));
    }
  }

  /**
   * Log an HTTP request/response cycle
   */
  http(method: string, url: string, status?: number, duration?: number): void {
    if (this.shouldLog("debug")) {
      const meta: Record<string, unknown> = { method, url };
      if (status) meta.status = status;
      if (duration) meta.duration = `${duration}ms`;
      this.debug("HTTP request", meta);
    }
  }

  /**
   * Log a session lifecycle event
   */
  session(action: string, sessionId: string, meta?: Record<string, unknown>): void {
    this.info(`Session ${action}`, { sessionId, ...meta });
  }

  /**
   * Log a task lifecycle event
   */
  task(action: string, taskId: string, meta?: Record<string, unknown>): void {
    this.info(`Task ${action}`, { taskId, ...meta });
  }

  /**
   * Log callback registration and execution
   */
  callback(action: string, sessionId: string, meta?: Record<string, unknown>): void {
    this.info(`Callback ${action}`, { sessionId, ...meta });
  }
}

export const logger = new Logger();
export default logger;
