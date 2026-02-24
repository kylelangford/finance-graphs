import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { pgTable, uuid, varchar, timestamp, boolean, text, integer } from 'drizzle-orm/pg-core';

const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }),
});

const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  color: varchar('color', { length: 50 }).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
});

const categorizationRules = pgTable('categorization_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  categoryId: uuid('category_id').notNull(),
  keywords: text('keywords').array().notNull(),
  priority: integer('priority').default(0).notNull(),
});

async function checkData() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    // Get user
    const userList = await db.select().from(users).where(eq(users.email, 'kyle.langford@gmail.com'));
    const user = userList[0];

    if (!user) {
      console.log('User not found!');
      return;
    }

    console.log('User:', user.email, '- ID:', user.id);

    // Get categories for this user
    const cats = await db.select().from(categories).where(eq(categories.userId, user.id));
    console.log('\nCategories:', cats.length);
    cats.forEach(c => console.log(`  - ${c.name} (${c.color})`));

    // Get rules for this user
    const rules = await db.select().from(categorizationRules).where(eq(categorizationRules.userId, user.id));
    console.log('\nRules:', rules.length);
    rules.forEach(r => console.log(`  - Category ${r.categoryId}: ${r.keywords.slice(0, 3).join(', ')}...`));

  } finally {
    await pool.end();
  }
}

checkData();
