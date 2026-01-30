<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Transaction, Category } from '../types/transaction';
import CategoryDropdown from './CategoryDropdown.vue';
import CategoryBadge from './CategoryBadge.vue';
import { useTransactionGrouping } from '../composables/useTransactionGrouping';

const props = defineProps<{
  transactions: Transaction[];
  categories: Category[];
}>();

const emit = defineEmits<{
  updateCategory: [transactionId: string, categoryId: string | undefined];
  addTransaction: [transaction: Transaction];
}>();

type SortField = 'date' | 'description' | 'amount' | 'transactionType' | 'category';
type SortOrder = 'asc' | 'desc';

const sortField = ref<SortField>('date');
const sortOrder = ref<SortOrder>('desc');
const showGrouped = ref(false);
const showAddRow = ref(false);

// Filter state
const selectedYears = ref<Set<string>>(new Set());
const selectedMonths = ref<Set<string>>(new Set());
const selectedCategories = ref<Set<string>>(new Set());

// Dropdown open state
const yearDropdownOpen = ref(false);
const monthDropdownOpen = ref(false);
const categoryDropdownOpen = ref(false);

// New transaction form state
const newTransaction = ref({
  date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
  description: '',
  amount: '',
  transactionType: 'Debit' as 'Debit' | 'Credit',
  category: '',
});

const { groupByDescription, toggleGroup, expandedGroups } = useTransactionGrouping();

// Get unique years from transactions
const availableYears = computed(() => {
  const years = new Set<string>();
  props.transactions.forEach(t => {
    const year = new Date(t.date).getFullYear().toString();
    years.add(year);
  });
  return Array.from(years).sort((a, b) => b.localeCompare(a)); // Descending
});

// Get unique months from transactions
const availableMonths = computed(() => {
  const months = new Set<string>();
  props.transactions.forEach(t => {
    const month = new Date(t.date).toLocaleString('en-US', { month: 'long' });
    months.add(month);
  });
  // Sort by month order
  const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  return Array.from(months).sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
});

// Get unique categories from transactions
const availableCategories = computed(() => {
  const categories = new Set<string>();
  props.transactions.forEach(t => {
    if (t.category) {
      const cat = getCategoryById(t.category);
      if (cat) categories.add(cat.name);
    } else {
      categories.add('Uncategorized');
    }
  });
  return Array.from(categories).sort();
});

// Filter transactions based on selected filters
const filteredTransactions = computed(() => {
  let filtered = [...props.transactions];

  // Filter by year
  if (selectedYears.value.size > 0) {
    filtered = filtered.filter(t => {
      const year = new Date(t.date).getFullYear().toString();
      return selectedYears.value.has(year);
    });
  }

  // Filter by month
  if (selectedMonths.value.size > 0) {
    filtered = filtered.filter(t => {
      const month = new Date(t.date).toLocaleString('en-US', { month: 'long' });
      return selectedMonths.value.has(month);
    });
  }

  // Filter by category
  if (selectedCategories.value.size > 0) {
    filtered = filtered.filter(t => {
      if (t.category) {
        const cat = getCategoryById(t.category);
        return cat ? selectedCategories.value.has(cat.name) : false;
      }
      return selectedCategories.value.has('Uncategorized');
    });
  }

  return filtered;
});

