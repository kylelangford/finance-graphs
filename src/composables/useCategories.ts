import { ref, type Ref } from 'vue';
import type { Category } from '../types/transaction';
import { categoriesAPI } from '../utils/apiClient';

const categories: Ref<Category[]> = ref([]);

export function useCategories() {
  /**
   * Initialize categories by loading from API
   */
  const initializeDefaultCategories = async () => {
    try {
      categories.value = await categoriesAPI.getAll();
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  /**
   * Add a new custom category
   */
  const addCategory = async (name: string, color: string): Promise<Category | null> => {
    try {
      const newCategory = await categoriesAPI.create({ name, color });
      categories.value = [...categories.value, newCategory];
      return newCategory;
    } catch (error) {
      console.error('Failed to add category:', error);
      return null;
    }
  };

  /**
   * Update an existing category
   */
  const updateCategory = async (id: string, updates: Partial<Omit<Category, 'id' | 'isDefault' | 'createdAt'>>): Promise<boolean> => {
    try {
      const updatedCategory = await categoriesAPI.update(id, updates);
      const index = categories.value.findIndex(cat => cat.id === id);
      if (index !== -1) {
        categories.value[index] = updatedCategory;
        categories.value = [...categories.value];
      }
      return true;
    } catch (error) {
      console.error('Failed to update category:', error);
      return false;
    }
  };

  /**
   * Delete a category (prevents deletion of default categories)
   */
  const deleteCategory = async (id: string): Promise<boolean> => {
    const category = categories.value.find(cat => cat.id === id);

    // Prevent deletion of default categories
    if (!category || category.isDefault) {
      return false;
    }

    try {
      await categoriesAPI.delete(id);
      categories.value = categories.value.filter(cat => cat.id !== id);
      return true;
    } catch (error) {
      console.error('Failed to delete category:', error);
      return false;
    }
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
   * Reset to default categories only (removes custom categories)
   */
  const resetToDefaults = async (): Promise<void> => {
    const customCategories = categories.value.filter(cat => !cat.isDefault);
    for (const cat of customCategories) {
      await deleteCategory(cat.id);
    }
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
