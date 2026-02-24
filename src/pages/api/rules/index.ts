import type { APIRoute } from 'astro';
import { db } from '../../../db/client';
import { categorizationRules } from '../../../db/schema';
import { requireAuth } from '../../../utils/auth';
import { eq, desc } from 'drizzle-orm';

// GET /api/rules - List all categorization rules for current user
export const GET: APIRoute = async ({ cookies }) => {
  try {
    const userId = await requireAuth(cookies);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userRules = await db.query.categorizationRules.findMany({
      where: eq(categorizationRules.userId, userId),
      orderBy: [desc(categorizationRules.priority)],
      with: {
        category: true,
      },
    });

    // Transform to match frontend CategorizationRule type
    const formatted = userRules.map(r => ({
      id: r.id,
      categoryId: r.categoryId,
      keywords: r.keywords,
      matchCase: r.matchCase,
      enabled: r.enabled,
      priority: r.priority,
    }));

    return new Response(JSON.stringify(formatted), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching rules:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch rules' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST /api/rules - Create new categorization rule
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

    if (!body.categoryId || !body.keywords || !Array.isArray(body.keywords)) {
      return new Response(JSON.stringify({ error: 'Category ID and keywords array are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const [newRule] = await db.insert(categorizationRules).values({
      userId,
      categoryId: body.categoryId,
      keywords: body.keywords,
      matchCase: body.matchCase ?? false,
      enabled: body.enabled ?? true,
      priority: body.priority ?? 0,
    }).returning();

    const formatted = {
      id: newRule.id,
      categoryId: newRule.categoryId,
      keywords: newRule.keywords,
      matchCase: newRule.matchCase,
      enabled: newRule.enabled,
      priority: newRule.priority,
    };

    return new Response(JSON.stringify(formatted), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating rule:', error);
    return new Response(JSON.stringify({ error: 'Failed to create rule' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
