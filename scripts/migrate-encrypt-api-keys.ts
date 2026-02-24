/**
 * Migration Script: Encrypt existing API keys in database
 *
 * This script encrypts any plain-text API keys that exist in the database.
 * Run this once after implementing encryption to migrate existing data.
 *
 * Usage: npx tsx scripts/migrate-encrypt-api-keys.ts
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../src/db/schema';
import { isEncrypted, encrypt } from '../src/utils/encryption';

async function migrateApiKeys() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    console.log('🔐 Starting API key encryption migration...\n');

    // Fetch all user settings
    const allSettings = await db.query.userSettings.findMany();

    if (allSettings.length === 0) {
      console.log('No user settings found. Nothing to migrate.');
      return;
    }

    let encryptedCount = 0;
    let alreadyEncryptedCount = 0;
    let emptyCount = 0;

    for (const settings of allSettings) {
      const apiKey = settings.claudeApiKey;

      if (!apiKey) {
        emptyCount++;
        continue;
      }

      // Check if already encrypted
      if (isEncrypted(apiKey)) {
        alreadyEncryptedCount++;
        console.log(`✓ User ${settings.userId}: API key already encrypted`);
        continue;
      }

      // Encrypt the plain-text API key
      console.log(`🔒 User ${settings.userId}: Encrypting API key...`);
      const encryptedKey = encrypt(apiKey);

      // Update in database
      await db.update(schema.userSettings)
        .set({ claudeApiKey: encryptedKey })
        .where(schema.userSettings.userId.eq(settings.userId));

      encryptedCount++;
      console.log(`✓ User ${settings.userId}: API key encrypted successfully`);
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   Total settings: ${allSettings.length}`);
    console.log(`   Encrypted: ${encryptedCount}`);
    console.log(`   Already encrypted: ${alreadyEncryptedCount}`);
    console.log(`   Empty/null: ${emptyCount}`);
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration
migrateApiKeys().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
