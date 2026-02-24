import type { Transaction, Category } from '../types/transaction';

export interface CategorySuggestion {
  name: string;
  color: string;
  isNew: boolean; // true if this is a new category to create
  matchingTransactionIds: string[]; // IDs of transactions that should use this category
}

export interface AICategorySuggestionsResult {
  success: boolean;
  suggestions: CategorySuggestion[];
  error?: string;
}

/**
 * Get AI suggestions for categories based on transactions
 * Returns both existing categories to use and new categories to create
 */
export async function getAICategorySuggestions(
  transactions: Transaction[],
  existingCategories: Category[],
  apiKey: string
): Promise<AICategorySuggestionsResult> {
  try {
    if (!transactions || transactions.length === 0) {
      return {
        success: true,
        suggestions: [],
      };
    }

    // Call our API endpoint
    const response = await fetch('/api/ai-categorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transactions,
        existingCategories,
        userApiKey: apiKey || undefined,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        suggestions: [],
        error: errorData.error || 'Failed to get AI category suggestions',
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error getting AI category suggestions:', error);

    let errorMessage = 'Failed to get AI category suggestions';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      suggestions: [],
      error: errorMessage,
    };
  }
}
