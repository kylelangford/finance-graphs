<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Transaction, Category } from '../types/transaction';
import CategoryDropdown from './CategoryDropdown.vue';
import CategoryBadge from './CategoryBadge.vue';
import { useTransactionGrouping } from '../composables/useTransactionGrouping';

const props = defineProps<{
  transactions: Transaction[];
  categories: Category[];
  hasMore?: boolean;
  isLoadingMore?: boolean;
}>();

// Vibrant hex colors for charts and visual elements
const colorToHex: Record<string, string> = {
  blue: '#3B82F6',
  purple: '#8B5CF6',
  green: '#10B981',
  yellow: '#F59E0B',
  pink: '#EC4899',
  red: '#EF4444',
  indigo: '#6366F1',
  emerald: '#14B8A6',
  gray: '#64748B',
  slate: '#475569',
  orange: '#F97316',
  teal: '#06B6D4',
  cyan: '#0EA5E9',
  amber: '#FBBF24',
  lime: '#84CC16',
};

const emit = defineEmits<{
  updateCategory: [transactionId: string, categoryId: string | undefined];
  addTransaction: [transaction: Transaction];
  deleteTransaction: [transactionId: string];
  updateTransaction: [transactionId: string, updates: Partial<Transaction>];
  bulkDelete: [transactionIds: string[]];
  bulkCleanDescriptions: [transactionIds: string[]];
  bulkAutoCategorize: [transactionIds: string[]];
  loadMore: [];
}>();

type SortField = 'date' | 'description' | 'amount' | 'transactionType' | 'category';
type SortOrder = 'asc' | 'desc';

const sortField = ref<SortField>('date');
const sortOrder = ref<SortOrder>('desc');
const showGrouped = ref(false);
const showAddRow = ref(false);

// Edit mode state
const editingTransactionId = ref<string | null>(null);
const editingTransaction = ref<{
  date: string;
  description: string;
  amount: string;
  transactionType: 'Debit' | 'Credit';
  category: string | undefined;
} | null>(null);

// Selection state
const selectedTransactionIds = ref<Set<string>>(new Set());
const showBulkActions = computed(() => selectedTransactionIds.value.size > 0);

// Filter state
const searchQuery = ref('');
const selectedYears = ref<Set<string>>(new Set());
const selectedMonths = ref<Set<string>>(new Set());
const selectedCategories = ref<Set<string>>(new Set());
const selectedDateRange = ref<string | null>(null);

// Date range options
type DateRangeOption = 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'this-year' | 'last-year';

const dateRangeOptions: { value: DateRangeOption; label: string }[] = [
  { value: 'this-week', label: 'This Week' },
  { value: 'last-week', label: 'Last Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'this-year', label: 'This Year' },
  { value: 'last-year', label: 'Last Year' },
];

// Get date range boundaries
function getDateRange(range: DateRangeOption): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (range) {
    case 'this-week': {
      const dayOfWeek = today.getDay();
      const start = new Date(today);
      start.setDate(today.getDate() - dayOfWeek); // Sunday
      const end = new Date(start);
      end.setDate(start.getDate() + 6); // Saturday
      return { start, end };
    }
    case 'last-week': {
      const dayOfWeek = today.getDay();
      const start = new Date(today);
      start.setDate(today.getDate() - dayOfWeek - 7); // Last Sunday
      const end = new Date(start);
      end.setDate(start.getDate() + 6); // Last Saturday
      return { start, end };
    }
    case 'this-month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start, end };
    }
    case 'last-month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start, end };
    }
    case 'this-year': {
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear(), 11, 31);
      return { start, end };
    }
    case 'last-year': {
      const start = new Date(today.getFullYear() - 1, 0, 1);
      const end = new Date(today.getFullYear() - 1, 11, 31);
      return { start, end };
    }
  }
}

// Dropdown open state
const yearDropdownOpen = ref(false);
const monthDropdownOpen = ref(false);
const categoryDropdownOpen = ref(false);
const showAllCategories = ref(false);

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

