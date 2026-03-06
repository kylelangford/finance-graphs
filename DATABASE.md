# Database Integration - Neon PostgreSQL

This document describes the database integration for the Finance Graphs application using Neon PostgreSQL.

## Overview

The application uses Neon PostgreSQL for:
- Persistent data storage across devices
- Multi-user support with magic link authentication
- Scalable data management with cursor-based pagination
- Encrypted storage for sensitive API keys

## Architecture

### Database Provider
**Neon PostgreSQL** - Serverless Postgres with automatic scaling

### ORM & Database Client
- **Drizzle ORM** (`drizzle-orm@0.45.1`) - Type-safe SQL operations
- **@neondatabase/serverless** - Serverless-compatible Postgres driver with connection pooling

### Connection Setup
The database client (`src/db/client.ts`) uses:
- Connection pooling via `Pool` from @neondatabase/serverless
- `fetchConnectionCache = true` for optimized serverless performance
- SSL required for all connections
- Automatic retry logic for transient connection errors
- Query logging in development mode

### Connection Pool Settings
```typescript
{
  max: 10,                      // Maximum connections
  idleTimeoutMillis: 30000,     // Close idle connections after 30s
  connectionTimeoutMillis: 10000 // Timeout after 10s
}
```

### Retry Logic
The client automatically retries failed operations for transient errors:
- **Max retries**: 3 attempts
- **Backoff**: Exponential with jitter (100ms → 200ms → 400ms, capped at 2s)
- **Retryable errors**: Connection resets, timeouts, pool exhaustion, Neon cold starts

```typescript
import { withRetry } from '@/db/client';

// Wrap critical operations
const result = await withRetry(
  () => db.query.users.findFirst({ where: eq(users.id, userId) }),
  'Fetch user'
);
```

### Query Logging (Development)
In development mode (`import.meta.env.DEV`), all queries are logged:
```
[DB 2024-01-15T10:30:00.000Z] Query:
  SELECT * FROM users WHERE id = $1
  Params: ["abc-123"]
```

Pool events are also logged:
- `[DB Pool] New connection established`
- `[DB Pool Error] <error message>`
- `[DB Retry] Operation failed (attempt 1/4): <error>. Retrying in 150ms...`

### Health Check
Test database connectivity:
```typescript
import { checkConnection } from '@/db/client';

const isHealthy = await checkConnection(); // true or false
```

## Duplicate Detection

When importing transactions, the system automatically detects and skips duplicates to prevent the same transaction from being imported twice (e.g., when re-uploading the same CSV file).

### How It Works

1. **Fingerprint Generation**: Each transaction gets a unique fingerprint:
   ```
   {date}|{originalDescription.toLowerCase()}|{amount}
   ```

2. **Server-Side Check**: The API queries existing transactions in the date range of the import and builds a fingerprint set for O(1) lookup.

3. **Batch Deduplication**: Duplicates within the same import batch are also detected.

4. **Response**: The API returns counts of imported vs skipped transactions.

### Fingerprint Components

| Component | Source | Normalization |
|-----------|--------|---------------|
| Date | `transaction.date` | YYYY-MM-DD format |
| Description | `originalDescription` or `description` | Lowercase, trimmed |
| Amount | `transaction.amount` | Rounded to 2 decimal places |

### Edge Cases

- **Same-day purchases**: Two $5.00 purchases at "STARBUCKS" on the same day will be considered duplicates. This is intentional to prevent double-imports, but may occasionally skip legitimate transactions.
- **Description cleaning**: If AI cleaning modifies the description, the `originalDescription` field preserves the raw CSV value for accurate duplicate detection.

## Database Schema

### Tables (7 total)

#### 1. `users`
Primary user accounts table.
```sql
- id: UUID (primary key, auto-generated)
- email: VARCHAR(255) (unique, required)
- name: VARCHAR(255) (optional)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 2. `sessions`
Authentication sessions for logged-in users.
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key → users.id, cascade delete)
- token: VARCHAR(255) (unique)
- expires_at: TIMESTAMP (30 days from creation)
- created_at: TIMESTAMP
```
**Indexes**: `idx_sessions_user`, `idx_sessions_token`

#### 3. `auth_tokens`
Magic link and invite tokens for authentication.
```sql
- id: UUID (primary key)
- email: VARCHAR(255)
- token: VARCHAR(255) (unique)
- type: VARCHAR(20) ('magic_link' or 'invite')
- invited_by: UUID (optional, foreign key → users.id)
- expires_at: TIMESTAMP (15 min for magic links, 48 hours for invites)
- used_at: TIMESTAMP (nullable)
- created_at: TIMESTAMP
```
**Indexes**: `idx_auth_tokens_token`, `idx_auth_tokens_email`

