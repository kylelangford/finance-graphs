<script setup lang="ts">
import { ref } from 'vue';
import { useCategories } from '../composables/useCategories';
import { useCategorizationRules } from '../composables/useCategorizationRules';
import CategoryBadge from './CategoryBadge.vue';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { categories, addCategory, deleteCategory } = useCategories();
const { rules, addRule, deleteRule, toggleRule } = useCategorizationRules();

const activeTab = ref<'categories' | 'rules'>('categories');

// New category form
const newCategoryName = ref('');
const newCategoryColor = ref('blue');

const colors = ['green', 'orange', 'blue', 'yellow', 'purple', 'red', 'pink', 'emerald', 'gray', 'slate'];

const handleAddCategory = () => {
  if (newCategoryName.value.trim()) {
    addCategory(newCategoryName.value.trim(), newCategoryColor.value);
    newCategoryName.value = '';
    newCategoryColor.value = 'blue';
  }
};

const handleDeleteCategory = (categoryId: string) => {
  if (confirm('Are you sure you want to delete this category? Transactions using this category will become uncategorized.')) {
    deleteCategory(categoryId);
  }
};

// New rule form
const newRuleCategoryId = ref('');
const newRuleKeywords = ref('');
const newRulePriority = ref(10);

const handleAddRule = () => {
  if (newRuleCategoryId.value && newRuleKeywords.value.trim()) {
    const keywords = newRuleKeywords.value
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (keywords.length > 0) {
      addRule({
        categoryId: newRuleCategoryId.value,
        keywords,
        matchCase: false,
        enabled: true,
        priority: newRulePriority.value,
      });

      newRuleCategoryId.value = '';
      newRuleKeywords.value = '';
      newRulePriority.value = 10;
    }
  }
};

const handleDeleteRule = (ruleId: string) => {
  if (confirm('Are you sure you want to delete this rule?')) {
    deleteRule(ruleId);
  }
};

const getCategoryById = (categoryId: string) => {
  return categories.value.find(c => c.id === categoryId);
};
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 class="text-2xl font-bold text-gray-900">Manage Categories</h2>
        <button
          @click="emit('close')"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200">
        <nav class="flex -mb-px">
          <button
            @click="activeTab = 'categories'"
            :class="[
              'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'categories'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            Categories
          </button>
          <button
            @click="activeTab = 'rules'"
            :class="[
              'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'rules'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            Rules
          </button>
        </nav>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
        <!-- Categories Tab -->
        <div v-if="activeTab === 'categories'" class="space-y-6">
          <!-- Add Category Form -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="text-lg font-semibold mb-3">Add New Category</h3>
            <div class="flex gap-3">
              <input
                v-model="newCategoryName"
                type="text"
                placeholder="Category name"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                @keyup.enter="handleAddCategory"
              />
              <select
                v-model="newCategoryColor"
                class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option v-for="color in colors" :key="color" :value="color">{{ color }}</option>
              </select>
              <button
                @click="handleAddCategory"
                class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          <!-- Categories List -->
          <div>
            <h3 class="text-lg font-semibold mb-3">All Categories</h3>
            <div class="space-y-2">
              <div
                v-for="category in categories"
                :key="category.id"
                class="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div class="flex items-center gap-3">
                  <CategoryBadge :category="category" />
                  <span v-if="category.isDefault" class="text-xs text-gray-500">(Default)</span>
                </div>
                <button
                  v-if="!category.isDefault"
                  @click="handleDeleteCategory(category.id)"
                  class="text-red-600 hover:text-red-700 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Rules Tab -->
        <div v-if="activeTab === 'rules'" class="space-y-6">
          <!-- Add Rule Form -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="text-lg font-semibold mb-3">Add New Rule</h3>
            <div class="space-y-3">
              <select
                v-model="newRuleCategoryId"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select category</option>
                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
              <input
                v-model="newRuleKeywords"
                type="text"
                placeholder="Keywords (comma-separated)"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                @keyup.enter="handleAddRule"
              />
              <div class="flex items-center gap-3">
                <label class="text-sm text-gray-700">Priority:</label>
                <input
                  v-model.number="newRulePriority"
                  type="number"
                  min="1"
                  max="20"
                  class="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  @click="handleAddRule"
                  class="ml-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Add Rule
                </button>
              </div>
            </div>
          </div>

          <!-- Rules List -->
          <div>
            <h3 class="text-lg font-semibold mb-3">All Rules</h3>
            <div class="space-y-2">
              <div
                v-for="rule in rules"
                :key="rule.id"
                class="p-3 bg-white border border-gray-200 rounded-lg"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1 space-y-2">
                    <div class="flex items-center gap-2">
                      <CategoryBadge :category="getCategoryById(rule.categoryId)" size="sm" />
                      <span class="text-xs text-gray-500">Priority: {{ rule.priority }}</span>
                    </div>
                    <div class="flex flex-wrap gap-1">
                      <span
                        v-for="(keyword, index) in rule.keywords"
                        :key="index"
                        class="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                      >
                        {{ keyword }}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      @click="toggleRule(rule.id)"
                      :class="[
                        'px-3 py-1 text-xs rounded-md transition-colors',
                        rule.enabled
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      ]"
                    >
                      {{ rule.enabled ? 'Enabled' : 'Disabled' }}
                    </button>
                    <button
                      @click="handleDeleteRule(rule.id)"
                      class="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-3 p-6 border-t border-gray-200">
        <button
          @click="emit('close')"
          class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>
