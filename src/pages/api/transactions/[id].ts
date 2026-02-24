import type { APIRoute } from 'astro';
import { db } from '../../../db/client';
import { transactions } from '../../../db/schema';
import { requireAuth } from '../../../utils/auth';
import { eq, and } from 'drizzle-orm';

// Force dynamic rendering - no caching
export const prerender = false;

// PATCH /api/transactions/[id] - Update transaction
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  try {
    const userId = await requireAuth(cookies);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const transactionId = params.id;

    if (!transactionId) {
      return new Response(JSON.stringify({ error: 'Transaction ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();

    // Verify transaction belongs to user
    const existingTransaction = await db.query.transactions.findFirst({
      where: and(
        eq(transactions.id, transactionId),
        eq(transactions.userId, userId)
      ),
    });

    if (!existingTransaction) {
      return new Response(JSON.stringify({ error: 'Transaction not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update transaction
    const updateData: any = { updatedAt: new Date() };
    if (body.description !== undefined) updateData.description = body.description;
    if (body.amount !== undefined) updateData.amount = body.amount.toString();
    if (body.transactionType !== undefined) updateData.transactionType = body.transactionType;
    if (body.category !== undefined) updateData.categoryId = body.category || null;
    if (body.date !== undefined) updateData.date = body.date;

    const [updatedTransaction] = await db.update(transactions)
      .set(updateData)
      .where(and(
        eq(transactions.id, transactionId),
        eq(transactions.userId, userId)
      ))
      .returning();

    // Transform to match frontend format
    const formatted = {
      id: updatedTransaction.id,
      date: updatedTransaction.date,
      description: updatedTransaction.description,
      amount: parseFloat(updatedTransaction.amount),
      transactionType: updatedTransaction.transactionType as 'Debit' | 'Credit',
      category: updatedTransaction.categoryId || undefined,
      originalDescription: updatedTransaction.originalDescription || undefined,
      raw: updatedTransaction.rawData as Record<string, any> || undefined,
    };

    return new Response(JSON.stringify(formatted), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return new Response(JSON.stringify({ error: 'Failed to update transaction' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE /api/transactions/[id] - Delete transaction
export const DELETE: APIRoute = async ({ params, cookies }) => {
  try {
    const userId = await requireAuth(cookies);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const transactionId = params.id;

    if (!transactionId) {
      return new Response(JSON.stringify({ error: 'Transaction ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify transaction belongs to user
    const existingTransaction = await db.query.transactions.findFirst({
      where: and(
        eq(transactions.id, transactionId),
        eq(transactions.userId, userId)
      ),
    });

    if (!existingTransaction) {
      return new Response(JSON.stringify({ error: 'Transaction not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await db.delete(transactions).where(and(
      eq(transactions.id, transactionId),
      eq(transactions.userId, userId)
    )).returning({ id: transactions.id });

    if (result.length === 0) {
      return new Response(JSON.stringify({ error: 'Transaction not found or already deleted' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, deletedId: result[0].id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete transaction' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