#### 4. `categories`
Transaction categories for organizing expenses.
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key → users.id, cascade delete)
- name: VARCHAR(255)
- color: VARCHAR(50)
- is_default: BOOLEAN (default false)
- created_at: TIMESTAMP
```
**Index**: `idx_categories_user`

#### 5. `transactions`
Financial transaction records.
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key → users.id, cascade delete)
- date: DATE
- description: TEXT
- amount: DECIMAL(12,2)
- transaction_type: VARCHAR(10) ('Debit' or 'Credit')
- category_id: UUID (optional, foreign key → categories.id)
- original_description: TEXT (optional)
- raw_data: JSONB (optional, stores parsed CSV data)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```
**Indexes**: `idx_transactions_user_date` (composite), `idx_transactions_category`

#### 6. `categorization_rules`
Keyword-based auto-categorization rules.
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key → users.id, cascade delete)
- category_id: UUID (foreign key → categories.id, cascade delete)
- keywords: TEXT[] (PostgreSQL array)
- match_case: BOOLEAN (default false)
- enabled: BOOLEAN (default true)
- priority: INTEGER (default 0, higher = runs first)
- created_at: TIMESTAMP
```
**Index**: `idx_rules_user_priority` (composite)

#### 7. `user_settings`
Per-user application settings.
```sql
- user_id: UUID (primary key, foreign key → users.id, cascade delete)
- enable_ai_cleaning: BOOLEAN (default false)
- claude_api_key: VARCHAR(255) (optional, ENCRYPTED with AES-256-GCM)
- custom_prompt: TEXT (optional)
- updated_at: TIMESTAMP
```

## Authentication System

### Magic Link Flow
1. **Login Request** (`POST /api/auth/login`)
   - User submits email
   - System creates auth token (15-minute expiry)
   - Sends magic link via Resend email service

2. **Token Verification** (`GET /api/auth/verify?token=xxx`)
   - Validates token (not expired, not used)
   - Marks token as used
   - Creates session (30-day expiry)
   - Sets HTTPOnly session cookie
   - Redirects to app

3. **Invite Flow** (`POST /api/auth/invite`)
   - Authenticated user sends invite
   - Creates invite token (48-hour expiry)
   - New user created on first verification

### Session Management
- Sessions stored in database with 30-day expiry
- HTTPOnly, Secure, SameSite cookies
- Token validated on each authenticated request
- Automatic cleanup of expired sessions/tokens

## API Endpoints

### Authentication (No auth required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Send magic link email |
| GET | `/api/auth/verify` | Verify token and create session |

### Authentication (Auth required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | End session |
| POST | `/api/auth/invite` | Send invite to new user |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List transactions (paginated) |
| POST | `/api/transactions` | Create transaction(s) with duplicate detection |
| PATCH | `/api/transactions/[id]` | Update transaction |
| DELETE | `/api/transactions/[id]` | Delete transaction |
| DELETE | `/api/transactions?ids=[...]` | Bulk delete transactions |

**Pagination Parameters:**
- `limit` - Number of records (default 50, max 100)
- `cursor` - ISO date string for pagination
- `cursorId` - UUID for tie-breaking same dates

**Import Response (POST):**
```typescript
{
  imported: number;      // Count of new transactions added
  skipped: number;       // Count of duplicates skipped
  duplicates: Array<{    // First 10 skipped duplicates (for display)
    date: string;
    description: string;
    amount: number;
  }>;
  transactions: Transaction[];  // The newly created transactions
}
```

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | List all categories |
| POST | `/api/categories` | Create category |
| PATCH | `/api/categories/[id]` | Update category |
| DELETE | `/api/categories/[id]` | Delete category |

### Categorization Rules
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rules` | List all rules (ordered by priority) |
| POST | `/api/rules` | Create rule |
| PATCH | `/api/rules/[id]` | Update rule |
| DELETE | `/api/rules/[id]` | Delete rule |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get user settings (API key decrypted) |
| PATCH | `/api/settings` | Update settings (API key encrypted) |

## Database Commands

