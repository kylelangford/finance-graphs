import type { APIRoute } from 'astro';
import { db } from '../../../db/client';
import { transactions } from '../../../db/schema';
import { requireAuth } from '../../../utils/auth';
import { eq, and, desc, lt, or, inArray } from 'drizzle-orm';

// Force dynamic rendering - no caching
export const prerender = false;

const DEFAULT_PAGE_SIZE = 50;

// GET /api/transactions - List transactions with cursor-based pagination
// Query params:
//   - limit: number of items per page (default: 50)
//   - cursor: ISO date string to paginate from (optional, omit for first page)
export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const userId = await requireAuth(cookies);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const url = new URL(request.url);

    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10),
      100 // Max 100 per request
    );
    const cursor = url.searchParams.get('cursor'); // ISO date string
    const cursorId = url.searchParams.get('cursorId'); // For tie-breaking same dates

    // Build where conditions
    let whereCondition = eq(transactions.userId, userId);

    if (cursor) {
      // For cursor pagination, we need to handle tie-breaking when dates are equal
      // Get items where: date < cursor OR (date = cursor AND id < cursorId)
      if (cursorId) {
        whereCondition = and(
          eq(transactions.userId, userId),
          or(
            lt(transactions.date, cursor),
            and(
              eq(transactions.date, cursor),
              lt(transactions.id, cursorId)
            )
          )
        )!;
      } else {
        whereCondition = and(
          eq(transactions.userId, userId),
          lt(transactions.date, cursor)
        )!;
      }
    }

    // Fetch one extra to determine if there are more results
    const userTransactions = await db.query.transactions.findMany({
      where: whereCondition,
      orderBy: [desc(transactions.date), desc(transactions.id)],
      limit: limit + 1,
      with: {
        category: true,
      },
    });

    // Check if there are more results
    const hasMore = userTransactions.length > limit;
    const resultsToReturn = hasMore ? userTransactions.slice(0, limit) : userTransactions;

    // Get cursor for next page (last item's date and id)
    const lastItem = resultsToReturn[resultsToReturn.length - 1];
    const nextCursor = hasMore && lastItem ? lastItem.date : null;
    const nextCursorId = hasMore && lastItem ? lastItem.id : null;

    // Transform to match frontend Transaction type
    const formattedTransactions = resultsToReturn.map(t => ({
      id: t.id,
      date: t.date,
      description: t.description,
      amount: parseFloat(t.amount),
      transactionType: t.transactionType as 'Debit' | 'Credit',
      category: t.categoryId || undefined,
      originalDescription: t.originalDescription || undefined,
      raw: t.rawData as Record<string, any> || undefined,
    }));

    return new Response(JSON.stringify({
      transactions: formattedTransactions,
      pagination: {
        hasMore,
        nextCursor,
        nextCursorId,
        count: formattedTransactions.length,
      },
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch transactions' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST /api/transactions - Create new transaction(s)
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const userId = await requireAuth(cookies);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const body = await request.json();

    // Support both single transaction and batch import
    const transactionsToCreate = Array.isArray(body) ? body : [body];

    const newTransactions = await db.insert(transactions).values(
      transactionsToCreate.map(t => ({
        userId,
        date: t.date,
        description: t.description,
        amount: t.amount.toString(),
        transactionType: t.transactionType,
        categoryId: t.category || null,
        originalDescription: t.originalDescription || null,
        rawData: t.raw || null,
      }))
    ).returning();

    // Transform to match frontend format
    const formattedTransactions = newTransactions.map(t => ({
      id: t.id,
      date: t.date,
      description: t.description,
      amount: parseFloat(t.amount),
      transactionType: t.transactionType as 'Debit' | 'Credit',
      category: t.categoryId || undefined,
      originalDescription: t.originalDescription || undefined,
      raw: t.rawData as Record<string, any> || undefined,
    }));

    return new Response(JSON.stringify(formattedTransactions), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating transactions:', error);
    return new Response(JSON.stringify({ error: 'Failed to create transactions' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE /api/transactions - Delete transactions
// If body contains { ids: string[] }, delete only those IDs
// If no body, delete all transactions for current user
export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    const userId = await requireAuth(cookies);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if body contains specific IDs to delete
    let idsToDelete: string[] | null = null;
    try {
      const body = await request.json();
      if (body && Array.isArray(body.ids) && body.ids.length > 0) {
        idsToDelete = body.ids;
      }
    } catch {
      // No body or invalid JSON - delete all
    }

    let deletedCount = 0;

    if (idsToDelete) {
      // Bulk delete specific IDs
      const result = await db.delete(transactions)
        .where(and(
          eq(transactions.userId, userId),
          inArray(transactions.id, idsToDelete)
        ))
        .returning({ id: transactions.id });
      deletedCount = result.length;
      console.log(`Bulk deleted ${deletedCount} of ${idsToDelete.length} transactions`);
    } else {
      // Delete all user's transactions
      const result = await db.delete(transactions)
        .where(eq(transactions.userId, userId))
        .returning({ id: transactions.id });
      deletedCount = result.length;
    }

    return new Response(JSON.stringify({ success: true, deletedCount }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting transactions:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete transactions' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
