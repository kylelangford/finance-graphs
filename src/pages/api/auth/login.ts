/**
 * POST /api/auth/login
 * Send a magic link to the user's email
 */

import type { APIRoute } from 'astro';
import { getUserByEmail, createMagicLinkToken, hasPendingInvite } from '../../../utils/auth';
import { sendMagicLink } from '../../../services/emailService';

export const POST: APIRoute = async ({ request }) => {
  try {
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

    // Check if user exists
    const user = await getUserByEmail(email);

    if (!user) {
      // Check if there's a pending invite for this email
      const hasInvite = await hasPendingInvite(email);

      if (!hasInvite) {
        // For security, don't reveal if user exists or not
        // Return success message but don't send email
        return new Response(
          JSON.stringify({
            success: true,
            message: 'If an account exists with this email, you will receive a login link.'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // User has a pending invite, they should use that link instead
      return new Response(
        JSON.stringify({
          success: true,
          message: 'If an account exists with this email, you will receive a login link.'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create magic link token
    const token = await createMagicLinkToken(email);

    // Send magic link email
    const emailResult = await sendMagicLink(email, token);

    if (!emailResult.success) {
      console.error('Failed to send magic link:', emailResult.error);
      return new Response(
        JSON.stringify({ error: 'Failed to send login email. Please try again.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Check your email for a login link.'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
