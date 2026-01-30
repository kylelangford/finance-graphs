import type { Transaction } from '../types/transaction';
import { cleanDescriptions } from '../services/claudeService';

export interface CleaningOptions {
  apiKey: string;
  onProgress?: (current: number, total: number) => void;
}

export interface CleaningResult {
  success: boolean;
  transactions: Transaction[];
  cleanedCount: number;
  error?: string;
}

/**
 * Clean transaction descriptions using Claude AI
 * Updates transaction.description with cleaned version and preserves original in transaction.originalDescription
 */
export async function cleanTransactionDescriptions(
  transactions: Transaction[],
  options: CleaningOptions
): Promise<CleaningResult> {
  try {
    // Validate input
    if (!transactions || transactions.length === 0) {
      return {
        success: true,
        transactions: [],
        cleanedCount: 0,
      };
    }

    // Extract descriptions
    const descriptions = transactions.map(t => t.description);

    // Report progress
    if (options.onProgress) {
      options.onProgress(0, descriptions.length);
    }

    // Call Claude API to clean all descriptions in one batch
    const result = await cleanDescriptions(descriptions, options.apiKey);

    if (!result.success) {
      return {
        success: false,
        transactions,
        cleanedCount: 0,
        error: result.error,
      };
    }

    // Create new transaction objects with cleaned descriptions
    const cleanedTransactions = transactions.map((transaction, index) => {
      const cleanedDescription = result.cleanedDescriptions[index];
      const originalDescription = transaction.originalDescription || transaction.description;

      return {
        ...transaction,
        description: cleanedDescription || transaction.description,
        originalDescription,
      };
    });

    // Report completion
    if (options.onProgress) {
      options.onProgress(descriptions.length, descriptions.length);
    }

    return {
      success: true,
      transactions: cleanedTransactions,
      cleanedCount: result.cleanedDescriptions.filter(d => d && d.length > 0).length,
    };
  } catch (error) {
    console.error('Error in cleanTransactionDescriptions:', error);

    let errorMessage = 'Failed to clean transaction descriptions';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      transactions,
      cleanedCount: 0,
      error: errorMessage,
    };
  }
}