// Filter transactions based on selected filters (spending only - debits)
const filteredTransactions = computed(() => {
  // Start with only spending (debits)
  let filtered = props.transactions.filter(t => t.transactionType === 'Debit');

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim();
    filtered = filtered.filter(t =>
      t.description.toLowerCase().includes(query) ||
      (t.originalDescription && t.originalDescription.toLowerCase().includes(query))
    );
  }

  // Filter by date range (quick filters)
  if (selectedDateRange.value) {
    const range = getDateRange(selectedDateRange.value as DateRangeOption);
    filtered = filtered.filter(t => {
      const date = new Date(t.date);
      return date >= range.start && date <= range.end;
    });
  }

  // Filter by year (only if no date range selected)
  if (!selectedDateRange.value && selectedYears.value.size > 0) {
    filtered = filtered.filter(t => {
      const year = new Date(t.date).getFullYear().toString();
      return selectedYears.value.has(year);
    });
  }

  // Filter by month (only if no date range selected)
  if (!selectedDateRange.value && selectedMonths.value.size > 0) {
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

// Total spending (all filtered transactions are already debits)
const totalDebits = computed(() => {
  return filteredTransactions.value.reduce((sum, t) => sum + Math.abs(t.amount), 0);
});

// Insights computations
const transactionCount = computed(() => filteredTransactions.value.length);

const averageTransaction = computed(() => {
  if (filteredTransactions.value.length === 0) return 0;
  return totalDebits.value / filteredTransactions.value.length;
});

const largestTransaction = computed(() => {
  if (filteredTransactions.value.length === 0) return null;
  return filteredTransactions.value.reduce((max, t) =>
    Math.abs(t.amount) > Math.abs(max.amount) ? t : max,
    filteredTransactions.value[0]
  );
});

// Uncategorized transactions count
const uncategorizedCount = computed(() => {
  return filteredTransactions.value.filter(t => !t.category).length;
});

// Monthly average spending
const monthlyAverage = computed(() => {
  if (filteredTransactions.value.length === 0) return 0;

  // Get unique months
  const months = new Set<string>();
  filteredTransactions.value.forEach(t => {
    const date = new Date(t.date);
    months.add(`${date.getFullYear()}-${date.getMonth()}`);
  });

  if (months.size === 0) return totalDebits.value;
  return totalDebits.value / months.size;
});

// Category breakdown for spending
const categoryBreakdown = computed(() => {
  const breakdown: { name: string; amount: number; count: number; color: string }[] = [];
  const categoryMap = new Map<string, { amount: number; count: number; color: string }>();

  filteredTransactions.value.forEach(t => {
    const cat = t.category ? getCategoryById(t.category) : null;
    const name = cat?.name || 'Uncategorized';
    // Convert Tailwind color name to hex, fallback to gray
    const color = cat?.color ? (colorToHex[cat.color] || '#64748B') : '#64748B';

    if (categoryMap.has(name)) {
      const existing = categoryMap.get(name)!;
      existing.amount += Math.abs(t.amount);
      existing.count += 1;
    } else {
      categoryMap.set(name, { amount: Math.abs(t.amount), count: 1, color });
    }
  });

  categoryMap.forEach((value, name) => {
    breakdown.push({ name, ...value });
  });

  // Sort by amount descending
  return breakdown.sort((a, b) => b.amount - a.amount);
});

// Top merchants by spending
const topMerchants = computed(() => {
  const merchantMap = new Map<string, number>();

  filteredTransactions.value.forEach(t => {
    const current = merchantMap.get(t.description) || 0;
    merchantMap.set(t.description, current + Math.abs(t.amount));
  });

  return Array.from(merchantMap.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
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

  // Create transaction object (always a spending/debit transaction)
  const transaction: Transaction = {
    id: `manual-${Date.now()}`,
    date: newTransaction.value.date,
    description: newTransaction.value.description,
    amount: -Math.abs(amount),
    transactionType: 'Debit',
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

const handleDeleteTransaction = (transactionId: string) => {
  emit('deleteTransaction', transactionId);
};

const startEditing = (transaction: Transaction) => {
  editingTransactionId.value = transaction.id;
  editingTransaction.value = {
    date: transaction.date,
    description: transaction.description,
    amount: Math.abs(transaction.amount).toString(),
    transactionType: transaction.transactionType,
    category: transaction.category,
  };
};

const cancelEditing = () => {
  editingTransactionId.value = null;
  editingTransaction.value = null;
};

const saveEdit = () => {
  if (!editingTransactionId.value || !editingTransaction.value) return;

  // Validate inputs
  if (!editingTransaction.value.date || !editingTransaction.value.description || !editingTransaction.value.amount) {
    alert('Please fill in Date, Description, and Amount');
    return;
  }

  const amount = parseFloat(editingTransaction.value.amount);
  if (isNaN(amount) || amount <= 0) {
    alert('Please enter a valid positive amount');
    return;
  }

  // Create update object (always a spending/debit transaction)
  const updates: Partial<Transaction> = {
    date: editingTransaction.value.date,
    description: editingTransaction.value.description,
    amount: -Math.abs(amount),
    transactionType: 'Debit',
    category: editingTransaction.value.category,
  };

  emit('updateTransaction', editingTransactionId.value, updates);
  cancelEditing();
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

const selectDateRange = (range: string) => {
  if (selectedDateRange.value === range) {
    // Clicking same range clears it
    selectedDateRange.value = null;
  } else {
    selectedDateRange.value = range;
    // Clear year/month filters when using quick date range
    selectedYears.value = new Set();
    selectedMonths.value = new Set();
  }
};

const clearFilters = () => {
  searchQuery.value = '';
  selectedYears.value.clear();
  selectedMonths.value.clear();
  selectedCategories.value.clear();
  selectedDateRange.value = null;
  // Trigger reactivity
  selectedYears.value = new Set();
  selectedMonths.value = new Set();
  selectedCategories.value = new Set();
};

const hasActiveFilters = computed(() => {
  return searchQuery.value.trim() !== '' ||
         selectedYears.value.size > 0 ||
         selectedMonths.value.size > 0 ||
         selectedCategories.value.size > 0 ||
         selectedDateRange.value !== null;
});

const closeAllDropdowns = () => {
  yearDropdownOpen.value = false;
  monthDropdownOpen.value = false;
  categoryDropdownOpen.value = false;
};

// Selection functions
const allTransactionsSelected = computed(() => {
  if (filteredTransactions.value.length === 0) return false;
  return filteredTransactions.value.every(t => selectedTransactionIds.value.has(t.id));
});

const toggleSelectAll = () => {
  if (allTransactionsSelected.value) {
    selectedTransactionIds.value.clear();
  } else {
    filteredTransactions.value.forEach(t => selectedTransactionIds.value.add(t.id));
  }
  selectedTransactionIds.value = new Set(selectedTransactionIds.value);
};

const toggleSelectTransaction = (transactionId: string) => {
  if (selectedTransactionIds.value.has(transactionId)) {
    selectedTransactionIds.value.delete(transactionId);
  } else {
    selectedTransactionIds.value.add(transactionId);
  }
  selectedTransactionIds.value = new Set(selectedTransactionIds.value);
};

const handleBulkDelete = () => {
  emit('bulkDelete', Array.from(selectedTransactionIds.value));
  selectedTransactionIds.value.clear();
};

const handleBulkCleanDescriptions = () => {
  emit('bulkCleanDescriptions', Array.from(selectedTransactionIds.value));
  selectedTransactionIds.value.clear();
};

const handleBulkAutoCategorize = () => {
  emit('bulkAutoCategorize', Array.from(selectedTransactionIds.value));
  selectedTransactionIds.value.clear();
};
</script>

<template>
  <div class="w-full">
    <div class="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
      <!-- Stats Bar -->
      <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-6 text-sm">
            <span class="text-gray-600">
              {{ filteredTransactions.length }} transaction{{ filteredTransactions.length !== 1 ? 's' : '' }}
            </span>
            <span class="text-gray-900 font-semibold">Total Spending: {{ formatCurrency(totalDebits) }}</span>
          </div>
          <div class="flex gap-2 relative">
            <button
              @click="toggleAddRow"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-colors text-sm font-medium flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              {{ showAddRow ? 'Cancel' : 'Add' }}
            </button>
            <button
              v-if="!showGrouped"
              @click="showGrouped = !showGrouped"
              class="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-full transition-colors text-sm font-medium"
            >
              Group
            </button>
            <button
              v-else
              @click="showGrouped = !showGrouped"
              class="px-4 py-2 bg-indigo-100 border border-indigo-300 text-indigo-700 hover:bg-indigo-200 rounded-full transition-colors text-sm font-medium"
            >
              Ungroup
            </button>
          </div>
        </div>

        <!-- Bulk Actions Bar -->
        <div v-if="showBulkActions" class="mt-3 flex items-center justify-between bg-indigo-600 px-4 py-2 rounded-full">
          <span class="text-white text-sm font-medium">
            {{ selectedTransactionIds.size }} transaction{{ selectedTransactionIds.size !== 1 ? 's' : '' }} selected
          </span>
          <div class="flex gap-2">
            <button
              @click="handleBulkAutoCategorize"
              class="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors text-sm font-medium flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Auto-Categorize
            </button>
            <button
              @click="handleBulkCleanDescriptions"
              class="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-colors text-sm font-medium flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Clean Descriptions
            </button>
            <button
              @click="handleBulkDelete"
              class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors text-sm font-medium flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Selected
            </button>
          </div>
        </div>
      </div>

      <!-- Filters Section -->
      <div class="px-6 py-4 bg-gray-50 border-b border-gray-200 space-y-3">
        <!-- Search Input -->
        <div class="relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search transactions..."
            class="w-full pl-10 pr-10 py-2 bg-white border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-4">
          <!-- Quick Date Range Filters -->
          <div class="flex items-center gap-2">
            <button
              v-for="option in dateRangeOptions"
              :key="option.value"
              @click="selectDateRange(option.value)"
              :class="[
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                selectedDateRange === option.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-indigo-50 hover:border-indigo-300'
              ]"
            >
              {{ option.label }}
            </button>
          </div>

          <div class="w-px h-6 bg-gray-300"></div>

          <!-- Year Dropdown -->
          <div v-if="availableYears.length > 0" class="relative">
            <button
              @click="yearDropdownOpen = !yearDropdownOpen"
              class="px-4 py-2 bg-white border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 min-w-[120px] justify-between"
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
              class="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-2xl shadow-lg z-50 max-h-64 overflow-y-auto"
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
              class="px-4 py-2 bg-white border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 min-w-[120px] justify-between"
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
              class="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-2xl shadow-lg z-50 max-h-64 overflow-y-auto"
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
              class="px-4 py-2 bg-white border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 min-w-[120px] justify-between"
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
              class="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-2xl shadow-lg z-50 max-h-64 overflow-y-auto"
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

      <!-- Insights Panel (Always Visible) -->
      <div v-if="filteredTransactions.length > 0" class="border-b border-gray-200">
        <div class="px-6 py-5 bg-white space-y-6">
          <!-- Summary Cards -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-indigo-50 rounded-xl p-4">
              <p class="text-xs font-medium text-indigo-600 uppercase tracking-wide">Total Spending</p>
              <p class="text-2xl font-bold text-indigo-700 mt-1">{{ formatCurrency(totalDebits) }}</p>
              <p class="text-xs text-indigo-500 mt-1">{{ transactionCount }} transaction{{ transactionCount !== 1 ? 's' : '' }}</p>
            </div>
            <div class="bg-blue-50 rounded-xl p-4">
              <p class="text-xs font-medium text-blue-600 uppercase tracking-wide">Monthly Avg</p>
              <p class="text-2xl font-bold text-blue-700 mt-1">{{ formatCurrency(monthlyAverage) }}</p>
              <p class="text-xs text-blue-500 mt-1">per month</p>
            </div>
            <div class="bg-purple-50 rounded-xl p-4">
              <p class="text-xs font-medium text-purple-600 uppercase tracking-wide">Avg Transaction</p>
              <p class="text-2xl font-bold text-purple-700 mt-1">{{ formatCurrency(averageTransaction) }}</p>
              <p class="text-xs text-purple-500 mt-1">per purchase</p>
            </div>
            <div :class="['rounded-xl p-4', uncategorizedCount > 0 ? 'bg-amber-50' : 'bg-green-50']">
              <p :class="['text-xs font-medium uppercase tracking-wide', uncategorizedCount > 0 ? 'text-amber-600' : 'text-green-600']">Uncategorized</p>
              <p :class="['text-2xl font-bold mt-1', uncategorizedCount > 0 ? 'text-amber-700' : 'text-green-700']">{{ uncategorizedCount }}</p>
              <p :class="['text-xs mt-1', uncategorizedCount > 0 ? 'text-amber-500' : 'text-green-500']">
                {{ uncategorizedCount > 0 ? 'need review' : 'all done' }}
              </p>
            </div>
          </div>

          <!-- Category Breakdown & Top Merchants -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Category Breakdown -->
            <div v-if="categoryBreakdown.length > 0" :class="showAllCategories ? 'md:col-span-2' : ''">
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-sm font-semibold text-gray-700">Spending by Category</h4>
                <button
                  v-if="categoryBreakdown.length > 6"
                  @click="showAllCategories = !showAllCategories"
                  class="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {{ showAllCategories ? 'Show Less' : 'See All' }}
                </button>
              </div>
              <div :class="showAllCategories ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2' : 'space-y-2'">
                <div
                  v-for="cat in (showAllCategories ? categoryBreakdown : categoryBreakdown.slice(0, 6))"
                  :key="cat.name"
                  @click="toggleCategory(cat.name)"
                  :class="[
                    'flex items-center gap-3 cursor-pointer rounded-lg px-2 py-1 -mx-2 transition-colors',
                    selectedCategories.has(cat.name) ? 'bg-indigo-100 ring-1 ring-indigo-300' : 'hover:bg-gray-100'
                  ]"
                >
                  <div
                    class="w-3 h-3 rounded-full flex-shrink-0"
                    :style="{ backgroundColor: cat.color }"
                  ></div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-sm text-gray-700 truncate">{{ cat.name }}</span>
                      <span class="text-sm font-medium text-gray-900">{{ formatCurrency(cat.amount) }}</span>
                    </div>
                    <div class="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        class="h-full rounded-full"
                        :style="{
                          width: `${(cat.amount / totalDebits) * 100}%`,
                          backgroundColor: cat.color
                        }"
                      ></div>
                    </div>
                  </div>
                  <span class="text-xs text-gray-500 w-12 text-right">
                    {{ ((cat.amount / totalDebits) * 100).toFixed(0) }}%
                  </span>
                </div>
              </div>
            </div>

            <!-- Top Merchants (hidden when See All is active) -->
            <div v-if="topMerchants.length > 0 && !showAllCategories">
              <h4 class="text-sm font-semibold text-gray-700 mb-3">Top Merchants</h4>
              <div class="space-y-2">
                <div
                  v-for="(merchant, index) in topMerchants"
                  :key="merchant.name"
                  class="flex items-center gap-3"
                >
                  <span class="w-5 h-5 rounded-full bg-gray-200 text-xs font-medium text-gray-600 flex items-center justify-center">
                    {{ index + 1 }}
                  </span>
                  <span class="flex-1 text-sm text-gray-700 truncate">{{ merchant.name }}</span>
                  <span class="text-sm font-medium text-gray-900">{{ formatCurrency(merchant.amount) }}</span>
                </div>
              </div>

              <!-- Largest Purchase (under Top Merchants) -->
              <div v-if="largestTransaction" class="mt-4 pt-3 border-t border-gray-100">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Largest Purchase</p>
                    <p class="text-sm text-gray-700 mt-0.5">{{ largestTransaction.description }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-bold text-gray-900">{{ formatCurrency(Math.abs(largestTransaction.amount)) }}</p>
                    <p class="text-xs text-gray-400">{{ formatDate(largestTransaction.date) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Click outside to close dropdowns -->
      <div
        v-if="yearDropdownOpen || monthDropdownOpen || categoryDropdownOpen"
        @click="closeAllDropdowns()"
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
                <td class="px-6 py-3 text-right font-medium text-gray-900">
                  {{ formatCurrency(Math.abs(group.total)) }}
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
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                    {{ formatCurrency(Math.abs(transaction.amount)) }}
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
              <th class="px-6 py-3 text-center">
                <input
                  type="checkbox"
                  :checked="allTransactionsSelected"
                  @change="toggleSelectAll"
                  class="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                  title="Select all"
                />
              </th>
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
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <!-- Add Transaction Row -->
            <tr v-if="showAddRow" class="bg-green-50 border-2 border-green-300">
              <td class="px-6 py-4"></td>
              <td class="px-6 py-4">
                <input
                  v-model="newTransaction.date"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </td>
              <td class="px-6 py-4">
                <input
                  v-model="newTransaction.description"
                  type="text"
                  placeholder="Enter description..."
                  class="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                  <!-- Amount Input -->
                  <div class="relative flex-1">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      v-model="newTransaction.amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <!-- Action Buttons -->
                  <button
                    @click="handleAddTransaction"
                    class="px-3 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors text-sm font-medium whitespace-nowrap"
                    title="Save transaction"
                  >
                    Save
                  </button>
                  <button
                    @click="handleCancelAdd"
                    class="px-3 py-2 bg-gray-300 text-gray-700 rounded-full hover:bg-gray-400 transition-colors text-sm font-medium"
                    title="Cancel"
                  >
                    Cancel
                  </button>
                </div>
              </td>
              <td class="px-6 py-4"></td>
            </tr>

            <!-- Transaction Rows -->
            <tr
              v-for="transaction in sortedTransactions"
              :key="transaction.id"
              :class="editingTransactionId === transaction.id ? 'bg-blue-50 border-2 border-blue-300' : 'hover:bg-gray-50 transition-colors'"
            >
              <!-- Edit Mode -->
              <template v-if="editingTransactionId === transaction.id && editingTransaction">
                <td class="px-6 py-4 text-center">
                  <input
                    type="checkbox"
                    :checked="selectedTransactionIds.has(transaction.id)"
                    @change="toggleSelectTransaction(transaction.id)"
                    class="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </td>
                <td class="px-6 py-4">
                  <input
                    v-model="editingTransaction.date"
                    type="date"
                    class="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </td>
                <td class="px-6 py-4">
                  <input
                    v-model="editingTransaction.description"
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </td>
                <td class="px-6 py-4">
                  <CategoryDropdown
                    v-model="editingTransaction.category"
                    :categories="categories"
                  />
                </td>
                <td class="px-6 py-4">
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      v-model="editingTransaction.amount"
                      type="number"
                      step="0.01"
                      min="0"
                      class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center justify-center gap-2">
                    <button
                      @click="saveEdit"
                      class="px-3 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors text-sm font-medium"
                      title="Save changes"
                    >
                      ✓
                    </button>
                    <button
                      @click="cancelEditing"
                      class="px-3 py-2 bg-gray-300 text-gray-700 rounded-full hover:bg-gray-400 transition-colors text-sm font-medium"
                      title="Cancel"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </template>

              <!-- View Mode -->
              <template v-else>
                <td class="px-6 py-4 text-center">
                  <input
                    type="checkbox"
                    :checked="selectedTransactionIds.has(transaction.id)"
                    @change="toggleSelectTransaction(transaction.id)"
                    class="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </td>
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
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                  {{ formatCurrency(Math.abs(transaction.amount)) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <div class="flex items-center justify-center gap-2">
                    <button
                      @click="startEditing(transaction)"
                      class="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      title="Edit transaction"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      @click="handleDeleteTransaction(transaction.id)"
                      class="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Delete transaction"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </template>
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

      <!-- Load More Button -->
      <div v-if="hasMore && filteredTransactions.length > 0" class="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <button
          @click="emit('loadMore')"
          :disabled="isLoadingMore"
          class="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-full transition-colors font-medium flex items-center justify-center gap-2"
        >
          <svg
            v-if="isLoadingMore"
            class="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span v-if="isLoadingMore">Loading more...</span>
          <span v-else>Load More Transactions</span>
        </button>
      </div>
    </div>
  </div>
</template>
