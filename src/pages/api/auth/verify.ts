/**
 * GET /api/auth/verify
 * Verify a magic link or invite token and create a session
 */

import type { APIRoute } from 'astro';
import {
  validateAuthToken,
  markTokenAsUsed,
  getUserByEmail,
  createUser,
  createSession,
  setSessionCookie,
} from '../../../utils/auth';

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  try {
    const token = url.searchParams.get('token');

    if (!token) {
      return redirect('/auth/error?reason=missing_token');
    }

    // Validate the token
    const authToken = await validateAuthToken(token);

    if (!authToken) {
      return redirect('/auth/error?reason=invalid_token');
    }

    // Mark token as used
    await markTokenAsUsed(token);

    let userId: string;

    if (authToken.type === 'invite') {
      // Check if user already exists (shouldn't happen, but just in case)
      const existingUser = await getUserByEmail(authToken.email);

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create new user
        userId = await createUser(authToken.email);
      }
    } else {
      // Magic link login - user must exist
      const user = await getUserByEmail(authToken.email);

      if (!user) {
        return redirect('/auth/error?reason=user_not_found');
      }

      userId = user.id;
    }

    // Create session
    const sessionToken = await createSession(userId);

    // Set session cookie
    setSessionCookie(cookies, sessionToken);

    // Redirect to app
    return redirect('/');
  } catch (error) {
    console.error('Verify error:', error);
    return redirect('/auth/error?reason=server_error');
  }
};
