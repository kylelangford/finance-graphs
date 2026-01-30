import { describe, it, expect } from 'vitest';
import { categorizeTransaction, categorizeBatch, recategorizeAll } from './categorizer';
import type { Transaction, Category, CategorizationRule } from '../types/transaction';

// Test data
const mockCategories: Category[] = [
  { id: 'cat-groceries', name: 'Groceries', color: 'green', isDefault: true, createdAt: '2024-01-01' },
  { id: 'cat-dining', name: 'Dining', color: 'orange', isDefault: true, createdAt: '2024-01-01' },
  { id: 'cat-transport', name: 'Transportation', color: 'blue', isDefault: true, createdAt: '2024-01-01' },
  { id: 'cat-income', name: 'Income', color: 'emerald', isDefault: true, createdAt: '2024-01-01' },
];

const mockRules: CategorizationRule[] = [
  {
    id: 'rule-1',
    categoryId: 'cat-groceries',
    keywords: ['walmart', 'kroger', 'safeway'],
    matchCase: false,
    enabled: true,
    priority: 10,
  },
  {
    id: 'rule-2',
    categoryId: 'cat-dining',
    keywords: ['starbucks', 'coffee', 'restaurant'],
    matchCase: false,
    enabled: true,
    priority: 10,
  },
  {
    id: 'rule-3',
    categoryId: 'cat-transport',
    keywords: ['uber', 'lyft', 'gas'],
    matchCase: false,
    enabled: true,
    priority: 10,
  },
  {
    id: 'rule-4',
    categoryId: 'cat-income',
    keywords: ['salary', 'payroll'],
    matchCase: false,
    enabled: true,
    priority: 10,
  },
];

const createTransaction = (description: string, category?: string): Transaction => ({
  id: '1',
  date: '2024-01-15',
  description,
  amount: -50,
  transactionType: 'Debit',
  category: category || '',
});

