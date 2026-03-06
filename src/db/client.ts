import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import type { Logger } from 'drizzle-orm/logger';
import * as schema from './schema';

// Configure for serverless
neonConfig.fetchConnectionCache = true;

// Environment detection (handle both Astro and Node.js environments)
const isDev = typeof import.meta.env !== 'undefined'
  ? import.meta.env.DEV
  : process.env.NODE_ENV !== 'production';

// Query logger for development debugging
class QueryLogger implements Logger {
  logQuery(query: string, params: unknown[]): void {
    if (!isDev) return;

    const timestamp = new Date().toISOString();
    const formattedParams = params.length > 0
      ? `\n  Params: ${JSON.stringify(params, null, 2)}`
      : '';

    console.log(`\n[DB ${timestamp}] Query:
  ${query}${formattedParams}
`);
  }
}

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 100,
  maxDelayMs: 2000,
  retryableErrors: [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'connection terminated',
    'Connection terminated unexpectedly',
    'sorry, too many clients already',
    'remaining connection slots are reserved',
    'Cannot acquire a connection from the pool',
    'timeout expired',
    'connect ETIMEDOUT',
  ],
};

// Check if an error is retryable
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  const code = (error as NodeJS.ErrnoException).code;

  return RETRY_CONFIG.retryableErrors.some(
    (retryable) =>
      message.includes(retryable.toLowerCase()) ||
      code === retryable
  );
}

// Calculate delay with exponential backoff and jitter
function getRetryDelay(attempt: number): number {
  const exponentialDelay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, RETRY_CONFIG.maxDelayMs);
  // Add jitter (0-25% of delay)
  const jitter = cappedDelay * Math.random() * 0.25;
  return cappedDelay + jitter;
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry wrapper for database operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!isRetryableError(error) || attempt === RETRY_CONFIG.maxRetries) {
        throw lastError;
      }

      const delay = getRetryDelay(attempt);

      if (isDev) {
        console.warn(
          `[DB Retry] ${context || 'Operation'} failed (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}): ${lastError.message}. Retrying in ${Math.round(delay)}ms...`
        );
      }

      await sleep(delay);
    }
  }

  throw lastError;
}

// Get database URL (handle both Astro and Node.js environments)
const databaseUrl = typeof import.meta.env !== 'undefined'
  ? import.meta.env.DATABASE_URL
  : process.env.DATABASE_URL;

// Create connection pool with error handling
const pool = new Pool({
  connectionString: databaseUrl,
  // Connection pool settings for serverless
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Log pool errors in development
if (isDev) {
  pool.on('error', (err) => {
    console.error('[DB Pool Error]', err.message);
  });

  pool.on('connect', () => {
    console.log('[DB Pool] New connection established');
  });
}

// Create drizzle instance with schema and logger
export const db = drizzle(pool, {
  schema,
  logger: new QueryLogger(),
});

// Export schema for use in queries
export { schema };

// Health check function
export async function checkConnection(): Promise<boolean> {
  try {
    await withRetry(async () => {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
      } finally {
        client.release();
      }
    }, 'Health check');
    return true;
  } catch (error) {
    if (isDev) {
      console.error('[DB Health Check Failed]', error);
    }
    return false;
  }
}
