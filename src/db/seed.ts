import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from './schema';
import { DEFAULT_USER_ID } from '../utils/auth';

// Default categories with vibrant colors
const defaultCategories = [
  { name: 'Groceries', color: 'green' },
  { name: 'Dining & Restaurants', color: 'orange' },
  { name: 'Transportation', color: 'blue' },
  { name: 'Utilities', color: 'amber' },
  { name: 'Entertainment', color: 'pink' },
  { name: 'Healthcare', color: 'red' },
  { name: 'Shopping', color: 'purple' },
  { name: 'Income', color: 'emerald' },
  { name: 'Transfers', color: 'cyan' },
  { name: 'Other', color: 'slate' },
];

// Default categorization rules matching useCategorizationRules.ts
const defaultRulesKeywords = [
  { categoryName: 'Groceries', keywords: ['GROCERY', 'SAFEWAY', 'WHOLE FOODS', 'TRADER JOE', 'COSTCO', 'WALMART', 'TARGET'], priority: 10 },
  { categoryName: 'Dining & Restaurants', keywords: ['RESTAURANT', 'CAFE', 'COFFEE', 'PIZZA', 'BURGER', 'STARBUCKS', 'DOORDASH', 'UBER EATS'], priority: 9 },
  { categoryName: 'Transportation', keywords: ['GAS', 'FUEL', 'PARKING', 'UBER', 'LYFT', 'TRANSIT', 'METRO'], priority: 8 },
  { categoryName: 'Utilities', keywords: ['ELECTRIC', 'WATER', 'GAS COMPANY', 'INTERNET', 'PHONE', 'MOBILE'], priority: 7 },
  { categoryName: 'Entertainment', keywords: ['NETFLIX', 'SPOTIFY', 'HULU', 'MOVIE', 'THEATER', 'CONCERT', 'STEAM', 'GAMING'], priority: 6 },
  { categoryName: 'Healthcare', keywords: ['PHARMACY', 'CVS', 'WALGREENS', 'DOCTOR', 'MEDICAL', 'HOSPITAL', 'DENTAL'], priority: 5 },
  { categoryName: 'Shopping', keywords: ['AMAZON', 'EBAY', 'ETSY', 'SHOP', 'STORE', 'RETAIL'], priority: 4 },
  { categoryName: 'Income', keywords: ['SALARY', 'PAYROLL', 'DEPOSIT', 'DIRECT DEP', 'PAYMENT RECEIVED'], priority: 11 },
  { categoryName: 'Transfers', keywords: ['TRANSFER', 'VENMO', 'PAYPAL', 'ZELLE', 'CASH APP'], priority: 3 },
];

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    console.log('🌱 Starting database seed...');

    // Check if default user exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, DEFAULT_USER_ID),
    });

    let userId: string;

    if (!existingUser) {
      console.log('Creating default user...');
      const [user] = await db.insert(schema.users).values({
        id: DEFAULT_USER_ID,
        email: 'default@app.local',
        name: 'Default User',
      }).returning();
      userId = user.id;
      console.log('✓ Default user created');
    } else {
      console.log('✓ Default user already exists');
      userId = existingUser.id;
    }

    // Check if categories exist
    const existingCategories = await db.query.categories.findMany({
      where: (categories, { eq }) => eq(categories.userId, userId),
    });

    if (existingCategories.length === 0) {
      console.log('Creating default categories...');
      const insertedCategories = await db.insert(schema.categories).values(
        defaultCategories.map(cat => ({
          userId,
          name: cat.name,
          color: cat.color,
          isDefault: true,
        }))
      ).returning();
      console.log(`✓ Created ${insertedCategories.length} default categories`);

      // Create default rules
      console.log('Creating default categorization rules...');
      const categoryMap = new Map(insertedCategories.map(c => [c.name, c.id]));

      const rules = defaultRulesKeywords
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
        .filter(Boolean);

      if (rules.length > 0) {
        await db.insert(schema.categorizationRules).values(rules as any[]);
        console.log(`✓ Created ${rules.length} default categorization rules`);
      }
    } else {
      console.log(`✓ Categories already exist (${existingCategories.length} found)`);
    }

    // Check if settings exist
    const existingSettings = await db.query.userSettings.findFirst({
      where: (settings, { eq }) => eq(settings.userId, userId),
    });

    if (!existingSettings) {
      console.log('Creating default settings...');
      await db.insert(schema.userSettings).values({
        userId,
        enableAiCleaning: false,
      });
      console.log('✓ Default settings created');
    } else {
      console.log('✓ Settings already exist');
    }

    console.log('🎉 Database seed completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed();
