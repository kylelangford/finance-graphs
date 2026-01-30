<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import CsvUpload from './CsvUpload.vue';
import TransactionList from './TransactionList.vue';
import ToastNotification from './ToastNotification.vue';
import CategoryManager from './CategoryManager.vue';
import SettingsModal from './SettingsModal.vue';
import type { Transaction } from '../types/transaction';
import { useLocalStorage } from '../composables/useLocalStorage';
import { useNotifications } from '../composables/useNotifications';
import { useCategories } from '../composables/useCategories';
import { useCategorizationRules } from '../composables/useCategorizationRules';
import { useSettings } from '../composables/useSettings';
import { categorizeBatch } from '../utils/categorizer';
import { cleanTransactionDescriptions } from '../utils/descriptionCleaner';

const { addNotification } = useNotifications();
const { categories, initializeDefaultCategories } = useCategories();
const { rules, initializeDefaultRules } = useCategorizationRules();
const { canUseAIFeatures, getApiKey } = useSettings();

// Persist transactions in localStorage
const transactions = useLocalStorage<Transaction[]>('transactions', []);

// Show upload screen if no transactions
const showUpload = computed(() => transactions.value.length === 0);

// Modal state
const showCategoryManager = ref(false);
const showSettings = ref(false);
const showMenu = ref(false);

// AI cleaning state
const isCleaningDescriptions = ref(false);

const handleUpload = async (uploadedTransactions: Transaction[]) => {
  let processedTransactions = uploadedTransactions;

  // Step 1: Clean descriptions with AI (if enabled)
  if (canUseAIFeatures.value) {
    const apiKey = getApiKey();
    isCleaningDescriptions.value = true;

    try {
      const cleaningResult = await cleanTransactionDescriptions(
        uploadedTransactions,
        { apiKey: apiKey || '' }
      );

      if (cleaningResult.success) {
        processedTransactions = cleaningResult.transactions;
        addNotification(
          `Cleaned ${cleaningResult.cleanedCount} description${cleaningResult.cleanedCount !== 1 ? 's' : ''} with AI`,
          'success',
          3000
        );
      } else {
        addNotification(
          `AI cleaning failed: ${cleaningResult.error}. Using original descriptions.`,
          'warning',
          5000
        );
      }
    } catch (error) {
      addNotification(
        'AI cleaning failed. Using original descriptions.',
        'warning',
        5000
      );
    } finally {
      isCleaningDescriptions.value = false;
    }
  }

  // Step 2: Auto-categorize (uses cleaned descriptions if available)
  const categorizedTransactions = categorizeBatch(
    processedTransactions,
    rules.value,
    categories.value
  );

  transactions.value = categorizedTransactions;

  // Notify about auto-categorization
  const categorizedCount = categorizedTransactions.filter(t => t.category).length;
  if (categorizedCount > 0) {
    addNotification(
      `Auto-categorized ${categorizedCount} of ${categorizedTransactions.length} transaction${categorizedTransactions.length !== 1 ? 's' : ''}`,
      'info',
      3000
    );
  }
};

const uploadAnother = () => {
  transactions.value = [];
};

const updateTransactionCategory = (transactionId: string, categoryId: string | undefined) => {
  const transaction = transactions.value.find(t => t.id === transactionId);
  if (transaction) {
    transaction.category = categoryId || '';
    // Trigger reactivity
    transactions.value = [...transactions.value];
  }
};

const addManualTransaction = (transaction: Transaction) => {
  // Add the new transaction to the list
  transactions.value = [transaction, ...transactions.value];

  addNotification(
    'Transaction added successfully',
    'success',
    3000
  );
};

const toggleMenu = () => {
  showMenu.value = !showMenu.value;
};

const closeMenu = () => {
  showMenu.value = false;
};

const handleUploadClick = () => {
  uploadAnother();
  closeMenu();
};

const handleCategoriesClick = () => {
  showCategoryManager.value = true;
  closeMenu();
};

const handleSettingsClick = () => {
  showSettings.value = true;
  closeMenu();
};

// Initialize categories and rules on mount
onMounted(() => {
  initializeDefaultCategories();
  initializeDefaultRules();

  // Notify user if data was restored from localStorage
  if (transactions.value.length > 0) {
    addNotification(
      `Restored ${transactions.value.length} transaction${transactions.value.length !== 1 ? 's' : ''} from previous session`,
      'info',
      3000
    );
  }
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <ToastNotification />

    <div class="container mx-auto px-4 py-8">
      <header class="text-center mb-12 relative">
        <h1 class="text-5xl font-bold text-gray-900 mb-4">
          Finance Graphs
        </h1>
        <p class="text-xl text-gray-600">
          Upload your banking statements and visualize your financial data
        </p>

        <!-- Hamburger Menu Button -->
        <div class="absolute top-0 right-0">
          <button
            @click="toggleMenu"
            class="p-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 shadow-lg hover:shadow-xl"
            aria-label="Menu"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <!-- Dropdown Menu -->
          <div
            v-if="showMenu"
            @click.stop
            class="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50"
          >
            <button
              v-if="!showUpload"
              @click="handleUploadClick"
              class="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition-colors text-left group"
            >
              <svg class="w-5 h-5 text-indigo-600 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span class="font-medium text-gray-900">Upload File</span>
            </button>
            <button
              @click="handleCategoriesClick"
              class="w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-50 transition-colors text-left group border-t border-gray-100"
            >
              <svg class="w-5 h-5 text-purple-600 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span class="font-medium text-gray-900">Categories</span>
            </button>
            <button
              @click="handleSettingsClick"
              class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group border-t border-gray-100"
            >
              <svg class="w-5 h-5 text-gray-600 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span class="font-medium text-gray-900">Settings</span>
            </button>
          </div>
        </div>

        <!-- Click outside to close menu -->
        <div
          v-if="showMenu"
          @click="closeMenu"
          class="fixed inset-0 z-40"
        ></div>
      </header>

      <!-- Upload Screen -->
      <div v-if="showUpload" class="space-y-8">
        <CsvUpload @upload="handleUpload" />
      </div>

      <!-- Transaction List -->
      <div v-else class="space-y-8">
        <TransactionList
          :transactions="transactions"
          :categories="categories"
          @update-category="updateTransactionCategory"
          @add-transaction="addManualTransaction"
        />
      </div>

      <!-- AI Cleaning Progress Modal -->
      <div
        v-if="isCleaningDescriptions"
        class="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50"
      >
        <div class="bg-white rounded-lg shadow-xl p-6 max-w-md">
          <div class="flex items-center gap-4">
            <svg class="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Cleaning Descriptions</h3>
              <p class="text-sm text-gray-600">Using Claude AI to make descriptions readable...</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Category Manager Modal -->
      <CategoryManager
        :is-open="showCategoryManager"
        @close="showCategoryManager = false"
      />

      <!-- Settings Modal -->
      <SettingsModal
        :is-open="showSettings"
        @close="showSettings = false"
      />
    </div>
  </div>
</template>
