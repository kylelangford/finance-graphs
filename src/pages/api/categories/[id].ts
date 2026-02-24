import type { APIRoute } from 'astro';
import { db } from '../../../db/client';
import { categories } from '../../../db/schema';
import { requireAuth } from '../../../utils/auth';
import { eq, and } from 'drizzle-orm';

// PATCH /api/categories/[id] - Update category
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  try {
    const userId = await requireAuth(cookies);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const categoryId = params.id;

    if (!categoryId) {
      return new Response(JSON.stringify({ error: 'Category ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();

    // Verify category belongs to user
    const existingCategory = await db.query.categories.findFirst({
      where: and(
        eq(categories.id, categoryId),
        eq(categories.userId, userId)
      ),
    });

    if (!existingCategory) {
      return new Response(JSON.stringify({ error: 'Category not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prevent editing default categories
    if (existingCategory.isDefault) {
      return new Response(JSON.stringify({ error: 'Cannot edit default categories' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update category
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.color !== undefined) updateData.color = body.color;

    const [updatedCategory] = await db.update(categories)
      .set(updateData)
      .where(and(
        eq(categories.id, categoryId),
        eq(categories.userId, userId)
      ))
      .returning();

    const formatted = {
      id: updatedCategory.id,
      name: updatedCategory.name,
      color: updatedCategory.color,
      isDefault: updatedCategory.isDefault,
      createdAt: updatedCategory.createdAt.toISOString(),
    };

    return new Response(JSON.stringify(formatted), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return new Response(JSON.stringify({ error: 'Failed to update category' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE /api/categories/[id] - Delete category
export const DELETE: APIRoute = async ({ params, cookies }) => {
  try {
    const userId = await requireAuth(cookies);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const categoryId = params.id;

    if (!categoryId) {
      return new Response(JSON.stringify({ error: 'Category ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify category belongs to user
    const existingCategory = await db.query.categories.findFirst({
      where: and(
        eq(categories.id, categoryId),
        eq(categories.userId, userId)
      ),
    });

    if (!existingCategory) {
      return new Response(JSON.stringify({ error: 'Category not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prevent deleting default categories
    if (existingCategory.isDefault) {
      return new Response(JSON.stringify({ error: 'Cannot delete default categories' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete category (transactions will have their categoryId set to null due to ON DELETE SET NULL)
    await db.delete(categories).where(and(
      eq(categories.id, categoryId),
      eq(categories.userId, userId)
    ));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete category' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
