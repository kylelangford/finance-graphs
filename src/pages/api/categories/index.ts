import type { APIRoute } from 'astro';
import { db } from '../../../db/client';
import { categories } from '../../../db/schema';
import { requireAuth } from '../../../utils/auth';
import { eq } from 'drizzle-orm';

// GET /api/categories - List all categories for current user
export const GET: APIRoute = async ({ cookies }) => {
  try {
    const userId = await requireAuth(cookies);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userCategories = await db.query.categories.findMany({
      where: eq(categories.userId, userId),
      orderBy: (categories, { asc }) => [asc(categories.createdAt)],
    });

    // Transform to match frontend Category type
    const formatted = userCategories.map(c => ({
      id: c.id,
      name: c.name,
      color: c.color,
      isDefault: c.isDefault,
      createdAt: c.createdAt.toISOString(),
    }));

    return new Response(JSON.stringify(formatted), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch categories' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST /api/categories - Create new category
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

    if (!body.name || !body.color) {
      return new Response(JSON.stringify({ error: 'Name and color are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check for duplicate category name
    const existing = await db.query.categories.findFirst({
      where: (categories, { and, eq }) => and(
        eq(categories.userId, userId),
        eq(categories.name, body.name)
      ),
    });

    if (existing) {
      return new Response(JSON.stringify({ error: 'Category with this name already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const [newCategory] = await db.insert(categories).values({
      userId,
      name: body.name,
      color: body.color,
      isDefault: false,
    }).returning();

    const formatted = {
      id: newCategory.id,
      name: newCategory.name,
      color: newCategory.color,
      isDefault: newCategory.isDefault,
      createdAt: newCategory.createdAt.toISOString(),
    };

    return new Response(JSON.stringify(formatted), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return new Response(JSON.stringify({ error: 'Failed to create category' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
