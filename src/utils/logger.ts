/**
 * Debug logging utility.
 *
 * Logging is enabled when:
 *  - localStorage key 'cicd_debug' is set to 'true', OR
 *  - the app is running in development mode (import.meta.env.DEV)
 *
 * Usage:
 *   import { logger } from '../utils/logger';
 *   logger.debug('message', data);
 *   logger.warn('message', data);
 *   logger.error('message', data);   // always logs regardless of flag
 */

const isDebugEnabled = (): boolean => {
  try {
    return (
      localStorage.getItem('cicd_debug') === 'true' ||
      import.meta.env.DEV
    );
  } catch {
    return false;
  }
};

export const logger = {
  debug(...args: unknown[]): void {
    if (isDebugEnabled()) {
      console.log('[CICD]', ...args);
    }
  },

  warn(...args: unknown[]): void {
    if (isDebugEnabled()) {
      console.warn('[CICD]', ...args);
    }
  },

  error(...args: unknown[]): void {
    // Errors always log
    console.error('[CICD]', ...args);
  },
};

export default logger;