describe('categorizeTransaction', () => {
  describe('Keyword Matching', () => {
    it('should categorize transaction with matching keyword', () => {
      const transaction = createTransaction('Walmart Supercenter');
      const result = categorizeTransaction(transaction, mockRules, mockCategories);
      expect(result).toBe('cat-groceries');
    });

    it('should match keyword anywhere in description', () => {
      const transaction = createTransaction('Purchase from Starbucks on Main St');
      const result = categorizeTransaction(transaction, mockRules, mockCategories);
      expect(result).toBe('cat-dining');
    });

    it('should perform case-insensitive matching by default', () => {
      const transaction = createTransaction('UBER RIDE');
      const result = categorizeTransaction(transaction, mockRules, mockCategories);
      expect(result).toBe('cat-transport');
    });

    it('should return undefined when no keywords match', () => {
      const transaction = createTransaction('Random Store');
      const result = categorizeTransaction(transaction, mockRules, mockCategories);
      expect(result).toBeUndefined();
    });

    it('should handle empty description', () => {
      const transaction = createTransaction('');
      const result = categorizeTransaction(transaction, mockRules, mockCategories);
      expect(result).toBeUndefined();
    });
  });

  describe('Case Sensitivity', () => {
    it('should respect case-sensitive matching when enabled', () => {
      const caseSensitiveRule: CategorizationRule = {
        id: 'rule-cs',
        categoryId: 'cat-groceries',
        keywords: ['Walmart'],
        matchCase: true,
        enabled: true,
        priority: 10,
      };

      const transaction1 = createTransaction('Walmart Store');
      const result1 = categorizeTransaction(transaction1, [caseSensitiveRule], mockCategories);
      expect(result1).toBe('cat-groceries');

      const transaction2 = createTransaction('walmart store');
      const result2 = categorizeTransaction(transaction2, [caseSensitiveRule], mockCategories);
      expect(result2).toBeUndefined();
    });

    it('should ignore case when matchCase is false', () => {
      const caseInsensitiveRule: CategorizationRule = {
        id: 'rule-ci',
        categoryId: 'cat-groceries',
        keywords: ['Walmart'],
        matchCase: false,
        enabled: true,
        priority: 10,
      };

      const transaction1 = createTransaction('WALMART');
      const result1 = categorizeTransaction(transaction1, [caseInsensitiveRule], mockCategories);
      expect(result1).toBe('cat-groceries');

      const transaction2 = createTransaction('walmart');
      const result2 = categorizeTransaction(transaction2, [caseInsensitiveRule], mockCategories);
      expect(result2).toBe('cat-groceries');
    });
  });

  describe('Priority Ordering', () => {
    it('should use highest priority rule when multiple match', () => {
      const priorityRules: CategorizationRule[] = [
        {
          id: 'rule-low',
          categoryId: 'cat-groceries',
          keywords: ['store'],
          matchCase: false,
          enabled: true,
          priority: 5,
        },
        {
          id: 'rule-high',
          categoryId: 'cat-dining',
          keywords: ['store'],
          matchCase: false,
          enabled: true,
          priority: 15,
        },
      ];

      const transaction = createTransaction('store purchase');
      const result = categorizeTransaction(transaction, priorityRules, mockCategories);
      expect(result).toBe('cat-dining'); // Higher priority
    });

    it('should use first match when priorities are equal', () => {
      const equalPriorityRules: CategorizationRule[] = [
        {
          id: 'rule-1',
          categoryId: 'cat-groceries',
          keywords: ['shop'],
          matchCase: false,
          enabled: true,
          priority: 10,
        },
        {
          id: 'rule-2',
          categoryId: 'cat-dining',
          keywords: ['shop'],
          matchCase: false,
          enabled: true,
          priority: 10,
        },
      ];

      const transaction = createTransaction('shop visit');
      const result = categorizeTransaction(transaction, equalPriorityRules, mockCategories);
      expect(result).toBe('cat-groceries'); // First rule
    });
  });

  describe('Rule Enablement', () => {
    it('should skip disabled rules', () => {
      const disabledRule: CategorizationRule = {
        id: 'rule-disabled',
        categoryId: 'cat-groceries',
        keywords: ['walmart'],
        matchCase: false,
        enabled: false,
        priority: 10,
      };

      const transaction = createTransaction('Walmart Store');
      const result = categorizeTransaction(transaction, [disabledRule], mockCategories);
      expect(result).toBeUndefined();
    });

    it('should use enabled rules and skip disabled ones', () => {
      const mixedRules: CategorizationRule[] = [
        {
          id: 'rule-disabled',
          categoryId: 'cat-groceries',
          keywords: ['store'],
          matchCase: false,
          enabled: false,
          priority: 10,
        },
        {
          id: 'rule-enabled',
          categoryId: 'cat-dining',
          keywords: ['store'],
          matchCase: false,
          enabled: true,
          priority: 10,
        },
      ];

      const transaction = createTransaction('store purchase');
      const result = categorizeTransaction(transaction, mixedRules, mockCategories);
      expect(result).toBe('cat-dining');
    });
  });

  describe('Category Validation', () => {
    it('should skip rules with non-existent category IDs', () => {
      const invalidRule: CategorizationRule = {
        id: 'rule-invalid',
        categoryId: 'cat-nonexistent',
        keywords: ['test'],
        matchCase: false,
        enabled: true,
        priority: 10,
      };

      const transaction = createTransaction('test transaction');
      const result = categorizeTransaction(transaction, [invalidRule], mockCategories);
      expect(result).toBeUndefined();
    });

    it('should use next valid rule if first has invalid category', () => {
      const mixedRules: CategorizationRule[] = [
        {
          id: 'rule-invalid',
          categoryId: 'cat-nonexistent',
          keywords: ['test'],
          matchCase: false,
          enabled: true,
          priority: 15,
        },
        {
          id: 'rule-valid',
          categoryId: 'cat-groceries',
          keywords: ['test'],
          matchCase: false,
          enabled: true,
          priority: 10,
        },
      ];

      const transaction = createTransaction('test transaction');
      const result = categorizeTransaction(transaction, mixedRules, mockCategories);
      expect(result).toBe('cat-groceries');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty keywords array', () => {
      const emptyKeywordsRule: CategorizationRule = {
        id: 'rule-empty',
        categoryId: 'cat-groceries',
        keywords: [],
        matchCase: false,
        enabled: true,
        priority: 10,
      };

      const transaction = createTransaction('any description');
      const result = categorizeTransaction(transaction, [emptyKeywordsRule], mockCategories);
      expect(result).toBeUndefined();
    });

    it('should skip empty string keywords', () => {
      const emptyStringKeywords: CategorizationRule = {
        id: 'rule-empty-str',
        categoryId: 'cat-groceries',
        keywords: ['', 'walmart', ''],
        matchCase: false,
        enabled: true,
        priority: 10,
      };

      const transaction = createTransaction('Walmart');
      const result = categorizeTransaction(transaction, [emptyStringKeywords], mockCategories);
      expect(result).toBe('cat-groceries');
    });

    it('should handle empty rules array', () => {
      const transaction = createTransaction('any description');
      const result = categorizeTransaction(transaction, [], mockCategories);
      expect(result).toBeUndefined();
    });

    it('should handle empty categories array', () => {
      const transaction = createTransaction('Walmart');
      const result = categorizeTransaction(transaction, mockRules, []);
      expect(result).toBeUndefined();
    });
  });
});

