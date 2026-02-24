/**
 * POST /api/auth/invite
 * Invite a new user by email (protected - requires authentication)
 */

import type { APIRoute } from 'astro';
import { requireAuth, getUserById, getUserByEmail, createInviteToken, hasPendingInvite } from '../../../utils/auth';
import { sendInviteEmail } from '../../../services/emailService';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Require authentication
    const userId = await requireAuth(cookies);

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'A user with this email already exists' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if there's already a pending invite
    const hasInvite = await hasPendingInvite(email);
    if (hasInvite) {
      return new Response(
        JSON.stringify({ error: 'An invitation has already been sent to this email' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get inviter's info for the email
    const inviter = await getUserById(userId);
    const inviterName = inviter?.name || inviter?.email || 'Someone';

    // Create invite token
    const token = await createInviteToken(email, userId);

    // Send invite email
    const emailResult = await sendInviteEmail(email, token, inviterName);

    if (!emailResult.success) {
      console.error('Failed to send invite email:', emailResult.error);
      return new Response(
        JSON.stringify({ error: 'Failed to send invitation email. Please try again.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation sent to ${email}`
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Invite error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
