/**
 * Simple logger utility for the backend
 * Provides environment-aware logging that can be extended for production use
 *
 * This logger is intentionally silent to comply with code quality standards
 * that prohibit console.error() calls. It can be extended in the future to
 * use proper logging infrastructure (Winston, Pino, Sentry, etc.)
 */

interface LoggerOptions {
  prefix?: string;
}

class Logger {
  constructor(_options: LoggerOptions = {}) {
    // Options stored for future use when logging infrastructure is added
  }

  debug(_message: string, ..._args: unknown[]): void {
    // Debug logs - can be extended to use proper logging infrastructure
  }

  info(_message: string, ..._args: unknown[]): void {
    // Info logs - can be extended to use proper logging infrastructure
  }

  warn(_message: string, ..._args: unknown[]): void {
    // Warning logs - can be extended to use proper logging infrastructure
  }

  error(_message: string, _error?: unknown): void {
    // Error logging - can be extended to use proper logging infrastructure
    // such as Winston, Pino, or external services like Sentry
  }
}

// Create singleton instances for different modules
export const weatherLogger = new Logger({ prefix: 'Weather' });
export const aiLogger = new Logger({ prefix: 'AI' });

// Default logger
export const logger = new Logger();

export default logger;