describe('categorizeBatch', () => {
  it('should categorize multiple transactions', () => {
    const transactions: Transaction[] = [
      createTransaction('Walmart Store'),
      createTransaction('Starbucks Coffee'),
      createTransaction('Uber Ride'),
    ];

    const result = categorizeBatch(transactions, mockRules, mockCategories);

    expect(result[0].category).toBe('cat-groceries');
    expect(result[1].category).toBe('cat-dining');
    expect(result[2].category).toBe('cat-transport');
  });

  it('should set empty string for uncategorized transactions', () => {
    const transactions: Transaction[] = [
      createTransaction('Random Store'),
    ];

    const result = categorizeBatch(transactions, mockRules, mockCategories);

    expect(result[0].category).toBe('');
  });

  it('should not override existing categories', () => {
    const transactions: Transaction[] = [
      createTransaction('Walmart Store', 'cat-dining'), // Already categorized as dining
    ];

    const result = categorizeBatch(transactions, mockRules, mockCategories);

    expect(result[0].category).toBe('cat-dining'); // Should keep existing
  });

  it('should only categorize uncategorized transactions', () => {
    const transactions: Transaction[] = [
      createTransaction('Walmart Store', ''), // Empty string = uncategorized
      createTransaction('Starbucks Coffee', 'cat-income'), // Already categorized
      createTransaction('Uber Ride'), // No category field
    ];

    const result = categorizeBatch(transactions, mockRules, mockCategories);

    expect(result[0].category).toBe('cat-groceries'); // Should categorize
    expect(result[1].category).toBe('cat-income'); // Should keep existing
    expect(result[2].category).toBe('cat-transport'); // Should categorize
  });

  it('should handle empty transactions array', () => {
    const result = categorizeBatch([], mockRules, mockCategories);
    expect(result).toEqual([]);
  });

  it('should return new transaction objects (not mutate originals)', () => {
    const transactions: Transaction[] = [
      createTransaction('Walmart Store'),
    ];

    const result = categorizeBatch(transactions, mockRules, mockCategories);

    expect(result).not.toBe(transactions);
    expect(result[0]).not.toBe(transactions[0]);
  });
});

describe('recategorizeAll', () => {
  it('should recategorize all transactions ignoring existing categories', () => {
    const transactions: Transaction[] = [
      createTransaction('Walmart Store', 'cat-dining'),
      createTransaction('Starbucks Coffee', 'cat-transport'),
    ];

    const result = recategorizeAll(transactions, mockRules, mockCategories);

    expect(result[0].category).toBe('cat-groceries'); // Re-categorized
    expect(result[1].category).toBe('cat-dining'); // Re-categorized
  });

  it('should set empty string for transactions that don\'t match any rules', () => {
    const transactions: Transaction[] = [
      createTransaction('Random Store', 'cat-groceries'),
    ];

    const result = recategorizeAll(transactions, mockRules, mockCategories);

    expect(result[0].category).toBe(''); // No match, set to empty
  });

  it('should handle empty transactions array', () => {
    const result = recategorizeAll([], mockRules, mockCategories);
    expect(result).toEqual([]);
  });

  it('should return new transaction objects', () => {
    const transactions: Transaction[] = [
      createTransaction('Walmart Store', 'cat-dining'),
    ];

    const result = recategorizeAll(transactions, mockRules, mockCategories);

    expect(result).not.toBe(transactions);
    expect(result[0]).not.toBe(transactions[0]);
  });
});
