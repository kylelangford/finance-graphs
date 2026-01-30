import { type Ref } from 'vue';
import { useLocalStorage } from './useLocalStorage';
import type { Category } from '../types/transaction';

const DEFAULT_CATEGORIES: Omit<Category, 'createdAt'>[] = [
  { id: 'cat-groceries', name: 'Groceries', color: 'green', isDefault: true },
  { id: 'cat-dining', name: 'Dining & Restaurants', color: 'orange', isDefault: true },
  { id: 'cat-transportation', name: 'Transportation', color: 'blue', isDefault: true },
  { id: 'cat-utilities', name: 'Utilities', color: 'yellow', isDefault: true },
  { id: 'cat-entertainment', name: 'Entertainment', color: 'purple', isDefault: true },
  { id: 'cat-healthcare', name: 'Healthcare', color: 'red', isDefault: true },
  { id: 'cat-shopping', name: 'Shopping', color: 'pink', isDefault: true },
  { id: 'cat-income', name: 'Income', color: 'emerald', isDefault: true },
  { id: 'cat-transfer', name: 'Transfers', color: 'gray', isDefault: true },
  { id: 'cat-other', name: 'Other', color: 'slate', isDefault: true },
];

const categories: Ref<Category[]> = useLocalStorage<Category[]>('categories', []);

export function useCategories() {
  /**
   * Initialize default categories if none exist
   */
  const initializeDefaultCategories = () => {
    if (categories.value.length === 0) {
      const now = new Date().toISOString();
      categories.value = DEFAULT_CATEGORIES.map(cat => ({
        ...cat,
        createdAt: now,
      }));
    }
  };

  /**
   * Add a new custom category
   */
  const addCategory = (name: string, color: string): Category => {
    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name,
      color,
      isDefault: false,
      createdAt: new Date().toISOString(),
    };

    categories.value = [...categories.value, newCategory];
    return newCategory;
  };

  /**
   * Update an existing category
   */
  const updateCategory = (id: string, updates: Partial<Omit<Category, 'id' | 'isDefault' | 'createdAt'>>): boolean => {
    const index = categories.value.findIndex(cat => cat.id === id);
    if (index === -1) {
      return false;
    }

    categories.value[index] = {
      ...categories.value[index],
      ...updates,
    };

    // Trigger reactivity
    categories.value = [...categories.value];
    return true;
  };

  /**
   * Delete a category (prevents deletion of default categories)
   */
  const deleteCategory = (id: string): boolean => {
    const category = categories.value.find(cat => cat.id === id);

    // Prevent deletion of default categories
    if (!category || category.isDefault) {
      return false;
    }

    categories.value = categories.value.filter(cat => cat.id !== id);
    return true;
  };

  /**
   * Get a category by ID
   */
  const getCategoryById = (id: string): Category | undefined => {
    return categories.value.find(cat => cat.id === id);
  };

  /**
   * Get all categories
   */
  const getCategories = (): Category[] => {
    return categories.value;
  };

  /**
   * Check if a category ID is valid
   */
  const categoryExists = (id: string): boolean => {
    return categories.value.some(cat => cat.id === id);
  };

  /**
   * Get categories by type (default or custom)
   */
  const getCategoriesByType = (isDefault: boolean): Category[] => {
    return categories.value.filter(cat => cat.isDefault === isDefault);
  };

  /**
   * Reset to default categories only
   */
  const resetToDefaults = (): void => {
    const now = new Date().toISOString();
    categories.value = DEFAULT_CATEGORIES.map(cat => ({
      ...cat,
      createdAt: now,
    }));
  };

  return {
    categories,
    initializeDefaultCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    getCategories,
    categoryExists,
    getCategoriesByType,
    resetToDefaults,
  };
}
