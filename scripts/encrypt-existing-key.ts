/**
 * Encrypt existing plain text API key in database
 *
 * Usage: npx tsx scripts/encrypt-existing-key.ts
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { encrypt, isEncrypted } from '../src/utils/encryption';

async function encryptExistingKey() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    console.log('🔐 Encrypting existing API key...\n');

    const userId = '00000000-0000-0000-0000-000000000001';

    const settings = await db.query.userSettings.findFirst({
      where: eq(schema.userSettings.userId, userId),
    });

    if (!settings?.claudeApiKey) {
      console.log('No API key found in database.');
      return;
    }

    if (isEncrypted(settings.claudeApiKey)) {
      console.log('✅ API key is already encrypted. Nothing to do!');
      return;
    }

    console.log('📝 Found plain text API key. Encrypting...');

    const encryptedKey = encrypt(settings.claudeApiKey);

    await db.update(schema.userSettings)
      .set({ claudeApiKey: encryptedKey })
      .where(eq(schema.userSettings.userId, userId));

    console.log('✅ API key encrypted successfully!');
    console.log('\nYour API key is now securely stored in the database.\n');
  } catch (error) {
    console.error('❌ Failed to encrypt API key:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

encryptExistingKey().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
