/**
 * Clear encrypted API key from database
 * Run this to reset if you get decryption errors
 *
 * Usage: npx tsx scripts/clear-api-key.ts
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function clearApiKey() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    console.log('🔑 Clearing API key from database...\n');

    // Get user ID
    const userId = '00000000-0000-0000-0000-000000000001';

    // Update settings to clear API key
    await db.update(schema.userSettings)
      .set({ claudeApiKey: null })
      .where(eq(schema.userSettings.userId, userId));

    console.log('✅ API key cleared successfully!');
    console.log('\nYou can now:');
    console.log('1. Go to Settings in the app');
    console.log('2. Enter your Claude API key again');
    console.log('3. It will be encrypted with the current ENCRYPTION_KEY\n');
  } catch (error) {
    console.error('❌ Failed to clear API key:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

clearApiKey().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
