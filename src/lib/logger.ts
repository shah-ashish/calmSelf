/**
 * Privacy-preserving logger.
 * In accordance with Section 5: NEVER logs user-written message text or personal data.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class AppLogger {
  private level: LogLevel = __DEV__ ? 'debug' : 'info';

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.level === 'debug') {
      console.log(`[DEBUG] ${message}`, context ?? '');
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    console.info(`[INFO] ${message}`, context ?? '');
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(`[WARN] ${message}`, context ?? '');
  }

  error(message: string, error?: unknown): void {
    console.error(`[ERROR] ${message}`, error ?? '');
  }
}

export const logger = new AppLogger();
