# Database Integration - Neon PostgreSQL

This document describes the database integration for the Finance Graphs application using Neon PostgreSQL.

## Overview

The application has been migrated from localStorage to Neon PostgreSQL to enable:
- Persistent data storage across devices
- Multi-user support (ready for future authentication)
- Scalable data management
- Cross-device synchronization

## Architecture

### Database Provider
**Neon PostgreSQL** - Serverless Postgres with automatic scaling

### ORM & Database Client
- **Drizzle ORM** - Type-safe SQL operations
- **@neondatabase/serverless** - Serverless-compatible Postgres driver

### Current User Model
The application uses a **default user** approach:
- Single user ID: `00000000-0000-0000-0000-000000000001`
- All data is scoped to this default user
- Schema is designed to support multiple users (ready for auth)

## Database Schema

### Tables

#### 1. `users`
```sql
- id: UUID (primary key)
- email: VARCHAR(255) (unique)
- name: VARCHAR(255)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 2. `categories`
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key → users.id)
- name: VARCHAR(255)
- color: VARCHAR(50)
- is_default: BOOLEAN
- created_at: TIMESTAMP
```

#### 3. `transactions`
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key → users.id)
- date: DATE
- description: TEXT
- amount: DECIMAL(12,2)
- transaction_type: VARCHAR(10) ('Debit' or 'Credit')
- category_id: UUID (foreign key → categories.id, nullable)
- original_description: TEXT (nullable)
- raw_data: JSONB (nullable)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 4. `categorization_rules`
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key → users.id)
- category_id: UUID (foreign key → categories.id)
- keywords: TEXT[] (array of keywords)
- match_case: BOOLEAN
- enabled: BOOLEAN
- priority: INTEGER
- created_at: TIMESTAMP
```

#### 5. `user_settings`
```sql
- user_id: UUID (primary key, foreign key → users.id)
- enable_ai_cleaning: BOOLEAN
- claude_api_key: VARCHAR(255) (nullable)
- updated_at: TIMESTAMP
```

### Indexes
- `idx_transactions_user_date` on (user_id, date)
- `idx_transactions_category` on (category_id)
- `idx_categories_user` on (user_id)
- `idx_rules_user_priority` on (user_id, priority)

## API Endpoints

### Transactions
- `GET /api/transactions` - List all transactions
- `POST /api/transactions` - Create transaction(s)
- `PATCH /api/transactions/[id]` - Update transaction
- `DELETE /api/transactions/[id]` - Delete transaction
- `DELETE /api/transactions` - Delete all transactions

### Categories
- `GET /api/categories` - List all categories
- `POST /api/categories` - Create category
- `PATCH /api/categories/[id]` - Update category
- `DELETE /api/categories/[id]` - Delete category

### Categorization Rules
- `GET /api/rules` - List all rules
- `POST /api/rules` - Create rule
- `PATCH /api/rules/[id]` - Update rule
- `DELETE /api/rules/[id]` - Delete rule

### Settings
- `GET /api/settings` - Get user settings
- `PATCH /api/settings` - Update settings

## Database Commands

### Setup & Migration
```bash
# Install dependencies
npm install

# Push schema to database
npm run db:push

# Seed default data (user, categories, rules)
npm run db:seed

# Open Drizzle Studio (database GUI)
npm run db:studio
```

### Development
```bash
# Generate migration files (for production)
npm run db:generate

# Run migrations
npm run db:migrate
```

## Environment Variables

Add to `.env`:
```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

**Note**: Never commit `.env` to version control.

## Default Data

The database is seeded with:

### 10 Default Categories
1. Groceries (blue)
2. Dining & Restaurants (purple)
3. Transportation (green)
4. Utilities (yellow)
5. Entertainment (pink)
6. Healthcare (red)
7. Shopping (indigo)
8. Income (emerald)
9. Transfers (gray)
10. Other (slate)

### 9 Default Categorization Rules
Rules for auto-categorizing transactions based on keywords like:
- Groceries: WALMART, KROGER, SAFEWAY, etc.
- Dining: STARBUCKS, RESTAURANT, PIZZA, etc.
- Transportation: UBER, LYFT, GAS, etc.
- Income: SALARY, PAYROLL, DEPOSIT, etc.

## Migration from localStorage

### What Changed
- **Before**: All data stored in browser localStorage
- **After**: All data stored in Neon PostgreSQL
- **Benefit**: Data persists across devices and browsers

### Data Migration
Old localStorage data is **not automatically migrated**. Users will need to:
1. Export their CSV from the old version
2. Re-upload it to the new version

Alternatively, you can build a migration tool that:
1. Reads from localStorage
2. POSTs to `/api/transactions`, `/api/categories`, etc.

## Adding User Authentication

The schema is ready for multi-user support. To add authentication:

### 1. Choose Auth Provider
Options: Clerk, Auth.js, Supabase Auth, etc.

### 2. Update `src/utils/auth.ts`
Replace `getCurrentUserId()`:
```typescript
export function getCurrentUserId(): string {
  const session = getSession(); // Your auth provider's session
  return session?.userId ?? DEFAULT_USER_ID;
}
```

### 3. Add Login/Signup UI
Create authentication pages and update routes.

### 4. Protect API Routes
Add middleware to verify user sessions before accessing data.

No database schema changes needed - all tables already have `user_id`!

## Type Safety

Drizzle provides full TypeScript types:

```typescript
import type { Transaction, Category } from './db/schema';

// Inferred types from database schema
const transaction: Transaction = {
  id: '...',
  userId: '...',
  date: '2024-01-01',
  amount: '100.00',
  // ... fully typed
};
```

## Troubleshooting

### Connection Issues
```bash
# Test database connection
npm run db:studio
```
If it fails, check:
- DATABASE_URL is correct
- Neon project is active
- IP whitelist (Neon allows all IPs by default)

### Schema Out of Sync
```bash
# Reset and re-push schema
npm run db:push

# Re-seed default data
npm run db:seed
```

### TypeScript Errors
```bash
# Rebuild types
npm run build
```

## Performance Considerations

- **Indexes**: Already added for common queries
- **Connection Pooling**: Handled by @neondatabase/serverless
- **Caching**: Consider adding Redis for frequently accessed data
- **Pagination**: Add limit/offset to transaction queries for large datasets

## Security

- ✅ All API routes use server-side database client
- ✅ DATABASE_URL never exposed to browser
- ✅ User data scoped by user_id
- ⚠️ No authentication yet (single default user)
- ⚠️ API endpoints should add auth middleware before production

## Next Steps

1. **Add Authentication** - Implement user login/signup
2. **Add Pagination** - Limit transactions per page
3. **Add Filtering** - Filter by date range, category, amount
4. **Add Export** - Export transactions to CSV
5. **Add Data Visualization** - Charts and graphs
6. **Add Budgets** - Track spending against budgets

## Resources

- [Neon Documentation](https://neon.tech/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Astro Server Endpoints](https://docs.astro.build/en/core-concepts/endpoints/)
