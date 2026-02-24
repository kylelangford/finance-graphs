import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { randomBytes } from 'crypto';

const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
});

const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  token: varchar('token', { length: 255 }).unique().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

async function createSession() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    const userList = await db.select().from(users).where(eq(users.email, 'kyle.langford@gmail.com'));
    const user = userList[0];

    if (!user) {
      console.log('User not found!');
      return;
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db.insert(sessions).values({
      userId: user.id,
      token,
      expiresAt,
    });

    console.log('Session created!');
    console.log('\nTo log in, run this in your browser console:\n');
    console.log(`document.cookie = "session_token=${token}; path=/; max-age=2592000"; location.reload();`);

  } finally {
    await pool.end();
  }
}

createSession();