const sortedTransactions = computed(() => {
  const sorted = [...filteredTransactions.value].sort((a, b) => {
    let aValue: any = a[sortField.value];
    let bValue: any = b[sortField.value];

    if (sortField.value === 'date') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    } else if (sortField.value === 'amount') {
      aValue = parseFloat(aValue) || 0;
      bValue = parseFloat(bValue) || 0;
    } else if (sortField.value === 'category') {
      // Sort by category name
      const catA = getCategoryById(aValue);
      const catB = getCategoryById(bValue);
      aValue = catA?.name || 'Uncategorized';
      bValue = catB?.name || 'Uncategorized';
    }

    if (aValue < bValue) return sortOrder.value === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder.value === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
});

const groupedTransactions = computed(() => {
  if (!showGrouped.value) return [];
  // Force reactivity by accessing expandedGroups computed
  // This ensures the component re-renders when toggleGroup is called
  expandedGroups.value;
  return groupByDescription(filteredTransactions.value);
});

const totalAmount = computed(() => {
  return filteredTransactions.value.reduce((sum, t) => sum + t.amount, 0);
});

const totalDebits = computed(() => {
  return filteredTransactions.value
    .filter(t => t.transactionType === 'Debit')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
});

const totalCredits = computed(() => {
  return filteredTransactions.value
    .filter(t => t.transactionType === 'Credit')
    .reduce((sum, t) => sum + t.amount, 0);
});

const toggleSort = (field: SortField) => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortOrder.value = 'desc';
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getSortIcon = (field: SortField) => {
  if (sortField.value !== field) return '↕️';
  return sortOrder.value === 'asc' ? '↑' : '↓';
};

const getCategoryById = (categoryId?: string) => {
  if (!categoryId) return undefined;
  return props.categories.find(c => c.id === categoryId);
};

const handleCategoryChange = (transactionId: string, categoryId: string | undefined) => {
  emit('updateCategory', transactionId, categoryId);
};

const toggleAddRow = () => {
  showAddRow.value = !showAddRow.value;
  if (showAddRow.value) {
    // Reset form when opening
    resetNewTransaction();
  }
};

const resetNewTransaction = () => {
  newTransaction.value = {
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    transactionType: 'Debit',
    category: '',
  };
};

const handleAddTransaction = () => {
  // Validate inputs
  if (!newTransaction.value.date || !newTransaction.value.description || !newTransaction.value.amount) {
    alert('Please fill in Date, Description, and Amount');
    return;
  }

  const amount = parseFloat(newTransaction.value.amount);
  if (isNaN(amount) || amount <= 0) {
    alert('Please enter a valid positive amount');
    return;
  }

  // Create transaction object
  const transaction: Transaction = {
    id: `manual-${Date.now()}`,
    date: newTransaction.value.date,
    description: newTransaction.value.description,
    amount: newTransaction.value.transactionType === 'Debit' ? -Math.abs(amount) : Math.abs(amount),
    transactionType: newTransaction.value.transactionType,
    category: newTransaction.value.category || undefined,
  };

  // Emit to parent
  emit('addTransaction', transaction);

  // Reset form and close
  resetNewTransaction();
  showAddRow.value = false;
};

const handleCancelAdd = () => {
  resetNewTransaction();
  showAddRow.value = false;
};

// Filter toggle functions
const toggleYear = (year: string) => {
  if (selectedYears.value.has(year)) {
    selectedYears.value.delete(year);
  } else {
    selectedYears.value.add(year);
  }
  // Trigger reactivity
  selectedYears.value = new Set(selectedYears.value);
};

const toggleMonth = (month: string) => {
  if (selectedMonths.value.has(month)) {
    selectedMonths.value.delete(month);
  } else {
    selectedMonths.value.add(month);
  }
  // Trigger reactivity
  selectedMonths.value = new Set(selectedMonths.value);
};

const toggleCategory = (category: string) => {
  if (selectedCategories.value.has(category)) {
    selectedCategories.value.delete(category);
  } else {
    selectedCategories.value.add(category);
  }
  // Trigger reactivity
  selectedCategories.value = new Set(selectedCategories.value);
};

const clearFilters = () => {
  selectedYears.value.clear();
  selectedMonths.value.clear();
  selectedCategories.value.clear();
  // Trigger reactivity
  selectedYears.value = new Set();
  selectedMonths.value = new Set();
  selectedCategories.value = new Set();
};

const hasActiveFilters = computed(() => {
  return selectedYears.value.size > 0 ||
         selectedMonths.value.size > 0 ||
         selectedCategories.value.size > 0;
});

const closeAllDropdowns = () => {
  yearDropdownOpen.value = false;
  monthDropdownOpen.value = false;
  categoryDropdownOpen.value = false;
};
</script>

<template>
  <div class="w-full max-w-6xl mx-auto">
    <div class="bg-white rounded-lg shadow-lg overflow-hidden">
      <div class="px-6 py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-2xl font-bold">Transactions</h2>
            <p class="text-indigo-100 mt-1">
              <span v-if="hasActiveFilters">
                {{ filteredTransactions.length }} of {{ transactions.length }} transaction{{ transactions.length !== 1 ? 's' : '' }} •
              </span>
              <span v-else>
                {{ transactions.length }} transaction{{ transactions.length !== 1 ? 's' : '' }} •
              </span>
              Debits: {{ formatCurrency(totalDebits) }} •
              Credits: {{ formatCurrency(totalCredits) }} •
              Net: {{ formatCurrency(totalAmount) }}
            </p>
          </div>
          <div class="flex gap-2">
            <button
              @click="toggleAddRow"
              class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              {{ showAddRow ? 'Cancel' : 'Add Transaction' }}
            </button>
            <button
              @click="showGrouped = !showGrouped"
              class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
            >
              {{ showGrouped ? 'Show All' : 'Group by Description' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Filters Section -->
      <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div class="flex items-center gap-4">
          <span class="text-sm font-semibold text-gray-700 uppercase tracking-wider">Filters:</span>

          <!-- Year Dropdown -->
          <div v-if="availableYears.length > 0" class="relative">
            <button
              @click="yearDropdownOpen = !yearDropdownOpen"
              class="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 min-w-[120px] justify-between"
            >
              <span>
                <span v-if="selectedYears.size === 0" class="text-gray-500">Year</span>
                <span v-else class="text-indigo-600">{{ selectedYears.size }} selected</span>
              </span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div
              v-if="yearDropdownOpen"
              @click.stop
              class="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
            >
              <div
                v-for="year in availableYears"
                :key="year"
                @click="toggleYear(year)"
                class="px-4 py-2 hover:bg-indigo-50 cursor-pointer flex items-center gap-2"
              >
                <input
                  type="checkbox"
                  :checked="selectedYears.has(year)"
                  class="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  @click.stop="toggleYear(year)"
                />
                <span class="text-sm text-gray-900">{{ year }}</span>
              </div>
            </div>
          </div>

          <!-- Month Dropdown -->
          <div v-if="availableMonths.length > 0" class="relative">
            <button
              @click="monthDropdownOpen = !monthDropdownOpen"
              class="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 min-w-[120px] justify-between"
            >
              <span>
                <span v-if="selectedMonths.size === 0" class="text-gray-500">Month</span>
                <span v-else class="text-purple-600">{{ selectedMonths.size }} selected</span>
              </span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div
              v-if="monthDropdownOpen"
              @click.stop
              class="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
            >
              <div
                v-for="month in availableMonths"
                :key="month"
                @click="toggleMonth(month)"
                class="px-4 py-2 hover:bg-purple-50 cursor-pointer flex items-center gap-2"
              >
                <input
                  type="checkbox"
                  :checked="selectedMonths.has(month)"
                  class="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  @click.stop="toggleMonth(month)"
                />
                <span class="text-sm text-gray-900">{{ month }}</span>
              </div>
            </div>
          </div>

          <!-- Category Dropdown -->
          <div v-if="availableCategories.length > 0" class="relative">
            <button
              @click="categoryDropdownOpen = !categoryDropdownOpen"
              class="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 min-w-[120px] justify-between"
            >
              <span>
                <span v-if="selectedCategories.size === 0" class="text-gray-500">Category</span>
                <span v-else class="text-green-600">{{ selectedCategories.size }} selected</span>
              </span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div
              v-if="categoryDropdownOpen"
              @click.stop
              class="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
            >
              <div
                v-for="category in availableCategories"
                :key="category"
                @click="toggleCategory(category)"
                class="px-4 py-2 hover:bg-green-50 cursor-pointer flex items-center gap-2"
              >
                <input
                  type="checkbox"
                  :checked="selectedCategories.has(category)"
                  class="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  @click.stop="toggleCategory(category)"
                />
                <span class="text-sm text-gray-900">{{ category }}</span>
              </div>
            </div>
          </div>

          <!-- Clear All Button -->
          <button
            v-if="hasActiveFilters"
            @click="clearFilters"
            class="ml-auto text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Clear All
          </button>
        </div>
      </div>

      <!-- Click outside to close dropdowns -->
      <div
        v-if="yearDropdownOpen || monthDropdownOpen || categoryDropdownOpen"
        @click="closeAllDropdowns"
        class="fixed inset-0 z-40"
      ></div>

      <div class="overflow-x-auto">
        <!-- Grouped View -->
        <table v-if="showGrouped" class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Description
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Count
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Category
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <template v-for="group in groupedTransactions" :key="group.name">
              <!-- Group Header Row -->
              <tr
                @click="toggleGroup(group.name)"
                class="cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <td class="px-6 py-3">
                  <div class="flex items-center gap-2">
                    <span class="text-gray-600">{{ group.isExpanded ? '▼' : '▶' }}</span>
                    <span class="font-semibold text-gray-900">{{ group.name }}</span>
                  </div>
                </td>
                <td class="px-6 py-3 text-right text-sm text-gray-600">
                  {{ group.transactions.length }}
                </td>
                <td class="px-6 py-3">
                  <CategoryBadge v-if="group.category" :category="getCategoryById(group.category)" size="sm" />
                  <span v-else class="text-sm text-gray-500">Mixed</span>
                </td>
                <td class="px-6 py-3 text-right font-medium" :class="group.total >= 0 ? 'text-green-600' : 'text-red-600'">
                  {{ formatCurrency(group.total) }}
                </td>
              </tr>

              <!-- Expanded Transaction Rows -->
              <template v-if="group.isExpanded">
                <tr
                  v-for="transaction in group.transactions"
                  :key="transaction.id"
                  class="bg-white hover:bg-gray-50 transition-colors"
                >
                  <td class="px-6 py-4 pl-12 whitespace-nowrap text-sm text-gray-900">
                    {{ formatDate(transaction.date) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <CategoryDropdown
                      :model-value="transaction.category"
                      :categories="categories"
                      @update:model-value="handleCategoryChange(transaction.id, $event)"
                    />
                  </td>
                  <td
                    class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium"
                    :class="transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'"
                  >
                    {{ formatCurrency(transaction.amount) }}
                  </td>
                </tr>
              </template>
            </template>
          </tbody>
        </table>

        <!-- Regular View -->
        <table v-else class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th
                @click="toggleSort('date')"
                class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <span class="flex items-center gap-2">
                  Date
                  <span class="text-sm">{{ getSortIcon('date') }}</span>
                </span>
              </th>
              <th
                @click="toggleSort('description')"
                class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <span class="flex items-center gap-2">
                  Description
                  <span class="text-sm">{{ getSortIcon('description') }}</span>
                </span>
              </th>
              <th
                @click="toggleSort('category')"
                class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <span class="flex items-center gap-2">
                  Category
                  <span class="text-sm">{{ getSortIcon('category') }}</span>
                </span>
              </th>
              <th
                @click="toggleSort('amount')"
                class="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <span class="flex items-center justify-end gap-2">
                  Amount
                  <span class="text-sm">{{ getSortIcon('amount') }}</span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <!-- Add Transaction Row -->
            <tr v-if="showAddRow" class="bg-green-50 border-2 border-green-300">
              <td class="px-6 py-4">
                <input
                  v-model="newTransaction.date"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </td>
              <td class="px-6 py-4">
                <input
                  v-model="newTransaction.description"
                  type="text"
                  placeholder="Enter description..."
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </td>
              <td class="px-6 py-4">
                <CategoryDropdown
                  v-model="newTransaction.category"
                  :categories="categories"
                />
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <!-- Debit/Credit Toggle -->
                  <select
                    v-model="newTransaction.transactionType"
                    class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  >
                    <option value="Debit">Debit</option>
                    <option value="Credit">Credit</option>
                  </select>
                  <!-- Amount Input -->
                  <div class="relative flex-1">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      v-model="newTransaction.amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <!-- Action Buttons -->
                  <button
                    @click="handleAddTransaction"
                    class="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap"
                    title="Save transaction"
                  >
                    ✓ Save
                  </button>
                  <button
                    @click="handleCancelAdd"
                    class="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm font-medium"
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
              </td>
            </tr>

            <!-- Transaction Rows -->
            <tr
              v-for="transaction in sortedTransactions"
              :key="transaction.id"
              class="hover:bg-gray-50 transition-colors"
            >
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatDate(transaction.date) }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-900 group relative">
                <span>{{ transaction.description }}</span>
                <span
                  v-if="transaction.originalDescription && transaction.originalDescription !== transaction.description"
                  class="ml-2 inline-flex items-center justify-center w-4 h-4 text-xs text-indigo-600 cursor-help"
                  title="AI-cleaned description"
                >
                  ✨
                </span>
                <!-- Tooltip showing original description -->
                <div
                  v-if="transaction.originalDescription && transaction.originalDescription !== transaction.description"
                  class="hidden group-hover:block absolute z-10 px-3 py-2 text-sm bg-gray-900 text-white rounded-lg shadow-lg max-w-md left-0 top-full mt-1"
                >
                  <div class="font-semibold mb-1">Original:</div>
                  {{ transaction.originalDescription }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <CategoryDropdown
                  :model-value="transaction.category"
                  :categories="categories"
                  @update:model-value="handleCategoryChange(transaction.id, $event)"
                />
              </td>
              <td
                class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium"
                :class="transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'"
              >
                {{ formatCurrency(transaction.amount) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="filteredTransactions.length === 0" class="px-6 py-12 text-center text-gray-500">
        <div v-if="hasActiveFilters">
          <p class="text-lg font-medium mb-2">No transactions match your filters</p>
          <button
            @click="clearFilters"
            class="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
          >
            Clear filters
          </button>
        </div>
        <div v-else>
          No transactions to display
        </div>
      </div>
    </div>
  </div>
</template>
