/**
 * Authentication utilities for magic link / session-based auth
 */

import { randomBytes } from 'crypto';
import { db } from '../db/client';
import { sessions, authTokens, users, categories, categorizationRules, userSettings } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import type { AstroCookies } from 'astro';

// Default categories for new users
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

// Default categorization rules for new users
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

// Cookie configuration
const SESSION_COOKIE_NAME = 'session_token';
const SESSION_DURATION_DAYS = 30;
const MAGIC_LINK_EXPIRY_MINUTES = 15;
const INVITE_EXPIRY_HOURS = 48;

/**
 * Generate a cryptographically secure random token
 */
export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Get session token from cookies
 */
export function getSessionToken(cookies: AstroCookies): string | undefined {
  return cookies.get(SESSION_COOKIE_NAME)?.value;
}

/**
 * Set session cookie
 */
export function setSessionCookie(cookies: AstroCookies, token: string): void {
  cookies.set(SESSION_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60, // seconds
  });
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(cookies: AstroCookies): void {
  cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}

/**
 * Create a new session for a user
 */
export async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
  });

  return token;
}

/**
 * Validate a session token and return the user ID if valid
 */
export async function validateSession(token: string): Promise<string | null> {
  const session = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.token, token),
      gt(sessions.expiresAt, new Date())
    ),
  });

  return session?.userId ?? null;
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token));
}

/**
 * Delete all sessions for a user
 */
export async function deleteAllUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/**
 * Get user ID from request cookies
 * Returns null if not authenticated
 */
export async function getUserIdFromCookies(cookies: AstroCookies): Promise<string | null> {
  const token = getSessionToken(cookies);
  if (!token) return null;
  return validateSession(token);
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  return db.query.users.findFirst({
    where: eq(users.id, userId),
  });
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });
}

/**
 * Create a magic link token for login
 */
export async function createMagicLinkToken(email: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + MAGIC_LINK_EXPIRY_MINUTES);

  await db.insert(authTokens).values({
    email: email.toLowerCase(),
    token,
    type: 'magic_link',
    expiresAt,
  });

  return token;
}

/**
 * Create an invite token for a new user
 */
export async function createInviteToken(email: string, invitedBy: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + INVITE_EXPIRY_HOURS);

  await db.insert(authTokens).values({
    email: email.toLowerCase(),
    token,
    type: 'invite',
    invitedBy,
    expiresAt,
  });

  return token;
}

/**
 * Validate an auth token (magic link or invite)
 * Returns the token record if valid, null otherwise
 */
export async function validateAuthToken(token: string) {
  const authToken = await db.query.authTokens.findFirst({
    where: and(
      eq(authTokens.token, token),
      gt(authTokens.expiresAt, new Date())
    ),
  });

  // Check if token exists and hasn't been used
  if (!authToken || authToken.usedAt) {
    return null;
  }

  return authToken;
}

/**
 * Mark an auth token as used
 */
export async function markTokenAsUsed(token: string): Promise<void> {
  await db.update(authTokens)
    .set({ usedAt: new Date() })
    .where(eq(authTokens.token, token));
}

/**
 * Create a new user with default categories, rules, and settings
 */
export async function createUser(email: string, name?: string): Promise<string> {
  const [user] = await db.insert(users)
    .values({
      email: email.toLowerCase(),
      name,
    })
    .returning({ id: users.id });

  const userId = user.id;

  try {
    // Create default categories
    const insertedCategories = await db.insert(categories)
      .values(
        DEFAULT_CATEGORIES.map(cat => ({
          userId,
          name: cat.name,
          color: cat.color,
          isDefault: true,
        }))
      )
      .returning();

    // Create default categorization rules
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
      .filter((rule): rule is NonNullable<typeof rule> => rule !== null);

    if (rulesToInsert.length > 0) {
      await db.insert(categorizationRules).values(rulesToInsert);
    }

    // Create default settings
    await db.insert(userSettings).values({
      userId,
      enableAiCleaning: false,
    });

    console.log(`Created new user ${email} with ${insertedCategories.length} categories and ${rulesToInsert.length} rules`);
  } catch (error) {
    console.error('Error setting up defaults for new user:', error);
    // Don't fail user creation if defaults fail - they can be set up later
  }

  return userId;
}

/**
 * Check if a pending invite exists for an email
 */
export async function hasPendingInvite(email: string): Promise<boolean> {
  const invite = await db.query.authTokens.findFirst({
    where: and(
      eq(authTokens.email, email.toLowerCase()),
      eq(authTokens.type, 'invite'),
      gt(authTokens.expiresAt, new Date())
    ),
  });

  return invite !== undefined && !invite.usedAt;
}

/**
 * Require authentication - returns user ID or null
 * Use this in API routes to protect endpoints
 */
export async function requireAuth(cookies: AstroCookies): Promise<string | null> {
  return getUserIdFromCookies(cookies);
}

/**
 * Clean up expired sessions and auth tokens
 * Call this periodically (e.g., via cron job)
 */
export async function cleanupExpiredTokens(): Promise<void> {
  const now = new Date();

  // Delete expired sessions
  await db.delete(sessions).where(gt(now, sessions.expiresAt));

  // Delete expired auth tokens
  await db.delete(authTokens).where(gt(now, authTokens.expiresAt));
}
