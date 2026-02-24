import type { APIRoute } from 'astro';
import { db } from '../../db/client';
import { userSettings } from '../../db/schema';
import { requireAuth } from '../../utils/auth';
import { eq } from 'drizzle-orm';
import { decryptIfNeeded, encryptIfNeeded } from '../../utils/encryption';

// GET /api/settings - Get user settings
export const GET: APIRoute = async ({ cookies }) => {
  try {
    const userId = await requireAuth(cookies);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    // Create default settings if they don't exist
    if (!settings) {
      const [newSettings] = await db.insert(userSettings).values({
        userId,
        enableAiCleaning: false,
      }).returning();
      settings = newSettings;
    }

    // Decrypt API key before sending to client
    const decryptedApiKey = settings.claudeApiKey ? decryptIfNeeded(settings.claudeApiKey) : '';

    const formatted = {
      enableAICleaning: settings.enableAiCleaning,
      claudeApiKey: decryptedApiKey,
      customPrompt: settings.customPrompt || undefined,
    };

    return new Response(JSON.stringify(formatted), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch settings' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PATCH /api/settings - Update user settings
export const PATCH: APIRoute = async ({ request, cookies }) => {
  try {
    const userId = await requireAuth(cookies);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const body = await request.json();

    // Check if settings exist
    const existingSettings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    let updatedSettings;

    if (existingSettings) {
      // Update existing settings
      const updateData: any = { updatedAt: new Date() };
      if (body.enableAICleaning !== undefined) updateData.enableAiCleaning = body.enableAICleaning;
      if (body.claudeApiKey !== undefined) {
        // Encrypt API key before storing
        updateData.claudeApiKey = body.claudeApiKey ? encryptIfNeeded(body.claudeApiKey) : null;
      }
      if (body.customPrompt !== undefined) updateData.customPrompt = body.customPrompt || null;

      [updatedSettings] = await db.update(userSettings)
        .set(updateData)
        .where(eq(userSettings.userId, userId))
        .returning();
    } else {
      // Create new settings
      // Encrypt API key before storing
      const encryptedApiKey = body.claudeApiKey ? encryptIfNeeded(body.claudeApiKey) : null;

      [updatedSettings] = await db.insert(userSettings).values({
        userId,
        enableAiCleaning: body.enableAICleaning ?? false,
        claudeApiKey: encryptedApiKey,
        customPrompt: body.customPrompt || null,
      }).returning();
    }

    // Decrypt API key before sending to client
    const decryptedApiKey = updatedSettings.claudeApiKey ? decryptIfNeeded(updatedSettings.claudeApiKey) : '';

    const formatted = {
      enableAICleaning: updatedSettings.enableAiCleaning,
      claudeApiKey: decryptedApiKey,
      customPrompt: updatedSettings.customPrompt || undefined,
    };

    return new Response(JSON.stringify(formatted), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return new Response(JSON.stringify({ error: 'Failed to update settings' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
