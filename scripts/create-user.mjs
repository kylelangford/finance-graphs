import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { pgTable, uuid, varchar, timestamp, boolean, text, integer } from 'drizzle-orm/pg-core';

const USER_EMAIL = 'kyle.langford@gmail.com';
const USER_NAME = 'Kyle Langford';

// Define schema inline for this script
const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

const userSettings = pgTable('user_settings', {
  userId: uuid('user_id').primaryKey(),
  enableAiCleaning: boolean('enable_ai_cleaning').default(false).notNull(),
  claudeApiKey: varchar('claude_api_key', { length: 255 }),
  customPrompt: text('custom_prompt'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  color: varchar('color', { length: 50 }).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

const categorizationRules = pgTable('categorization_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  categoryId: uuid('category_id').notNull(),
  keywords: text('keywords').array().notNull(),
  matchCase: boolean('match_case').default(false).notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  priority: integer('priority').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Default categories
const DEFAULT_CATEGORIES = [
  { name: 'Groceries', color: 'blue' },
  { name: 'Dining & Restaurants', color: 'purple' },
  { name: 'Transportation', color: 'green' },
  { name: 'Utilities', color: 'yellow' },
  { name: 'Entertainment', color: 'pink' },
  { name: 'Healthcare', color: 'red' },
  { name: 'Shopping', color: 'indigo' },
  { name: 'Income', color: 'emerald' },
  { name: 'Transfers', color: 'gray' },
  { name: 'Other', color: 'slate' },
];

// Default categorization rules
const DEFAULT_RULES = [
  { categoryName: 'Groceries', keywords: ['GROCERY', 'SAFEWAY', 'WHOLE FOODS', 'TRADER JOE', 'COSTCO', 'WALMART', 'TARGET', 'KROGER', 'PUBLIX', 'ALDI'], priority: 10 },
  { categoryName: 'Dining & Restaurants', keywords: ['RESTAURANT', 'CAFE', 'COFFEE', 'PIZZA', 'BURGER', 'STARBUCKS', 'DOORDASH', 'UBER EATS', 'GRUBHUB', 'CHIPOTLE', 'MCDONALDS'], priority: 9 },
  { categoryName: 'Transportation', keywords: ['GAS', 'FUEL', 'SHELL', 'CHEVRON', 'EXXON', 'PARKING', 'UBER', 'LYFT', 'TRANSIT', 'METRO', 'TOLL'], priority: 8 },
  { categoryName: 'Utilities', keywords: ['ELECTRIC', 'WATER', 'GAS COMPANY', 'INTERNET', 'PHONE', 'MOBILE', 'COMCAST', 'VERIZON', 'AT&T', 'T-MOBILE'], priority: 7 },
  { categoryName: 'Entertainment', keywords: ['NETFLIX', 'SPOTIFY', 'HULU', 'DISNEY', 'HBO', 'MOVIE', 'THEATER', 'CONCERT', 'STEAM', 'GAMING', 'APPLE MUSIC', 'YOUTUBE'], priority: 6 },
  { categoryName: 'Healthcare', keywords: ['PHARMACY', 'CVS', 'WALGREENS', 'DOCTOR', 'MEDICAL', 'HOSPITAL', 'DENTAL', 'VISION', 'HEALTH', 'CLINIC'], priority: 5 },
  { categoryName: 'Shopping', keywords: ['AMAZON', 'EBAY', 'ETSY', 'SHOP', 'STORE', 'RETAIL', 'BEST BUY', 'HOME DEPOT', 'LOWES', 'IKEA'], priority: 4 },
  { categoryName: 'Income', keywords: ['SALARY', 'PAYROLL', 'DEPOSIT', 'DIRECT DEP', 'PAYMENT RECEIVED', 'INCOME', 'WAGES'], priority: 11 },
  { categoryName: 'Transfers', keywords: ['TRANSFER', 'VENMO', 'PAYPAL', 'ZELLE', 'CASH APP', 'WIRE', 'ACH'], priority: 3 },
];

async function createUser() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    console.log('Creating user:', USER_EMAIL);

    // Check if user already exists
    const existingUsers = await db.select().from(users).where(eq(users.email, USER_EMAIL.toLowerCase()));
    const existingUser = existingUsers[0];

    let userId;

    if (existingUser) {
      console.log('User already exists with ID:', existingUser.id);
      userId = existingUser.id;
    } else {
      // Create the user
      const [user] = await db.insert(users).values({
        email: USER_EMAIL.toLowerCase(),
        name: USER_NAME,
      }).returning();
      userId = user.id;
      console.log('Created user with ID:', userId);
    }

    // Check if categories exist for this user
    const existingCategories = await db.select().from(categories).where(eq(categories.userId, userId));

    if (existingCategories.length === 0) {
      console.log('Creating default categories...');
      const insertedCategories = await db.insert(categories).values(
        DEFAULT_CATEGORIES.map(cat => ({
          userId,
          name: cat.name,
          color: cat.color,
          isDefault: true,
        }))
      ).returning();
      console.log(`Created ${insertedCategories.length} categories`);

      // Create default categorization rules
      console.log('Creating default categorization rules...');
      const categoryMap = new Map(insertedCategories.map(c => [c.name, c.id]));

      const rulesToInsert = DEFAULT_RULES
        .map(rule => {
          const categoryId = categoryMap.get(rule.categoryName);
          if (!categoryId) return null;
          return {
            userId,
            categoryId,
            keywords: rule.keywords,
            matchCase: false,
            enabled: true,
            priority: rule.priority,
          };
        })
        .filter(rule => rule !== null);

      if (rulesToInsert.length > 0) {
        await db.insert(categorizationRules).values(rulesToInsert);
        console.log(`Created ${rulesToInsert.length} categorization rules`);
      }
    } else {
      console.log(`Categories already exist (${existingCategories.length} found)`);
    }

    // Ensure user has default settings
    const existingSettingsResult = await db.select().from(userSettings).where(eq(userSettings.userId, userId));

    if (existingSettingsResult.length === 0) {
      await db.insert(userSettings).values({
        userId,
        enableAiCleaning: false,
      });
      console.log('Created default settings');
    } else {
      console.log('Settings already exist');
    }

    console.log('\n========================================');
    console.log('User setup complete!');
    console.log('Email:', USER_EMAIL);
    console.log('User ID:', userId);
    console.log('========================================');
    console.log('\nUser can now log in via magic link at the login page.');

  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createUser();
