/**
 * POST /api/waitlist
 * Add email to Sender waitlist for beta access
 */

import type { APIRoute } from 'astro';

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

    const apiKey = import.meta.env.SENDER_API_KEY;

    if (!apiKey) {
      console.error('SENDER_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Add subscriber to Sender
    const response = await fetch('https://api.sender.net/v2/subscribers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email,
        groups: import.meta.env.SENDER_GROUP_ID ? [import.meta.env.SENDER_GROUP_ID] : [],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Handle duplicate subscriber (already on list)
      if (response.status === 422 || response.status === 409) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "You're already on the waitlist! We'll be in touch soon."
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      console.error('Sender API error:', response.status, errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to join waitlist. Please try again.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "You're on the list! We'll notify you when beta access is available."
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Waitlist signup error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
