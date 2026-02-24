<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { useCategories } from '../composables/useCategories';
import { useCategorizationRules } from '../composables/useCategorizationRules';
import CategoryBadge from './CategoryBadge.vue';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
const { getKeywordsForCategory, addKeywordToCategory, removeKeywordFromCategory } = useCategorizationRules();

// New category form
const newCategoryName = ref('');
const newCategoryColor = ref('indigo');

// Inline keyword editing state
const editingCategoryId = ref<string | null>(null);
const newKeywordValue = ref('');
const keywordInputRef = ref<HTMLInputElement | null>(null);

// Color picker state
const colorPickerCategoryId = ref<string | null>(null);

// Color swatches with hex values
const colorSwatches = [
  { name: 'red', hex: '#EF4444' },
  { name: 'orange', hex: '#F97316' },
  { name: 'amber', hex: '#F59E0B' },
  { name: 'yellow', hex: '#EAB308' },
  { name: 'lime', hex: '#84CC16' },
  { name: 'green', hex: '#22C55E' },
  { name: 'emerald', hex: '#10B981' },
  { name: 'teal', hex: '#14B8A6' },
  { name: 'cyan', hex: '#06B6D4' },
  { name: 'blue', hex: '#3B82F6' },
  { name: 'indigo', hex: '#6366F1' },
  { name: 'purple', hex: '#A855F7' },
  { name: 'pink', hex: '#EC4899' },
  { name: 'slate', hex: '#64748B' },
];

const colors = colorSwatches.map(c => c.name);

const toggleColorPicker = (categoryId: string) => {
  if (colorPickerCategoryId.value === categoryId) {
    colorPickerCategoryId.value = null;
  } else {
    colorPickerCategoryId.value = categoryId;
  }
};

const selectColor = async (categoryId: string, color: string) => {
  await updateCategory(categoryId, { color });
  colorPickerCategoryId.value = null;
};

const getColorHex = (colorName: string): string => {
  return colorSwatches.find(c => c.name === colorName)?.hex || '#6366F1';
};

const toSentenceCase = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const handleAddCategory = async () => {
  if (newCategoryName.value.trim()) {
    await addCategory(newCategoryName.value.trim(), newCategoryColor.value);
    newCategoryName.value = '';
    newCategoryColor.value = 'blue';
  }
};

const handleDeleteCategory = (categoryId: string) => {
  deleteCategory(categoryId);
};

const startAddingKeyword = async (categoryId: string) => {
  editingCategoryId.value = categoryId;
  newKeywordValue.value = '';
  await nextTick();
  keywordInputRef.value?.focus();
};

const confirmAddKeyword = async () => {
  if (editingCategoryId.value && newKeywordValue.value.trim()) {
    await addKeywordToCategory(editingCategoryId.value, newKeywordValue.value.trim());
  }
  cancelAddKeyword();
};

const cancelAddKeyword = () => {
  editingCategoryId.value = null;
  newKeywordValue.value = '';
};

const handleKeywordKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    confirmAddKeyword();
  } else if (event.key === 'Escape') {
    cancelAddKeyword();
  }
};

