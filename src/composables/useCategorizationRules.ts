import { type Ref } from 'vue';
import { useLocalStorage } from './useLocalStorage';
import type { CategorizationRule } from '../types/transaction';

const DEFAULT_RULES: Omit<CategorizationRule, 'id'>[] = [
  {
    categoryId: 'cat-groceries',
    keywords: ['walmart', 'kroger', 'safeway', 'whole foods', 'trader joe', 'costco', 'grocery', 'market'],
    matchCase: false,
    enabled: true,
    priority: 10,
  },
  {
    categoryId: 'cat-dining',
    keywords: ['starbucks', 'coffee', 'restaurant', 'cafe', 'mcdonald', 'burger', 'pizza', 'chipotle', 'panera'],
    matchCase: false,
    enabled: true,
    priority: 10,
  },
  {
    categoryId: 'cat-transportation',
    keywords: ['uber', 'lyft', 'gas', 'fuel', 'parking', 'metro', 'transit', 'taxi'],
    matchCase: false,
    enabled: true,
    priority: 10,
  },
  {
    categoryId: 'cat-utilities',
    keywords: ['electric', 'water', 'internet', 'phone', 'utility', 'verizon', 'at&t', 'comcast'],
    matchCase: false,
    enabled: true,
    priority: 10,
  },
  {
    categoryId: 'cat-entertainment',
    keywords: ['netflix', 'spotify', 'hulu', 'disney', 'movie', 'theater', 'concert', 'game'],
    matchCase: false,
    enabled: true,
    priority: 10,
  },
  {
    categoryId: 'cat-healthcare',
    keywords: ['pharmacy', 'doctor', 'hospital', 'clinic', 'cvs', 'walgreens', 'medical', 'health'],
    matchCase: false,
    enabled: true,
    priority: 10,
  },
  {
    categoryId: 'cat-shopping',
    keywords: ['amazon', 'target', 'best buy', 'walmart', 'ebay', 'store'],
    matchCase: false,
    enabled: true,
    priority: 8,
  },
  {
    categoryId: 'cat-income',
    keywords: ['salary', 'payroll', 'deposit', 'payment received', 'direct deposit', 'paycheck'],
    matchCase: false,
    enabled: true,
    priority: 15,
  },
  {
    categoryId: 'cat-transfer',
    keywords: ['transfer', 'withdrawal', 'atm'],
    matchCase: false,
    enabled: true,
    priority: 10,
  },
];

const rules: Ref<CategorizationRule[]> = useLocalStorage<CategorizationRule[]>('categorization-rules', []);

export function useCategorizationRules() {
  /**
   * Initialize default rules if none exist
   */
  const initializeDefaultRules = () => {
    if (rules.value.length === 0) {
      rules.value = DEFAULT_RULES.map((rule, index) => ({
        ...rule,
        id: `rule-${Date.now()}-${index}`,
      }));
    }
  };

  /**
   * Add a new categorization rule
   */
  const addRule = (rule: Omit<CategorizationRule, 'id'>): CategorizationRule => {
    const newRule: CategorizationRule = {
      ...rule,
      id: `rule-${Date.now()}`,
    };

    rules.value = [...rules.value, newRule];
    return newRule;
  };

  /**
   * Update an existing rule
   */
  const updateRule = (id: string, updates: Partial<Omit<CategorizationRule, 'id'>>): boolean => {
    const index = rules.value.findIndex(rule => rule.id === id);
    if (index === -1) {
      return false;
    }

    rules.value[index] = {
      ...rules.value[index],
      ...updates,
    };

    // Trigger reactivity
    rules.value = [...rules.value];
    return true;
  };

  /**
   * Delete a rule
   */
  const deleteRule = (id: string): boolean => {
    const index = rules.value.findIndex(rule => rule.id === id);
    if (index === -1) {
      return false;
    }

    rules.value = rules.value.filter(rule => rule.id !== id);
    return true;
  };

  /**
   * Get rules for a specific category
   */
  const getRulesForCategory = (categoryId: string): CategorizationRule[] => {
    return rules.value.filter(rule => rule.categoryId === categoryId);
  };

  /**
   * Get all rules
   */
  const getRules = (): CategorizationRule[] => {
    return rules.value;
  };

  /**
   * Enable or disable a rule
   */
  const toggleRule = (id: string): boolean => {
    const rule = rules.value.find(r => r.id === id);
    if (!rule) {
      return false;
    }

    return updateRule(id, { enabled: !rule.enabled });
  };

  /**
   * Reset to default rules only
   */
  const resetToDefaults = (): void => {
    rules.value = DEFAULT_RULES.map((rule, index) => ({
      ...rule,
      id: `rule-${Date.now()}-${index}`,
    }));
  };

  return {
    rules,
    initializeDefaultRules,
    addRule,
    updateRule,
    deleteRule,
    getRulesForCategory,
    getRules,
    toggleRule,
    resetToDefaults,
  };
}