```bash
# Push schema to database
npm run db:push

# Seed default data (categories, rules)
npm run db:seed

# Generate migration files
npm run db:generate

# Run migrations
npm run db:migrate

# Open Drizzle Studio GUI
npm run db:studio

# Encrypt existing plain-text API keys
npm run db:migrate-encrypt
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `ENCRYPTION_KEY` | Yes | 32-byte hex string for AES-256-GCM encryption |
| `RESEND_API_KEY` | Yes | Resend email service API key |
| `PUBLIC_APP_URL` | Yes | Base URL for email links |
| `CLAUDE_API_KEY` | No | Server-side Claude API key (fallback) |

Example `.env`:
```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
ENCRYPTION_KEY=your-64-character-hex-encryption-key-here
RESEND_API_KEY=re_xxxxxxxxxxxxx
PUBLIC_APP_URL=http://localhost:4321
```

## Encryption

### Implementation (`src/utils/encryption.ts`)
- **Algorithm**: AES-256-GCM (NIST-approved authenticated encryption)
- **Key Derivation**: scrypt with configurable salt
- **Per-encryption**: Random IV + random salt
- **Storage Format**: `base64(IV : salt : authTag : encryptedData)`

### What's Encrypted
- `user_settings.claude_api_key` - User's Claude API key

### Migration Script
Run `npm run db:migrate-encrypt` to encrypt existing plain-text API keys.

## Default Data (Seeded)

### 10 Default Categories
| Category | Color |
|----------|-------|
| Groceries | green |
| Dining & Restaurants | orange |
| Transportation | blue |
| Utilities | amber |
| Entertainment | pink |
| Healthcare | red |
| Shopping | purple |
| Income | emerald |
| Transfers | cyan |
| Other | slate |

### 9 Default Categorization Rules
Auto-categorization based on keywords:
- **Groceries**: WALMART, SAFEWAY, WHOLE FOODS, TRADER JOE, COSTCO...
- **Dining**: RESTAURANT, CAFE, COFFEE, STARBUCKS, DOORDASH...
- **Transportation**: GAS, UBER, LYFT, TRANSIT, PARKING...
- **Utilities**: ELECTRIC, WATER, INTERNET, PHONE...
- **Entertainment**: NETFLIX, SPOTIFY, HULU, MOVIE, STEAM...
- **Healthcare**: PHARMACY, CVS, WALGREENS, DOCTOR, HOSPITAL...
- **Shopping**: AMAZON, EBAY, ETSY, STORE, RETAIL...
- **Income**: SALARY, PAYROLL, DEPOSIT, DIRECT DEP...
- **Transfers**: TRANSFER, VENMO, PAYPAL, ZELLE, CASH APP...

## Security

### Implemented
- AES-256-GCM encryption for sensitive API keys
- HTTPOnly, Secure, SameSite session cookies
- Server-side database client (never exposed to browser)
- User data isolation by `user_id` in all queries
- Magic link tokens (15-minute expiry)
- Invite tokens (48-hour expiry)
- Session tokens (30-day expiry)
- Token reuse prevention
- Foreign key constraints with cascading deletes
- SSL required for database connections
- Automatic retry for transient connection errors
- Query logging in development mode
- Duplicate transaction detection on import

### Recommendations for Production
- Add API rate limiting
- Add security event logging (failed logins, etc.)
- Consider API key rotation strategy
- Add CSRF protection for state-changing operations

## Type Safety

Drizzle provides full TypeScript types exported from `src/db/schema.ts`:

```typescript
import type {
  User, NewUser,
  Session, NewSession,
  AuthToken, NewAuthToken,
  Category, NewCategory,
  Transaction, NewTransaction,
  CategorizationRule, NewCategorizationRule,
  UserSettings, NewUserSettings
} from './db/schema';
```

## File Structure

```
/src
├── /db
│   ├── schema.ts          # Table definitions & relationships
│   ├── client.ts          # Drizzle + Neon connection pool
│   └── seed.ts            # Default data seeding
├── /pages/api
│   ├── /auth              # Authentication endpoints
│   ├── /transactions      # Transaction CRUD
│   ├── /categories        # Category CRUD
│   ├── /rules             # Rule CRUD
│   └── settings.ts        # User settings
├── /utils
│   ├── auth.ts            # Auth functions & user initialization
│   ├── encryption.ts      # AES-256-GCM encryption
│   └── apiClient.ts       # Client-side API wrapper
└── /scripts
    └── migrate-encrypt-api-keys.ts  # Encryption migration
```

## Troubleshooting

### Connection Issues
```bash
npm run db:studio  # Test database connection
```
Check:
- DATABASE_URL is correct
- Neon project is active
- SSL mode is enabled (`?sslmode=require`)

### Schema Out of Sync
```bash
npm run db:push    # Re-push schema
npm run db:seed    # Re-seed default data
```

### Encryption Issues
```bash
npm run db:migrate-encrypt  # Re-run encryption migration
```
Check:
- ENCRYPTION_KEY is set and is 64 hex characters
- Key hasn't changed since data was encrypted

## Resources

- [Neon Documentation](https://neon.tech/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Astro Server Endpoints](https://docs.astro.build/en/core-concepts/endpoints/)
- [Resend Email Documentation](https://resend.com/docs)
