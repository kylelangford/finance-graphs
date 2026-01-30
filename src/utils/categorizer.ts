import type { Transaction, CategorizationRule, Category } from '../types/transaction';

/**
 * Categorize a single transaction based on categorization rules
 * @param transaction The transaction to categorize
 * @param rules Array of categorization rules
 * @param categories Array of available categories
 * @returns Category ID if match found, undefined otherwise
 */
export function categorizeTransaction(
  transaction: Transaction,
  rules: CategorizationRule[],
  categories: Category[]
): string | undefined {
  if (!transaction.description) {
    return undefined;
  }

  // Sort rules by priority (descending - higher priority first)
  const sortedRules = [...rules]
    .filter(rule => rule.enabled)
    .sort((a, b) => b.priority - a.priority);

  // Check each rule
  for (const rule of sortedRules) {
    // Verify the category exists
    const categoryExists = categories.some(cat => cat.id === rule.categoryId);
    if (!categoryExists) {
      continue;
    }

    // Check if any keyword matches the description
    for (const keyword of rule.keywords) {
      if (!keyword) continue;

      let matches = false;

      if (rule.matchCase) {
        // Case-sensitive matching
        matches = transaction.description.includes(keyword);
      } else {
        // Case-insensitive matching
        matches = transaction.description.toLowerCase().includes(keyword.toLowerCase());
      }

      if (matches) {
        return rule.categoryId;
      }
    }
  }

  return undefined;
}

/**
 * Categorize multiple transactions in batch
 * @param transactions Array of transactions to categorize
 * @param rules Array of categorization rules
 * @param categories Array of available categories
 * @returns Array of transactions with category field populated
 */
export function categorizeBatch(
  transactions: Transaction[],
  rules: CategorizationRule[],
  categories: Category[]
): Transaction[] {
  return transactions.map(transaction => {
    // Only auto-categorize if not already categorized
    if (!transaction.category) {
      const categoryId = categorizeTransaction(transaction, rules, categories);
      return {
        ...transaction,
        category: categoryId || '',
      };
    }
    return transaction;
  });
}

/**
 * Re-categorize all transactions (ignoring existing categories)
 * @param transactions Array of transactions to categorize
 * @param rules Array of categorization rules
 * @param categories Array of available categories
 * @returns Array of transactions with category field updated
 */
export function recategorizeAll(
  transactions: Transaction[],
  rules: CategorizationRule[],
  categories: Category[]
): Transaction[] {
  return transactions.map(transaction => {
    const categoryId = categorizeTransaction(transaction, rules, categories);
    return {
      ...transaction,
      category: categoryId || '',
    };
  });
}
