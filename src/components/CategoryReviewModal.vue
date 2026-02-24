<script setup lang="ts">
import { ref, computed } from 'vue';
import type { CategorySuggestion } from '../services/aiCategorization';

const props = defineProps<{
  isOpen: boolean;
  suggestions: CategorySuggestion[];
}>();

const emit = defineEmits<{
  close: [];
  approve: [suggestions: CategorySuggestion[]];
}>();

// Local copy of suggestions for editing
const localSuggestions = ref<CategorySuggestion[]>([...props.suggestions]);

const newCategoriesCount = computed(() => {
  return localSuggestions.value.filter(s => s.isNew).length;
});

const existingCategoriesCount = computed(() => {
  return localSuggestions.value.filter(s => !s.isNew).length;
});

const handleClose = () => {
  emit('close');
};

const handleApprove = () => {
  emit('approve', localSuggestions.value);
};

const removeCategory = (index: number) => {
  localSuggestions.value.splice(index, 1);
};

const editCategoryName = (index: number, newName: string) => {
  localSuggestions.value[index].name = newName;
};
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 overflow-y-auto"
    @click.self="handleClose"
  >
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>

    <!-- Modal -->
    <div class="flex min-h-screen items-center justify-center p-4">
      <div
        class="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl"
        @click.stop
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-600">
          <div>
            <h2 class="text-2xl font-bold text-white">AI Category Suggestions</h2>
            <p class="text-purple-100 text-sm mt-1">
              Review and approve categories suggested by Claude AI
            </p>
          </div>
          <button
            @click="handleClose"
            class="text-white hover:text-purple-200 transition-colors"
            aria-label="Close"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="px-6 py-6 space-y-6 max-h-[60vh] overflow-y-auto">
          <!-- Summary -->
          <div class="flex gap-4">
            <div class="flex-1 bg-green-50 border border-green-200 rounded-2xl p-4">
              <div class="text-sm font-medium text-green-800">Existing Categories</div>
              <div class="text-2xl font-bold text-green-900 mt-1">{{ existingCategoriesCount }}</div>
              <div class="text-xs text-green-600 mt-1">Will use your current categories</div>
            </div>
            <div class="flex-1 bg-purple-50 border border-purple-200 rounded-2xl p-4">
              <div class="text-sm font-medium text-purple-800">New Categories</div>
              <div class="text-2xl font-bold text-purple-900 mt-1">{{ newCategoriesCount }}</div>
              <div class="text-xs text-purple-600 mt-1">Will be created for you</div>
            </div>
          </div>

          <!-- Category List -->
          <div class="space-y-3">
            <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wider">Categories</h3>
            <div
              v-for="(suggestion, index) in localSuggestions"
              :key="index"
              class="flex items-center gap-3 p-4 border rounded-2xl hover:border-indigo-300 transition-colors"
              :class="suggestion.isNew ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'"
            >
              <!-- Color Badge -->
              <div
                class="w-4 h-4 rounded-full flex-shrink-0"
                :class="`bg-${suggestion.color}-500`"
              ></div>

              <!-- Category Info -->
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <input
                    type="text"
                    :value="suggestion.name"
                    @input="editCategoryName(index, ($event.target as HTMLInputElement).value)"
                    class="font-medium text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none px-1"
                  />
                  <span
                    v-if="suggestion.isNew"
                    class="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded"
                  >
                    NEW
                  </span>
                </div>
                <div class="text-sm text-gray-600 mt-1">
                  {{ suggestion.matchingTransactionIds.length }} transaction{{ suggestion.matchingTransactionIds.length !== 1 ? 's' : '' }}
                </div>
              </div>

              <!-- Remove Button -->
              <button
                @click="removeCategory(index)"
                class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="Remove this category"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div v-if="localSuggestions.length === 0" class="text-center py-8 text-gray-500">
              No category suggestions available
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
          <p class="text-sm text-gray-600">
            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            You can edit category names or remove suggestions before approving
          </p>
          <div class="flex gap-3">
            <button
              @click="handleClose"
              class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              @click="handleApprove"
              :disabled="localSuggestions.length === 0"
              class="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full hover:from-purple-700 hover:to-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Approve & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
