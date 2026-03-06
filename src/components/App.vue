<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import CsvUpload from './CsvUpload.vue';
import TransactionList from './TransactionList.vue';
import ToastNotification from './ToastNotification.vue';
import CategoryManager from './CategoryManager.vue';
import SettingsModal from './SettingsModal.vue';
import SpendingInsightsModal from './SpendingInsightsModal.vue';
import LoginModal from './LoginModal.vue';
import LandingPage from './LandingPage.vue';
// AI categorization disabled for now
// import CategoryReviewModal from './CategoryReviewModal.vue';
import type { Transaction } from '../types/transaction';
import { useNotifications } from '../composables/useNotifications';
import { useCategories } from '../composables/useCategories';
import { useCategorizationRules } from '../composables/useCategorizationRules';
import { useSettings } from '../composables/useSettings';
import { useAuth } from '../composables/useAuth';
import { categorizeBatch } from '../utils/categorizer';
import { cleanTransactionDescriptions } from '../utils/descriptionCleaner';
import { transactionsAPI, type PaginationInfo } from '../utils/apiClient';
// AI categorization disabled for now
// import { getAICategorySuggestions, type CategorySuggestion } from '../services/aiCategorization';

const { addNotification } = useNotifications();
const { categories, initializeDefaultCategories, addCategory } = useCategories();
const { rules, initializeDefaultRules, addKeywordToCategory } = useCategorizationRules();
const { canUseAIFeatures, getApiKey, getPrompt } = useSettings();
const { user, isAuthenticated, isLoading: isAuthLoading, isInitialized: isAuthInitialized, checkAuth, logout } = useAuth();

// Transactions from database
const transactions = ref<Transaction[]>([]);
const isLoadingTransactions = ref(false);

// Pagination state
const pagination = ref<PaginationInfo | null>(null);
const isLoadingMore = ref(false);
const hasMore = computed(() => pagination.value?.hasMore ?? false);

// Show upload screen if no transactions
const showUpload = computed(() => transactions.value.length === 0 && !isLoadingTransactions.value);

// Modal state
const showCategoryManager = ref(false);
const showSettings = ref(false);
const showSpendingInsights = ref(false);
const showUploadModal = ref(false);
const showHeaderMenu = ref(false);

// AI state
const isCleaningDescriptions = ref(false);
// AI categorization disabled for now
// const isGettingCategorySuggestions = ref(false);
// const categorySuggestions = ref<CategorySuggestion[]>([]);
// const pendingTransactions = ref<Transaction[]>([]);

// Load transactions from database (paginated)
async function loadTransactions() {
  isLoadingTransactions.value = true;
  try {
    const result = await transactionsAPI.getPaginated({ limit: 50 });
    transactions.value = result.transactions;
    pagination.value = result.pagination;
  } catch (error) {
    console.error('Failed to load transactions:', error);
    addNotification('Failed to load transactions', 'error', 5000);
  } finally {
    isLoadingTransactions.value = false;
  }
}

// Load more transactions (pagination)
async function loadMoreTransactions() {
  if (!pagination.value?.hasMore || isLoadingMore.value) return;

  isLoadingMore.value = true;
  try {
    const result = await transactionsAPI.getPaginated({
      limit: 50,
      cursor: pagination.value.nextCursor,
      cursorId: pagination.value.nextCursorId,
    });

    // Append new transactions to existing list
    transactions.value = [...transactions.value, ...result.transactions];
    pagination.value = result.pagination;

    addNotification(
      `Loaded ${result.transactions.length} more transactions`,
      'info',
      2000
    );
  } catch (error) {
    console.error('Failed to load more transactions:', error);
    addNotification('Failed to load more transactions', 'error', 5000);
  } finally {
    isLoadingMore.value = false;
  }
}

