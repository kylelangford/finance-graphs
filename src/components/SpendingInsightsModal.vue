<script setup lang="ts">
import { ref, watch } from 'vue';
import { useSettings } from '../composables/useSettings';

const props = defineProps<{
  isOpen: boolean;
  transactions: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    transactionType: 'Debit' | 'Credit';
    category?: string;
  }>;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { getApiKey } = useSettings();

const isLoading = ref(false);
const error = ref<string | null>(null);
const insights = ref<string | null>(null);
const summary = ref<{
  totalSpending: number;
  totalIncome: number;
  net: number;
  transactionCount: number;
} | null>(null);

const fetchInsights = async () => {
  if (props.transactions.length === 0) {
    error.value = 'No transactions to analyze';
    return;
  }

  isLoading.value = true;
  error.value = null;
  insights.value = null;

  try {
    const response = await fetch('/api/spending-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactions: props.transactions,
        userApiKey: getApiKey() || undefined,
      }),
    });

    const result = await response.json();

    if (result.success) {
      insights.value = result.insights;
      summary.value = result.summary;
    } else {
      error.value = result.error || 'Failed to get insights';
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to get insights';
  } finally {
    isLoading.value = false;
  }
};

// Fetch insights when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    fetchInsights();
  }
});

const handleClose = () => {
  emit('close');
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
        class="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl"
        @click.stop
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-2xl">
          <div class="flex items-center gap-3">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h2 class="text-xl font-bold text-white">AI Spending Insights</h2>
          </div>
          <button
            @click="handleClose"
            class="text-white/80 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="px-6 py-6 max-h-[70vh] overflow-y-auto">
          <!-- Loading State -->
          <div v-if="isLoading" class="flex flex-col items-center justify-center py-12">
            <svg class="animate-spin h-10 w-10 text-purple-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="text-gray-600">Analyzing your spending patterns...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 class="font-medium text-red-800">Unable to generate insights</h3>
                <p class="text-sm text-red-600 mt-1">{{ error }}</p>
                <button
                  @click="fetchInsights"
                  class="mt-3 text-sm font-medium text-red-700 hover:text-red-800 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>

          <!-- Insights Content -->
          <div v-else-if="insights" class="space-y-6">
            <!-- Summary Cards -->
            <div v-if="summary" class="grid grid-cols-3 gap-4">
              <div class="bg-red-50 rounded-2xl p-4 text-center">
                <p class="text-sm text-red-600 font-medium">Spending</p>
                <p class="text-xl font-bold text-red-700">${{ summary.totalSpending.toFixed(2) }}</p>
              </div>
              <div class="bg-green-50 rounded-2xl p-4 text-center">
                <p class="text-sm text-green-600 font-medium">Income</p>
                <p class="text-xl font-bold text-green-700">${{ summary.totalIncome.toFixed(2) }}</p>
              </div>
              <div :class="[
                'rounded-2xl p-4 text-center',
                summary.net >= 0 ? 'bg-blue-50' : 'bg-orange-50'
              ]">
                <p :class="[
                  'text-sm font-medium',
                  summary.net >= 0 ? 'text-blue-600' : 'text-orange-600'
                ]">Net</p>
                <p :class="[
                  'text-xl font-bold',
                  summary.net >= 0 ? 'text-blue-700' : 'text-orange-700'
                ]">
                  {{ summary.net >= 0 ? '+' : '' }}${{ summary.net.toFixed(2) }}
                </p>
              </div>
            </div>

            <!-- AI Insights -->
            <div class="prose prose-sm max-w-none">
              <div v-html="formatMarkdown(insights)"></div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
          <p class="text-xs text-gray-500">
            Analyzed {{ transactions.length }} transactions
          </p>
          <button
            @click="handleClose"
            class="px-4 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// Simple markdown formatter
function formatMarkdown(text: string): string {
  return text
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-gray-900 mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold text-gray-900 mt-4 mb-2">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // Bullet points
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-gray-700">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc space-y-1 my-2">$&</ul>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-gray-700">$1</li>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="text-gray-700 my-2">')
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith('<')) return match;
      return `<p class="text-gray-700 my-2">${match}</p>`;
    });
}

export default {
  methods: {
    formatMarkdown,
  },
};
</script>
