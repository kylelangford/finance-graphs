import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';

// Mark this endpoint as server-rendered (not static)
export const prerender = false;

// Available colors for new categories
const AVAILABLE_COLORS = [
  'blue', 'purple', 'green', 'yellow', 'pink', 'red', 'indigo',
  'emerald', 'orange', 'teal', 'cyan', 'lime', 'amber', 'rose'
];

export const POST: APIRoute = async ({ request }) => {
  try {
    const { transactions, existingCategories, userApiKey } = await request.json();

    // Validate input
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid transactions array' }),
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

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey,
    });

    // Prepare existing categories list
    const existingCategoriesList = existingCategories && existingCategories.length > 0
      ? existingCategories.map((cat: any) => cat.name).join(', ')
      : 'None';

    // Prepare transactions for AI analysis
    const transactionsList = transactions
      .map((t: any, i: number) => `${i + 1}. ${t.description} - $${Math.abs(t.amount)} (${t.transactionType})`)
      .join('\n');

    const prompt = `Analyze these financial transactions and suggest categories for them.

EXISTING CATEGORIES: ${existingCategoriesList}

TRANSACTIONS:
${transactionsList}

Your task:
1. For each transaction, assign it to an EXISTING category if appropriate
2. If no existing category fits well, suggest a NEW category
3. Group transactions that belong to the same new category

Return JSON in this EXACT format (no markdown, just raw JSON):
{
  "suggestions": [
    {
      "name": "Category Name",
      "isNew": true/false,
      "transactionIds": [1, 2, 3],
      "color": "blue"
    }
  ]
}

Rules:
- Use existing categories whenever they make sense
- Only create new categories when truly needed (5+ similar transactions or distinct spending area)
- Group similar transactions together
- For new categories, suggest a color from: ${AVAILABLE_COLORS.join(', ')}
- transactionIds are the numbers from the transaction list (1-based)
- Be concise with category names (2-4 words max)`;

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
      system: `You are a financial categorization expert. Analyze transactions and suggest categories intelligently. Use existing categories when appropriate, only create new ones when necessary. Return valid JSON only.`,
    });

    // Extract text response
    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('\n');

    // Parse JSON response
    let aiResponse;
    try {
      // Try to extract JSON from response (in case AI added markdown)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResponse = JSON.parse(jsonMatch[0]);
      } else {
        aiResponse = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to parse AI response. Please try again.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Transform AI response to our format
    const suggestions = aiResponse.suggestions.map((suggestion: any) => {
      // Convert 1-based transaction IDs to actual transaction IDs
      const matchingTransactionIds = suggestion.transactionIds.map((idx: number) => {
        return transactions[idx - 1]?.id;
      }).filter(Boolean);

      return {
        name: suggestion.name,
        color: suggestion.color || 'blue',
        isNew: suggestion.isNew,
        matchingTransactionIds,
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        suggestions,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in AI categorization:', error);

    let errorMessage = 'Failed to get AI category suggestions';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