const handleRemoveKeyword = async (categoryId: string, keyword: string) => {
  await removeKeywordFromCategory(categoryId, keyword);
};
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Categories</h2>
          <p class="text-sm text-gray-500 mt-1">Manage categories and their matching keywords</p>
        </div>
        <button
          @click="emit('close')"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-4">
        <!-- Add Category Form -->
        <div class="bg-gray-50 p-4 rounded-2xl">
          <h3 class="text-sm font-semibold text-gray-700 mb-2">Add New Category</h3>
          <div class="flex items-center gap-2">
            <input
              v-model="newCategoryName"
              type="text"
              placeholder="Category name"
              class="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              @keyup.enter="handleAddCategory"
            />
            <!-- Color Picker for New Category -->
            <div class="relative">
              <button
                @click="colorPickerCategoryId = colorPickerCategoryId === 'new' ? null : 'new'"
                class="w-8 h-8 rounded-full border border-gray-300 hover:border-gray-400 transition-colors"
                :style="{ backgroundColor: getColorHex(newCategoryColor) }"
                title="Select color"
              ></button>
              <div
                v-if="colorPickerCategoryId === 'new'"
                class="absolute top-full right-0 mt-1 p-2 bg-white rounded-xl shadow-xl border border-gray-200 z-10 flex flex-wrap gap-1.5 w-40"
              >
                <button
                  v-for="swatch in colorSwatches"
                  :key="swatch.name"
                  @click="newCategoryColor = swatch.name; colorPickerCategoryId = null"
                  class="w-5 h-5 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                  :class="{ 'ring-2 ring-offset-1 ring-gray-400': newCategoryColor === swatch.name }"
                  :style="{ backgroundColor: swatch.hex }"
                  :title="swatch.name"
                ></button>
              </div>
            </div>
            <button
              @click="handleAddCategory"
              class="px-4 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        <!-- Click outside to close color picker -->
        <div
          v-if="colorPickerCategoryId"
          @click="colorPickerCategoryId = null"
          class="fixed inset-0 z-0"
        ></div>

        <!-- Categories List with Keywords -->
        <div class="space-y-3">
          <div
            v-for="category in categories"
            :key="category.id"
            class="bg-white border border-gray-200 rounded-2xl p-4"
          >
            <!-- Category Header -->
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2 relative">
                <CategoryBadge :category="category" />
                <!-- Color Picker Button -->
                <button
                  @click="toggleColorPicker(category.id)"
                  class="w-5 h-5 rounded-full border border-gray-300 hover:border-gray-400 transition-colors flex-shrink-0"
                  :style="{ backgroundColor: getColorHex(category.color) }"
                  title="Change color"
                ></button>
                <!-- Color Swatch Menu -->
                <div
                  v-if="colorPickerCategoryId === category.id"
                  class="absolute top-full left-0 mt-1 p-2 bg-white rounded-xl shadow-xl border border-gray-200 z-10 flex flex-wrap gap-1.5 w-40"
                >
                  <button
                    v-for="swatch in colorSwatches"
                    :key="swatch.name"
                    @click="selectColor(category.id, swatch.name)"
                    class="w-5 h-5 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                    :class="{ 'ring-2 ring-offset-1 ring-gray-400': category.color === swatch.name }"
                    :style="{ backgroundColor: swatch.hex }"
                    :title="swatch.name"
                  ></button>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="startAddingKeyword(category.id)"
                  class="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  + Add keyword
                </button>
                <button
                  v-if="!category.isDefault"
                  @click="handleDeleteCategory(category.id)"
                  class="text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete category"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Keywords -->
            <div class="flex flex-wrap gap-1.5 min-h-[28px]">
              <!-- Existing Keyword Pills -->
              <span
                v-for="keyword in getKeywordsForCategory(category.id)"
                :key="keyword"
                class="inline-flex items-center gap-1 h-6 px-2.5 bg-gray-100 text-gray-700 text-xs rounded-full border border-gray-200 group hover:bg-gray-200 transition-colors"
              >
                {{ toSentenceCase(keyword) }}
                <button
                  @click="handleRemoveKeyword(category.id, keyword)"
                  class="w-3.5 h-3.5 rounded-full flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-100 transition-colors"
                  title="Remove keyword"
                >
                  <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>

              <!-- Inline Add Keyword Pill -->
              <span
                v-if="editingCategoryId === category.id"
                class="inline-flex items-center gap-1 h-6 px-2 bg-indigo-100 text-indigo-800 text-xs rounded-full border border-indigo-300"
              >
                <input
                  ref="keywordInputRef"
                  v-model="newKeywordValue"
                  type="text"
                  placeholder="keyword"
                  class="w-24 bg-transparent border-none outline-none text-xs placeholder-indigo-400"
                  @keydown="handleKeywordKeydown"
                  @blur="confirmAddKeyword"
                />
                <button
                  @click="confirmAddKeyword"
                  class="text-indigo-600 hover:text-indigo-800 font-medium"
                  title="Add"
                >
                  add
                </button>
              </span>

              <!-- Empty state -->
              <span
                v-if="getKeywordsForCategory(category.id).length === 0 && editingCategoryId !== category.id"
                class="text-xs text-gray-400 italic"
              >
                No keywords yet
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-3 p-6 border-t border-gray-200">
        <button
          @click="emit('close')"
          class="px-5 py-2 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>
