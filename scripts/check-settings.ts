/**
 * Check what's in user settings
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function checkSettings() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    const userId = '00000000-0000-0000-0000-000000000001';

    const settings = await db.query.userSettings.findFirst({
      where: eq(schema.userSettings.userId, userId),
    });

    console.log('Current settings in database:');
    console.log(JSON.stringify(settings, null, 2));
    console.log('\nclaudeApiKey value:', settings?.claudeApiKey);
    console.log('claudeApiKey type:', typeof settings?.claudeApiKey);
    console.log('claudeApiKey length:', settings?.claudeApiKey?.length);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkSettings();
