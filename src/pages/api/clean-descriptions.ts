import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';

// Mark this endpoint as server-rendered (not static)
export const prerender = false;

// Retry helper for overloaded errors
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if it's an overloaded error (529) or rate limit (429)
      const isRetryable =
        (error instanceof Anthropic.APIError && (error.status === 529 || error.status === 429)) ||
        (lastError.message.includes('overloaded'));

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`API overloaded, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { descriptions, userApiKey, customPrompt } = await request.json();

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

    // Use custom prompt if provided, otherwise use default
    const defaultPromptText = `Clean these bank transaction descriptions to just the merchant or service name. Be as brief as possible.

Rules:
- Remove payment method prefixes (VISA, MASTERCARD, DEBIT, etc.)
- Remove transaction codes, reference numbers, and IDs
- Remove location unless it's part of the business name
- Remove transaction type words (PURCHASE, POS, DDA, ACH, etc.)
- Use proper capitalization

Examples:
- "VISA DDA PUR 1234 GOOGLE *YOUTUBE PREM" → "Google YouTube Premium"
- "POS DEBIT STARBUCKS #12345 SAN FRANCISCO CA" → "Starbucks"
- "ACH TRANSFER NETFLIX.COM" → "Netflix"`;

    const userPromptText = customPrompt || defaultPromptText;

    // Debug: log which prompt is being used
    console.log('Using custom prompt:', !!customPrompt);
    console.log('Prompt preview:', userPromptText.substring(0, 100) + '...');

    const prompt = `${userPromptText}

CRITICAL: You MUST return EXACTLY ${descriptions.length} cleaned descriptions, one per line, numbered 1-${descriptions.length}. Every input line must have a corresponding output line. Do not skip any items.

Input (${descriptions.length} items):
${numberedDescriptions}

Output (exactly ${descriptions.length} items, same order):`;

    // Get model config from env
    const model = import.meta.env.PUBLIC_CLAUDE_MODEL || 'claude-3-haiku-20240307';
    const maxTokens = parseInt(import.meta.env.PUBLIC_CLAUDE_MAX_TOKENS || '4096', 10);

    // Call Claude API with retry for overloaded errors
    const message = await withRetry(() =>
      anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        system: `You are a financial transaction description formatter. Your goal is to extract the merchant or service name from messy bank transaction descriptions. Be as brief as possible - output only the essential merchant/service name. IMPORTANT: You must output exactly one cleaned description for each input line, maintaining the same numbering. Never skip or combine items.`,
      })
    );

    // Extract text response
    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('\n');

    // Parse response - handle numbered lines and extract cleaned descriptions
    const lines = responseText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // Build a map of line number -> cleaned description
    const cleanedMap = new Map<number, string>();
    for (const line of lines) {
      // Match lines like "1. Starbucks" or "1) Starbucks" or just "Starbucks"
      const match = line.match(/^(\d+)[\.)]\s*(.+)$/);
      if (match) {
        const lineNum = parseInt(match[1], 10);
        const cleanedValue = match[2].trim();
        if (lineNum >= 1 && lineNum <= descriptions.length) {
          cleanedMap.set(lineNum, cleanedValue);
        }
      }
    }

    // Build final array, falling back to original description if missing
    const cleanedDescriptions = descriptions.map((original: string, index: number) => {
      const lineNum = index + 1;
      return cleanedMap.get(lineNum) || original;
    });

    // Log if there was a mismatch (for debugging)
    if (cleanedMap.size !== descriptions.length) {
      console.log(`AI returned ${cleanedMap.size}/${descriptions.length} descriptions, using originals for missing`);
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
    let status = 500;

    if (error instanceof Anthropic.APIError) {
      status = error.status;
      if (error.status === 529) {
        errorMessage = 'Claude API is overloaded. Please try again in a few moments.';
      } else if (error.status === 429) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      } else {
        errorMessage = error.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
