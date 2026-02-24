import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as schema from './schema';

// Configure for serverless
neonConfig.fetchConnectionCache = true;

// Create connection pool
const pool = new Pool({ connectionString: import.meta.env.DATABASE_URL });

// Create drizzle instance with schema
export const db = drizzle(pool, { schema });

// Export schema for use in queries
export { schema };
