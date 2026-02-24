import { ref, type Ref } from 'vue';
import type { CategorizationRule } from '../types/transaction';
import { rulesAPI } from '../utils/apiClient';

const rules: Ref<CategorizationRule[]> = ref([]);

export function useCategorizationRules() {
  /**
   * Initialize rules by loading from API
   */
  const initializeDefaultRules = async () => {
    try {
      rules.value = await rulesAPI.getAll();
    } catch (error) {
      console.error('Failed to load rules:', error);
    }
  };

  /**
   * Get rule for a specific category (1:1 relationship)
   */
  const getRuleForCategory = (categoryId: string): CategorizationRule | undefined => {
    return rules.value.find(rule => rule.categoryId === categoryId);
  };

  /**
   * Get or create a rule for a category
   */
  const getOrCreateRuleForCategory = async (categoryId: string): Promise<CategorizationRule | null> => {
    const existing = getRuleForCategory(categoryId);
    if (existing) return existing;

    // Create new rule for this category
    try {
      const newRule = await rulesAPI.create({
        categoryId,
        keywords: [],
        matchCase: false,
        enabled: true,
        priority: 1,
      });
      rules.value = [...rules.value, newRule];
      return newRule;
    } catch (error) {
      console.error('Failed to create rule:', error);
      return null;
    }
  };

  /**
   * Add a keyword to a category's rule
   */
  const addKeywordToCategory = async (categoryId: string, keyword: string): Promise<boolean> => {
    const trimmedKeyword = keyword.trim().toLowerCase();
    if (!trimmedKeyword) return false;

    const rule = await getOrCreateRuleForCategory(categoryId);
    if (!rule) return false;

    // Check if keyword already exists
    if (rule.keywords.some(k => k.toLowerCase() === trimmedKeyword)) {
      return true; // Already exists, consider it success
    }

    const updatedKeywords = [...rule.keywords, trimmedKeyword];
    return updateRule(rule.id, { keywords: updatedKeywords });
  };

  /**
   * Remove a keyword from a category's rule
   */
  const removeKeywordFromCategory = async (categoryId: string, keyword: string): Promise<boolean> => {
    const rule = getRuleForCategory(categoryId);
    if (!rule) return false;

    const updatedKeywords = rule.keywords.filter(k => k !== keyword);
    return updateRule(rule.id, { keywords: updatedKeywords });
  };

  /**
   * Update an existing rule
   */
  const updateRule = async (id: string, updates: Partial<Omit<CategorizationRule, 'id'>>): Promise<boolean> => {
    try {
      const updatedRule = await rulesAPI.update(id, updates);
      const index = rules.value.findIndex(rule => rule.id === id);
      if (index !== -1) {
        rules.value[index] = updatedRule;
        rules.value = [...rules.value];
      }
      return true;
    } catch (error) {
      console.error('Failed to update rule:', error);
      return false;
    }
  };

  /**
   * Delete a rule
   */
  const deleteRule = async (id: string): Promise<boolean> => {
    try {
      await rulesAPI.delete(id);
      rules.value = rules.value.filter(rule => rule.id !== id);
      return true;
    } catch (error) {
      console.error('Failed to delete rule:', error);
      return false;
    }
  };

  /**
   * Get all rules
   */
  const getRules = (): CategorizationRule[] => {
    return rules.value;
  };

  /**
   * Get keywords for a category
   */
  const getKeywordsForCategory = (categoryId: string): string[] => {
    const rule = getRuleForCategory(categoryId);
    return rule?.keywords || [];
  };

  return {
    rules,
    initializeDefaultRules,
    getRuleForCategory,
    getOrCreateRuleForCategory,
    addKeywordToCategory,
    removeKeywordFromCategory,
    getKeywordsForCategory,
    updateRule,
    deleteRule,
    getRules,
  };
}
