/**
 * POST /api/auth/logout
 * Logout the current user by deleting their session
 */

import type { APIRoute } from 'astro';
import { getSessionToken, deleteSession, clearSessionCookie } from '../../../utils/auth';

export const POST: APIRoute = async ({ cookies }) => {
  try {
    const token = getSessionToken(cookies);

    if (token) {
      // Delete session from database
      await deleteSession(token);
    }

    // Clear session cookie
    clearSessionCookie(cookies);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Logout error:', error);

    // Still clear the cookie even if database operation fails
    clearSessionCookie(cookies);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
