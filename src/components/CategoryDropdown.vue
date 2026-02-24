<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Category } from '../types/transaction';
import CategoryBadge from './CategoryBadge.vue';

const props = defineProps<{
  modelValue?: string;
  categories: Category[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined];
}>();

const isOpen = ref(false);
const searchQuery = ref('');

const filteredCategories = computed(() => {
  if (!searchQuery.value) {
    return props.categories;
  }

  const query = searchQuery.value.toLowerCase();
  return props.categories.filter(cat =>
    cat.name.toLowerCase().includes(query)
  );
});

const selectedCategory = computed(() => {
  if (!props.modelValue) return undefined;
  return props.categories.find(cat => cat.id === props.modelValue);
});

const selectCategory = (categoryId: string | undefined) => {
  emit('update:modelValue', categoryId);
  isOpen.value = false;
  searchQuery.value = '';
};

const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
  if (!isOpen.value) {
    searchQuery.value = '';
  }
};

// Close dropdown when clicking outside
const dropdownRef = ref<HTMLElement | null>(null);

if (typeof window !== 'undefined') {
  window.addEventListener('click', (e) => {
    if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
      isOpen.value = false;
      searchQuery.value = '';
    }
  });
}
</script>

<template>
  <div ref="dropdownRef" class="relative inline-block">
    <button
      type="button"
      @click="toggleDropdown"
      class="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <CategoryBadge v-if="selectedCategory" :category="selectedCategory" size="sm" />
      <span v-else class="text-gray-500">Select category</span>
      <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <div
      v-if="isOpen"
      class="absolute z-10 mt-1 w-64 bg-white border border-gray-200 rounded-2xl shadow-lg max-h-80 overflow-hidden"
    >
      <!-- Search input -->
      <div class="p-2 border-b border-gray-200">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search categories..."
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          @click.stop
        />
      </div>

      <!-- Category list -->
      <div class="max-h-60 overflow-y-auto">
        <!-- Uncategorized option -->
        <button
          type="button"
          @click="selectCategory(undefined)"
          class="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-2"
          :class="!modelValue ? 'bg-indigo-50' : ''"
        >
          <span class="text-sm text-gray-500">Uncategorized</span>
        </button>

        <!-- Category options -->
        <button
          v-for="category in filteredCategories"
          :key="category.id"
          type="button"
          @click="selectCategory(category.id)"
          class="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-2"
          :class="modelValue === category.id ? 'bg-indigo-50' : ''"
        >
          <CategoryBadge :category="category" size="sm" />
        </button>

        <!-- No results -->
        <div
          v-if="filteredCategories.length === 0"
          class="px-3 py-4 text-sm text-gray-500 text-center"
        >
          No categories found
        </div>
      </div>
    </div>
  </div>
</template>