// Helper: Create a unique key for deduplication
const getTransactionKey = (t: Transaction) => {
  const desc = t.originalDescription || t.description;
  const date = t.date.split('T')[0]; // Normalize date to YYYY-MM-DD
  const amount = Math.abs(t.amount).toFixed(2);
  return `${date}|${amount}|${desc.toLowerCase().trim()}`;
};

const handleUpload = async (uploadedTransactions: Transaction[]) => {
  // Quick client-side pre-filter against already-loaded transactions
  // Server will do the authoritative duplicate check
  const existingKeys = new Set(transactions.value.map(getTransactionKey));
  const preFilteredTransactions = uploadedTransactions.filter(t => !existingKeys.has(getTransactionKey(t)));

  if (preFilteredTransactions.length === 0) {
    addNotification('All transactions appear to be duplicates', 'warning', 3000);
    return;
  }

  let processedTransactions = preFilteredTransactions;

  // Step 1: Clean descriptions with AI (if enabled)
  if (canUseAIFeatures.value) {
    const apiKey = getApiKey();
    isCleaningDescriptions.value = true;

    try {
      const cleaningResult = await cleanTransactionDescriptions(
        uniqueTransactions,
        {
          apiKey: apiKey || '',
          customPrompt: getPrompt(),
        }
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

  // Step 2: Use rule-based categorization (AI categorization disabled for now)
  await saveTransactionsWithRules(processedTransactions);
};

// Helper: Save transactions using rule-based categorization
const saveTransactionsWithRules = async (processedTransactions: Transaction[]) => {
  const categorizedTransactions = categorizeBatch(
    processedTransactions,
    rules.value,
    categories.value
  );

  try {
    const result = await transactionsAPI.create(categorizedTransactions);

    // Handle import result with duplicate detection
    if (result.skipped > 0) {
      addNotification(
        `Skipped ${result.skipped} duplicate transaction${result.skipped !== 1 ? 's' : ''}`,
        'info',
        3000
      );
    }

    if (result.imported === 0) {
      if (result.skipped > 0) {
        addNotification('All transactions were duplicates', 'warning', 3000);
      }
      return;
    }

    // Append new transactions to existing ones (new ones first)
    transactions.value = [...result.transactions, ...transactions.value];

    const categorizedCount = result.transactions.filter(t => t.category).length;
    if (categorizedCount > 0) {
      addNotification(
        `Auto-categorized ${categorizedCount} of ${result.imported} transaction${result.imported !== 1 ? 's' : ''}`,
        'info',
        3000
      );
    }
  } catch (error) {
    console.error('Failed to save transactions:', error);
    addNotification('Failed to save transactions to database', 'error', 5000);
  }
};

const handleModalUpload = async (uploadedTransactions: Transaction[]) => {
  showUploadModal.value = false;
  await handleUpload(uploadedTransactions);
};

const updateTransactionCategory = async (transactionId: string, categoryId: string | undefined) => {
  try {
    // Find the transaction to get its description
    const transaction = transactions.value.find(t => t.id === transactionId);

    const updatedTransaction = await transactionsAPI.update(transactionId, {
      category: categoryId || undefined,
    });

    // Update local state
    const index = transactions.value.findIndex(t => t.id === transactionId);
    if (index !== -1) {
      transactions.value[index] = updatedTransaction;
      transactions.value = [...transactions.value]; // Trigger reactivity
    }

    // Auto-add description as keyword to the category's rule
    if (categoryId && transaction?.description) {
      await addKeywordToCategory(categoryId, transaction.description);
    }
  } catch (error) {
    console.error('Failed to update transaction:', error);
    addNotification('Failed to update transaction', 'error', 5000);
  }
};

const addManualTransaction = async (transaction: Transaction) => {
  try {
    const [savedTransaction] = await transactionsAPI.create(transaction);
    // Add the new transaction to the list
    transactions.value = [savedTransaction, ...transactions.value];

    addNotification(
      'Transaction added successfully',
      'success',
      3000
    );
  } catch (error) {
    console.error('Failed to add transaction:', error);
    addNotification('Failed to add transaction', 'error', 5000);
  }
};

const deleteTransaction = async (transactionId: string) => {
  console.log('Deleting transaction:', transactionId);
  try {
    await transactionsAPI.delete(transactionId);
    console.log('Delete API call succeeded for:', transactionId);
    // Remove from local state
    transactions.value = transactions.value.filter(t => t.id !== transactionId);
    addNotification('Transaction deleted successfully', 'success', 3000);
  } catch (error) {
    console.error('Failed to delete transaction:', transactionId, error);
    addNotification('Failed to delete transaction', 'error', 5000);
  }
};

const updateTransaction = async (transactionId: string, updates: Partial<Transaction>) => {
  try {
    const updatedTransaction = await transactionsAPI.update(transactionId, updates);

    // Update local state
    const index = transactions.value.findIndex(t => t.id === transactionId);
    if (index !== -1) {
      transactions.value[index] = updatedTransaction;
      transactions.value = [...transactions.value]; // Trigger reactivity
    }

    addNotification('Transaction updated successfully', 'success', 3000);
  } catch (error) {
    console.error('Failed to update transaction:', error);
    addNotification('Failed to update transaction', 'error', 5000);
  }
};

const bulkDeleteTransactions = async (transactionIds: string[]) => {
  console.log('Bulk deleting transactions:', transactionIds.length);

  try {
    // Use single bulk delete API call
    const result = await transactionsAPI.bulkDelete(transactionIds);
    console.log('Bulk delete result:', result);

    // Remove from local state
    transactions.value = transactions.value.filter(t => !transactionIds.includes(t.id));

    addNotification(
      `Deleted ${result.deletedCount} transaction${result.deletedCount !== 1 ? 's' : ''}`,
      'success',
      3000
    );
  } catch (error) {
    console.error('Failed to bulk delete transactions:', error);
    addNotification('Failed to delete transactions', 'error', 5000);
  }
};

const deleteAllTransactions = async () => {
  console.log('Deleting all transactions...');

  try {
    await transactionsAPI.deleteAll();
    console.log('Delete all completed');
    transactions.value = [];
    addNotification('All transactions deleted', 'success', 3000);
  } catch (error) {
    console.error('Failed to delete all transactions:', error);
    addNotification('Failed to delete all transactions', 'error', 5000);
  }
};

const bulkCleanDescriptions = async (transactionIds: string[]) => {
  if (!canUseAIFeatures.value) {
    addNotification('AI cleaning requires an API key. Please configure it in settings.', 'warning', 5000);
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    addNotification('Please set your Claude API key in settings', 'warning', 5000);
    return;
  }

  // Get selected transactions
  const selectedTransactions = transactions.value.filter(t => transactionIds.includes(t.id));

  if (selectedTransactions.length === 0) {
    return;
  }

  isCleaningDescriptions.value = true;

  try {
    const cleaningResult = await cleanTransactionDescriptions(
      selectedTransactions,
      {
        apiKey,
        customPrompt: getPrompt(),
      }
    );

    if (cleaningResult.success) {
      // Update transactions with cleaned descriptions
      for (const cleanedTx of cleaningResult.transactions) {
        const updates: Partial<Transaction> = {
          description: cleanedTx.description,
          originalDescription: cleanedTx.originalDescription,
        };

        try {
          const updatedTransaction = await transactionsAPI.update(cleanedTx.id, updates);

          // Update local state
          const index = transactions.value.findIndex(t => t.id === cleanedTx.id);
          if (index !== -1) {
            transactions.value[index] = updatedTransaction;
          }
        } catch (error) {
          console.error(`Failed to update transaction ${cleanedTx.id}:`, error);
        }
      }

      transactions.value = [...transactions.value]; // Trigger reactivity

      addNotification(
        `Cleaned ${cleaningResult.cleanedCount} of ${selectedTransactions.length} description${selectedTransactions.length !== 1 ? 's' : ''} with AI`,
        'success',
        3000
      );
    } else {
      addNotification(
        `AI cleaning failed: ${cleaningResult.error}`,
        'error',
        5000
      );
    }
  } catch (error) {
    console.error('AI cleaning error:', error);
    addNotification('AI cleaning failed', 'error', 5000);
  } finally {
    isCleaningDescriptions.value = false;
  }
};

const bulkAutoCategorize = async (transactionIds: string[]) => {
  // Get selected transactions
  const selectedTransactions = transactions.value.filter(t => transactionIds.includes(t.id));

  if (selectedTransactions.length === 0) {
    return;
  }

  // Filter to only uncategorized transactions
  const uncategorizedTransactions = selectedTransactions.filter(t => !t.category);

  if (uncategorizedTransactions.length === 0) {
    addNotification('All selected transactions are already categorized', 'info', 3000);
    return;
  }

  try {
    // Use rule-based categorization
    const categorizedTransactions = categorizeBatch(
      uncategorizedTransactions,
      rules.value,
      categories.value
    );

    // Update transactions in database
    for (const transaction of categorizedTransactions) {
      if (transaction.category) {
        try {
          const updatedTransaction = await transactionsAPI.update(transaction.id, {
            category: transaction.category,
          });

          // Update local state
          const index = transactions.value.findIndex(t => t.id === transaction.id);
          if (index !== -1) {
            transactions.value[index] = updatedTransaction;
          }
        } catch (error) {
          console.error(`Failed to update transaction ${transaction.id}:`, error);
        }
      }
    }

    transactions.value = [...transactions.value]; // Trigger reactivity

    const categorizedCount = categorizedTransactions.filter(t => t.category).length;
    const skippedCount = selectedTransactions.length - uncategorizedTransactions.length;

    if (skippedCount > 0) {
      addNotification(
        `Auto-categorized ${categorizedCount} of ${uncategorizedTransactions.length} uncategorized transaction${uncategorizedTransactions.length !== 1 ? 's' : ''}. Skipped ${skippedCount} already categorized.`,
        'success',
        4000
      );
    } else {
      addNotification(
        `Auto-categorized ${categorizedCount} of ${uncategorizedTransactions.length} transaction${uncategorizedTransactions.length !== 1 ? 's' : ''}`,
        'success',
        3000
      );
    }
  } catch (error) {
    console.error('Failed to auto-categorize transactions:', error);
    addNotification('Failed to auto-categorize transactions', 'error', 5000);
  }
};

const handleUploadClick = () => {
  showUploadModal.value = true;
};

const handleCategoriesClick = () => {
  showCategoryManager.value = true;
};

const handleSettingsClick = () => {
  showSettings.value = true;
};

const handleLogout = async () => {
  showHeaderMenu.value = false;
  await logout();
  // Clear local data
  transactions.value = [];
  pagination.value = null;
  addNotification('Logged out successfully', 'info', 3000);
};

// AI categorization disabled for now
// const handleCategorySuggestionsApproval = async (approvedSuggestions: CategorySuggestion[]) => { ... };
// const handleCategoryReviewClose = () => { ... };

// Initialize app on mount
onMounted(async () => {
  // Check authentication first
  await checkAuth();

  // Only load data if authenticated
  if (isAuthenticated.value) {
    initializeDefaultCategories();
    initializeDefaultRules();

    // Load transactions from database
    await loadTransactions();

    // Notify user if data was loaded
    if (transactions.value.length > 0) {
      addNotification(
        `Loaded ${transactions.value.length} transaction${transactions.value.length !== 1 ? 's' : ''}`,
        'info',
        3000
      );
    }
  }
});
</script>

<template>
  <div class="min-h-screen bg-white">
    <ToastNotification />

    <!-- Landing Page (shown when not authenticated) -->
    <LandingPage v-if="isAuthInitialized && !isAuthenticated && !isAuthLoading" />

    <!-- Loading State -->
    <div v-if="!isAuthInitialized || isAuthLoading" class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <svg class="animate-spin h-12 w-12 text-indigo-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-gray-600">Loading...</p>
      </div>
    </div>

    <!-- Main App Content (only show when authenticated) -->
    <template v-else-if="isAuthenticated">
      <!-- Full-width purple header -->
      <header class="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
        <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 class="text-2xl font-bold">Spend Tracker</h1>

          <!-- Header Menu -->
          <div v-if="!showUpload" class="relative">
          <button
            @click="showHeaderMenu = !showHeaderMenu"
            class="flex items-center gap-2 px-4 py-2 hover:bg-white/20 rounded-full transition-colors text-sm font-medium"
            aria-label="Menu"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Menu
          </button>

          <!-- Dropdown Menu -->
          <div
            v-if="showHeaderMenu"
            class="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50"
          >
            <button
              @click="handleUploadClick(); showHeaderMenu = false"
              class="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition-colors text-left group"
            >
              <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span class="font-medium text-gray-900">Import CSV</span>
            </button>
            <button
              @click="handleCategoriesClick(); showHeaderMenu = false"
              class="w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-50 transition-colors text-left group border-t border-gray-100"
            >
              <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span class="font-medium text-gray-900">Categories</span>
            </button>
            <button
              @click="showSpendingInsights = true; showHeaderMenu = false"
              class="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50 transition-colors text-left group border-t border-gray-100"
            >
              <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span class="font-medium text-gray-900">AI Insights</span>
            </button>
            <button
              @click="handleSettingsClick(); showHeaderMenu = false"
              class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group border-t border-gray-100"
            >
              <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span class="font-medium text-gray-900">Settings</span>
            </button>
            <button
              @click="handleLogout"
              class="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left group border-t border-gray-100"
            >
              <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span class="font-medium text-gray-900">Logout</span>
            </button>
          </div>

          <!-- Click outside to close -->
          <div
            v-if="showHeaderMenu"
            @click="showHeaderMenu = false"
            class="fixed inset-0 z-40"
          ></div>
        </div>
      </div>
    </header>

    <div class="max-w-6xl mx-auto px-4 py-8">
      <!-- Upload Screen -->
      <div v-if="showUpload" class="space-y-8">
        <CsvUpload @upload="handleUpload" />
      </div>

      <!-- Transaction List -->
      <div v-else class="space-y-8">
        <TransactionList
          :transactions="transactions"
          :categories="categories"
          :has-more="hasMore"
          :is-loading-more="isLoadingMore"
          @update-category="updateTransactionCategory"
          @add-transaction="addManualTransaction"
          @delete-transaction="deleteTransaction"
          @update-transaction="updateTransaction"
          @bulk-delete="bulkDeleteTransactions"
          @bulk-clean-descriptions="bulkCleanDescriptions"
          @bulk-auto-categorize="bulkAutoCategorize"
          @load-more="loadMoreTransactions"
        />
      </div>

      <!-- AI Cleaning Progress Modal -->
      <div
        v-if="isCleaningDescriptions"
        class="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50"
      >
        <div class="bg-white rounded-2xl shadow-xl p-6 max-w-md">
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
        @delete-all-transactions="deleteAllTransactions"
      />

      <!-- Spending Insights Modal -->
      <SpendingInsightsModal
        :is-open="showSpendingInsights"
        :transactions="transactions"
        @close="showSpendingInsights = false"
      />

      <!-- Upload More Modal -->
      <div
        v-if="showUploadModal"
        class="fixed inset-0 z-50 overflow-y-auto"
        @click.self="showUploadModal = false"
      >
        <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>
        <div class="flex min-h-screen items-center justify-center p-4">
          <div class="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl" @click.stop>
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 class="text-xl font-bold text-gray-900">Import More Transactions</h2>
              <button
                @click="showUploadModal = false"
                class="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div class="p-6">
              <CsvUpload @upload="handleModalUpload" />
            </div>
          </div>
        </div>
      </div>
    </div>
    </template>
  </div>
</template>
