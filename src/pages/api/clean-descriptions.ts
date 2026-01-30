import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';

// Mark this endpoint as server-rendered (not static)
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { descriptions, userApiKey } = await request.json();

    // Validate input
    if (!descriptions || !Array.isArray(descriptions) || descriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid descriptions array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get API key: user-provided key takes priority, then fall back to server env
    const apiKey = userApiKey || import.meta.env.CLAUDE_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'No API key provided' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Anthropic client (server-side, no dangerouslyAllowBrowser needed)
    const anthropic = new Anthropic({
      apiKey,
    });

    // Build prompt
    const numberedDescriptions = descriptions
      .map((desc: string, i: number) => `${i + 1}. ${desc}`)
      .join('\n');

    const prompt = `Clean these bank transaction descriptions. Make them human-readable but concise. Preserve:
- Merchant/vendor name
- Location (city, state)
- Transaction type if clear (e.g., "purchase", "payment", "transfer")

Format: Keep it short, use proper capitalization, use em dash (—) to separate elements.

Input (one per line):
${numberedDescriptions}

Output (one per line, same order):`;

    // Get model config from env
    const model = import.meta.env.PUBLIC_CLAUDE_MODEL || 'claude-3-haiku-20240307';
    const maxTokens = parseInt(import.meta.env.PUBLIC_CLAUDE_MAX_TOKENS || '4096', 10);

    // Call Claude API
    const message = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      system: `You are a financial transaction description formatter. Clean messy bank transaction descriptions to be concise and human-readable while preserving all important information like merchant name, location, and transaction type.`,
    });

    // Extract text response
    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('\n');

    // Parse response
    const lines = responseText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const cleanedDescriptions = lines.map(line => {
      return line.replace(/^\d+[\.)]\s*/, '');
    });

    // Validate we got the right number of responses
    if (cleanedDescriptions.length !== descriptions.length) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Expected ${descriptions.length} cleaned descriptions but got ${cleanedDescriptions.length}`,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        cleanedDescriptions,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error cleaning descriptions:', error);

    let errorMessage = 'Failed to clean descriptions';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
