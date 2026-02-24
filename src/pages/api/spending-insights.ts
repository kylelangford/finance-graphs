import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';

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

      const isRetryable =
        (error instanceof Anthropic.APIError && (error.status === 529 || error.status === 429)) ||
        (lastError.message.includes('overloaded'));

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`API overloaded, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

interface Transaction {
  date: string;
  description: string;
  amount: number;
  transactionType: 'Debit' | 'Credit';
  category?: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { transactions, userApiKey } = await request.json();

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No transactions provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = userApiKey || import.meta.env.CLAUDE_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'No API key provided' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    // Prepare transaction summary for AI
    const transactionList = transactions.map((t: Transaction) => {
      const type = t.transactionType === 'Credit' ? '+' : '-';
      const category = t.category ? ` [${t.category}]` : '';
      return `${t.date}: ${type}$${Math.abs(t.amount).toFixed(2)} - ${t.description}${category}`;
    }).join('\n');

    // Calculate basic stats
    const totalSpending = transactions
      .filter((t: Transaction) => t.transactionType === 'Debit')
      .reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0);

    const totalIncome = transactions
      .filter((t: Transaction) => t.transactionType === 'Credit')
      .reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0);

    const categoryTotals: Record<string, number> = {};
    transactions
      .filter((t: Transaction) => t.transactionType === 'Debit' && t.category)
      .forEach((t: Transaction) => {
        const cat = t.category || 'Uncategorized';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(t.amount);
      });

    const prompt = `Analyze this financial data and provide spending insights.

TRANSACTION DATA:
${transactionList}

SUMMARY:
- Total Spending: $${totalSpending.toFixed(2)}
- Total Income: $${totalIncome.toFixed(2)}
- Net: ${totalIncome - totalSpending >= 0 ? '+' : ''}$${(totalIncome - totalSpending).toFixed(2)}
- Spending by Category: ${JSON.stringify(categoryTotals)}

Please provide:
1. **Key Highlights** (3-4 bullet points about notable spending patterns)
2. **Top Spending Categories** (brief analysis of where money is going)
3. **Potential Savings** (1-2 actionable suggestions based on the data)
4. **Unusual Activity** (any transactions that stand out, if any)

Keep the response concise and actionable. Use markdown formatting.`;

    const model = import.meta.env.PUBLIC_CLAUDE_MODEL || 'claude-3-haiku-20240307';
    const maxTokens = parseInt(import.meta.env.PUBLIC_CLAUDE_MAX_TOKENS || '2048', 10);

    const message = await withRetry(() =>
      anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
        system: 'You are a helpful financial advisor assistant. Analyze spending data and provide clear, actionable insights. Be concise and friendly. Focus on patterns and practical advice.',
      })
    );

    const insights = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('\n');

    return new Response(
      JSON.stringify({
        success: true,
        insights,
        summary: {
          totalSpending,
          totalIncome,
          net: totalIncome - totalSpending,
          categoryTotals,
          transactionCount: transactions.length,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating spending insights:', error);

    let errorMessage = 'Failed to generate insights';
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
