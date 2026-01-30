import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCategories } from './useCategories';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useCategories', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Reset categories by resetting to empty and then clearing localStorage
    const { categories } = useCategories();
    categories.value = [];
  });

  describe('initializeDefaultCategories', () => {
    it('should initialize with 10 default categories', () => {
      const { initializeDefaultCategories, categories } = useCategories();

      initializeDefaultCategories();

      expect(categories.value).toHaveLength(10);
    });

    it('should create categories with correct structure', () => {
      const { initializeDefaultCategories, categories } = useCategories();

      initializeDefaultCategories();

      const category = categories.value[0];
      expect(category).toHaveProperty('id');
      expect(category).toHaveProperty('name');
      expect(category).toHaveProperty('color');
      expect(category).toHaveProperty('isDefault');
      expect(category).toHaveProperty('createdAt');
      expect(category.isDefault).toBe(true);
    });

    it('should include expected default categories', () => {
      const { initializeDefaultCategories, categories } = useCategories();

      initializeDefaultCategories();

      const categoryNames = categories.value.map(c => c.name);
      expect(categoryNames).toContain('Groceries');
      expect(categoryNames).toContain('Dining & Restaurants');
      expect(categoryNames).toContain('Transportation');
      expect(categoryNames).toContain('Utilities');
      expect(categoryNames).toContain('Entertainment');
      expect(categoryNames).toContain('Healthcare');
      expect(categoryNames).toContain('Shopping');
      expect(categoryNames).toContain('Income');
      expect(categoryNames).toContain('Transfers');
      expect(categoryNames).toContain('Other');
    });

    it('should not reinitialize if categories already exist', () => {
      const { initializeDefaultCategories, addCategory, categories } = useCategories();

      initializeDefaultCategories();
      const initialCount = categories.value.length;

      addCategory('Custom Category', 'red');
      const countAfterAdd = categories.value.length;

      initializeDefaultCategories();

      expect(categories.value.length).toBe(countAfterAdd);
      expect(categories.value.length).toBeGreaterThan(initialCount);
    });

    it('should set createdAt timestamp for all categories', () => {
      const { initializeDefaultCategories, categories } = useCategories();

      initializeDefaultCategories();

      categories.value.forEach(cat => {
        const timestamp = new Date(cat.createdAt).getTime();
        expect(timestamp).toBeGreaterThan(0);
        expect(cat.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
      });
    });
  });

  describe('addCategory', () => {
    it('should add a new custom category', () => {
      const { addCategory, categories } = useCategories();

      const newCategory = addCategory('Custom Category', 'red');

      expect(categories.value.some(c => c.id === newCategory.id)).toBe(true);
      expect(newCategory.name).toBe('Custom Category');
      expect(newCategory.color).toBe('red');
    });

    it('should set isDefault to false for custom categories', () => {
      const { addCategory } = useCategories();

      const newCategory = addCategory('Custom Category', 'red');

      expect(newCategory.isDefault).toBe(false);
    });

    it('should generate unique IDs for new categories', async () => {
      const { addCategory } = useCategories();

      const cat1 = addCategory('Category 1', 'red');
      // Small delay to ensure unique timestamp
      await new Promise(resolve => setTimeout(resolve, 2));
      const cat2 = addCategory('Category 2', 'blue');

      expect(cat1.id).toBeDefined();
      expect(cat2.id).toBeDefined();
      expect(cat1.id).not.toBe(cat2.id);
    });

    it('should set createdAt timestamp', () => {
      const { addCategory } = useCategories();

      const before = new Date().getTime();
      const newCategory = addCategory('Custom Category', 'red');
      const after = new Date().getTime();

      const timestamp = new Date(newCategory.createdAt).getTime();
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('should return the created category', () => {
      const { addCategory } = useCategories();

      const result = addCategory('Test Category', 'green');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name', 'Test Category');
      expect(result).toHaveProperty('color', 'green');
    });
  });

  describe('updateCategory', () => {
    it('should update category name', () => {
      const { addCategory, updateCategory, getCategoryById } = useCategories();

      const category = addCategory('Original Name', 'red');
      const success = updateCategory(category.id, { name: 'Updated Name' });

      expect(success).toBe(true);
      expect(getCategoryById(category.id)?.name).toBe('Updated Name');
    });

    it('should update category color', () => {
      const { addCategory, updateCategory, getCategoryById } = useCategories();

      const category = addCategory('Category', 'red');
      const success = updateCategory(category.id, { color: 'blue' });

      expect(success).toBe(true);
      expect(getCategoryById(category.id)?.color).toBe('blue');
    });

    it('should update multiple fields at once', () => {
      const { addCategory, updateCategory, getCategoryById } = useCategories();

      const category = addCategory('Original', 'red');
      const success = updateCategory(category.id, {
        name: 'Updated',
        color: 'blue'
      });

      expect(success).toBe(true);
      const updated = getCategoryById(category.id);
      expect(updated?.name).toBe('Updated');
      expect(updated?.color).toBe('blue');
    });

    it('should return false for non-existent category', () => {
      const { updateCategory } = useCategories();

      const success = updateCategory('non-existent-id', { name: 'Test' });

      expect(success).toBe(false);
    });

    it('should not change id, isDefault, or createdAt', () => {
      const { addCategory, updateCategory, getCategoryById } = useCategories();

      const category = addCategory('Category', 'red');
      const originalId = category.id;
      const originalIsDefault = category.isDefault;
      const originalCreatedAt = category.createdAt;

      updateCategory(category.id, { name: 'Updated' });

      const updated = getCategoryById(category.id);
      expect(updated?.id).toBe(originalId);
      expect(updated?.isDefault).toBe(originalIsDefault);
      expect(updated?.createdAt).toBe(originalCreatedAt);
    });
  });

  describe('deleteCategory', () => {
    it('should delete custom category', () => {
      const { addCategory, deleteCategory, categories } = useCategories();

      const category = addCategory('Custom Category', 'red');
      const success = deleteCategory(category.id);

      expect(success).toBe(true);
      expect(categories.value.find(c => c.id === category.id)).toBeUndefined();
    });

    it('should not delete default categories', () => {
      const { initializeDefaultCategories, deleteCategory, categories } = useCategories();

      initializeDefaultCategories();
      const defaultCategory = categories.value[0];
      const success = deleteCategory(defaultCategory.id);

      expect(success).toBe(false);
      expect(categories.value.find(c => c.id === defaultCategory.id)).toBeDefined();
    });

    it('should return false for non-existent category', () => {
      const { deleteCategory } = useCategories();

      const success = deleteCategory('non-existent-id');

      expect(success).toBe(false);
    });
  });

  describe('getCategoryById', () => {
    it('should return category when found', () => {
      const { addCategory, getCategoryById } = useCategories();

      const category = addCategory('Test Category', 'red');
      const found = getCategoryById(category.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(category.id);
      expect(found?.name).toBe('Test Category');
    });

    it('should return undefined when not found', () => {
      const { getCategoryById } = useCategories();

      const found = getCategoryById('non-existent-id');

      expect(found).toBeUndefined();
    });
  });

  describe('getCategories', () => {
    it('should return all categories', () => {
      const { initializeDefaultCategories, addCategory, getCategories } = useCategories();

      initializeDefaultCategories();
      addCategory('Custom 1', 'red');
      addCategory('Custom 2', 'blue');

      const allCategories = getCategories();

      expect(allCategories.length).toBe(12); // 10 default + 2 custom
    });

    it('should return empty array when no categories exist', () => {
      const { getCategories } = useCategories();

      const allCategories = getCategories();

      expect(allCategories).toEqual([]);
    });
  });

  describe('categoryExists', () => {
    it('should return true for existing category', () => {
      const { addCategory, categoryExists } = useCategories();

      const category = addCategory('Test', 'red');
      const exists = categoryExists(category.id);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent category', () => {
      const { categoryExists } = useCategories();

      const exists = categoryExists('non-existent-id');

      expect(exists).toBe(false);
    });
  });

  describe('getCategoriesByType', () => {
    it('should return only default categories', () => {
      const { initializeDefaultCategories, addCategory, getCategoriesByType } = useCategories();

      initializeDefaultCategories();
      addCategory('Custom', 'red');

      const defaultCategories = getCategoriesByType(true);

      expect(defaultCategories.length).toBe(10);
      expect(defaultCategories.every(c => c.isDefault)).toBe(true);
    });

    it('should return only custom categories', () => {
      const { initializeDefaultCategories, addCategory, getCategoriesByType } = useCategories();

      initializeDefaultCategories();
      addCategory('Custom 1', 'red');
      addCategory('Custom 2', 'blue');

      const customCategories = getCategoriesByType(false);

      expect(customCategories.length).toBe(2);
      expect(customCategories.every(c => !c.isDefault)).toBe(true);
    });

    it('should return empty array when no categories of type exist', () => {
      const { initializeDefaultCategories, getCategoriesByType } = useCategories();

      initializeDefaultCategories();
      const customCategories = getCategoriesByType(false);

      expect(customCategories).toEqual([]);
    });
  });

  describe('resetToDefaults', () => {
    it('should remove custom categories', () => {
      const { initializeDefaultCategories, addCategory, resetToDefaults, categories } = useCategories();

      initializeDefaultCategories();
      addCategory('Custom 1', 'red');
      addCategory('Custom 2', 'blue');

      expect(categories.value.length).toBe(12);

      resetToDefaults();

      expect(categories.value.length).toBe(10);
      expect(categories.value.every(c => c.isDefault)).toBe(true);
    });

    it('should reset to fresh default categories', () => {
      const { initializeDefaultCategories, updateCategory, resetToDefaults, getCategoryById } = useCategories();

      initializeDefaultCategories();
      const defaultCat = getCategoryById('cat-groceries');

      if (defaultCat) {
        updateCategory(defaultCat.id, { name: 'Modified Name' });
      }

      resetToDefaults();

      const resetCat = getCategoryById('cat-groceries');
      expect(resetCat?.name).toBe('Groceries'); // Original name
    });

    it('should set new createdAt timestamps', () => {
      const { initializeDefaultCategories, resetToDefaults, categories } = useCategories();

      initializeDefaultCategories();
      const originalTimestamp = categories.value[0].createdAt;

      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        resetToDefaults();
        const newTimestamp = categories.value[0].createdAt;

        expect(newTimestamp).not.toBe(originalTimestamp);
      }, 10);
    });
  });

  describe('Persistence', () => {
    it('should persist categories across instances', () => {
      const { initializeDefaultCategories, addCategory } = useCategories();

      initializeDefaultCategories();
      addCategory('Custom Category', 'red');

      // Create new instance
      const { categories: newCategories } = useCategories();

      expect(newCategories.value.length).toBe(11);
      expect(newCategories.value.some(c => c.name === 'Custom Category')).toBe(true);
    });
  });
});
