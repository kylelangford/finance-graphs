import type { APIRoute } from 'astro';
import { db } from '../../../db/client';
import { categorizationRules } from '../../../db/schema';
import { requireAuth } from '../../../utils/auth';
import { eq, and } from 'drizzle-orm';

// PATCH /api/rules/[id] - Update categorization rule
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  try {
    const userId = await requireAuth(cookies);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const ruleId = params.id;

    if (!ruleId) {
      return new Response(JSON.stringify({ error: 'Rule ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();

    // Verify rule belongs to user
    const existingRule = await db.query.categorizationRules.findFirst({
      where: and(
        eq(categorizationRules.id, ruleId),
        eq(categorizationRules.userId, userId)
      ),
    });

    if (!existingRule) {
      return new Response(JSON.stringify({ error: 'Rule not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update rule
    const updateData: any = {};
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
    if (body.keywords !== undefined) updateData.keywords = body.keywords;
    if (body.matchCase !== undefined) updateData.matchCase = body.matchCase;
    if (body.enabled !== undefined) updateData.enabled = body.enabled;
    if (body.priority !== undefined) updateData.priority = body.priority;

    const [updatedRule] = await db.update(categorizationRules)
      .set(updateData)
      .where(and(
        eq(categorizationRules.id, ruleId),
        eq(categorizationRules.userId, userId)
      ))
      .returning();

    const formatted = {
      id: updatedRule.id,
      categoryId: updatedRule.categoryId,
      keywords: updatedRule.keywords,
      matchCase: updatedRule.matchCase,
      enabled: updatedRule.enabled,
      priority: updatedRule.priority,
    };

    return new Response(JSON.stringify(formatted), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating rule:', error);
    return new Response(JSON.stringify({ error: 'Failed to update rule' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE /api/rules/[id] - Delete categorization rule
export const DELETE: APIRoute = async ({ params, cookies }) => {
  try {
    const userId = await requireAuth(cookies);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const ruleId = params.id;

    if (!ruleId) {
      return new Response(JSON.stringify({ error: 'Rule ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify rule belongs to user
    const existingRule = await db.query.categorizationRules.findFirst({
      where: and(
        eq(categorizationRules.id, ruleId),
        eq(categorizationRules.userId, userId)
      ),
    });

    if (!existingRule) {
      return new Response(JSON.stringify({ error: 'Rule not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db.delete(categorizationRules).where(and(
      eq(categorizationRules.id, ruleId),
      eq(categorizationRules.userId, userId)
    ));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting rule:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete rule' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
