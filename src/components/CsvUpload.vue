<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Transaction } from '../types/transaction';
import { previewCsvFile, parseCsvWithMapping, type CsvPreview, type ColumnMapping } from '../utils/csvParser';
import { useNotifications } from '../composables/useNotifications';

const emit = defineEmits<{
  upload: [transactions: Transaction[]];
}>();

const { addNotification } = useNotifications();

// State
const isDragging = ref(false);
const isProcessing = ref(false);
const fileName = ref('');
const fileInput = ref<HTMLInputElement | null>(null);
const currentFile = ref<File | null>(null);

// Mapping state
const showMapping = ref(false);
const preview = ref<CsvPreview | null>(null);
const amountType = ref<'single' | 'separate'>('single');

// Column mapping
const mapping = ref<ColumnMapping>({
  date: '',
  description: '',
  amount: '',
  debit: '',
  credit: '',
  transactionType: '',
});

// Validation
const isValidMapping = computed(() => {
  const hasDate = !!mapping.value.date;
  const hasDescription = !!mapping.value.description;
  const hasAmount = amountType.value === 'single'
    ? !!mapping.value.amount
    : !!(mapping.value.debit || mapping.value.credit);
  return hasDate && hasDescription && hasAmount;
});

// Auto-detect common column names
function autoDetectMapping(headers: string[]) {
  const lower = headers.map(h => h.toLowerCase());

  // Date
  const dateIdx = lower.findIndex(h => h.includes('date') || h === 'posted' || h === 'transaction date');
  if (dateIdx !== -1) mapping.value.date = headers[dateIdx];

  // Description
  const descIdx = lower.findIndex(h => h.includes('description') || h.includes('memo') || h.includes('payee') || h.includes('merchant'));
  if (descIdx !== -1) mapping.value.description = headers[descIdx];

  // Amount - check for separate debit/credit first
  const debitIdx = lower.findIndex(h => h === 'debit' || h.includes('debit') || h === 'withdrawal');
  const creditIdx = lower.findIndex(h => h === 'credit' || h.includes('credit') || h === 'deposit');

  if (debitIdx !== -1 && creditIdx !== -1) {
    amountType.value = 'separate';
    mapping.value.debit = headers[debitIdx];
    mapping.value.credit = headers[creditIdx];
  } else {
    const amountIdx = lower.findIndex(h => h === 'amount' || h.includes('amount'));
    if (amountIdx !== -1) {
      amountType.value = 'single';
      mapping.value.amount = headers[amountIdx];
    }
  }

  // Transaction type
  const typeIdx = lower.findIndex(h => h.includes('type') || h.includes('transaction type'));
  if (typeIdx !== -1) mapping.value.transactionType = headers[typeIdx];
}

// Handlers
const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = true;
};

const handleDragLeave = () => {
  isDragging.value = false;
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = false;
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    handleFile(files[0]);
  }
};

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  if (files && files.length > 0) {
    handleFile(files[0]);
  }
};

const handleFile = async (file: File) => {
  fileName.value = file.name;
  currentFile.value = file;
  isProcessing.value = true;

  const result = await previewCsvFile(file);

  isProcessing.value = false;

  if (result.success && result.preview) {
    preview.value = result.preview;
    autoDetectMapping(result.preview.headers);
    showMapping.value = true;
  } else {
    addNotification(result.error || 'Error reading CSV file', 'error');
  }
};

const processWithMapping = async () => {
  if (!currentFile.value || !isValidMapping.value) return;

  isProcessing.value = true;

  const effectiveMapping: ColumnMapping = {
    date: mapping.value.date,
    description: mapping.value.description,
    transactionType: mapping.value.transactionType || undefined,
  };

  if (amountType.value === 'single') {
    effectiveMapping.amount = mapping.value.amount;
  } else {
    effectiveMapping.debit = mapping.value.debit || undefined;
    effectiveMapping.credit = mapping.value.credit || undefined;
  }

  const result = await parseCsvWithMapping(currentFile.value, effectiveMapping);

  isProcessing.value = false;

  if (result.success && result.data) {
    showMapping.value = false;
    emit('upload', result.data);
    addNotification(
      `Successfully imported ${result.data.length} transaction${result.data.length !== 1 ? 's' : ''}`,
      'success'
    );
    resetState();
  } else {
    addNotification(result.error || 'Error parsing CSV file', 'error');
  }
};

const resetState = () => {
  currentFile.value = null;
  preview.value = null;
  showMapping.value = false;
  fileName.value = '';
  mapping.value = { date: '', description: '', amount: '', debit: '', credit: '', transactionType: '' };
};

const triggerFileInput = () => {
  fileInput.value?.click();
};
</script>

<template>
  <div class="w-full max-w-2xl mx-auto">
    <!-- File Drop Zone (Step 1) -->
    <div v-if="!showMapping">
      <div
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
        @click="triggerFileInput"
        :class="[
          'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all',
          isDragging
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50',
          isProcessing ? 'opacity-50 cursor-wait' : ''
        ]"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".csv"
          @change="handleFileSelect"
          class="hidden"
          :disabled="isProcessing"
        />

        <div class="space-y-4">
          <div class="text-6xl">📊</div>
          <div>
            <h3 class="text-xl font-semibold text-gray-900">
              {{ isProcessing ? 'Reading file...' : 'Upload CSV File' }}
            </h3>
            <p class="text-gray-600 mt-2">
              Drag and drop your banking statement CSV here, or click to browse
            </p>
          </div>
          <div v-if="fileName" class="text-sm text-indigo-600 font-medium">
            {{ fileName }}
          </div>
        </div>
      </div>
    </div>

    <!-- Column Mapping (Step 2) -->
    <div v-else class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Map Your Columns</h3>
          <p class="text-sm text-gray-600">Tell us which columns contain your transaction data</p>
        </div>
        <button
          @click="resetState"
          class="text-sm text-gray-500 hover:text-gray-700"
        >
          Choose different file
        </button>
      </div>

      <!-- File info -->
      <div class="bg-gray-50 rounded-2xl px-4 py-3 flex items-center gap-3">
        <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-sm text-gray-700">{{ fileName }}</span>
        <span class="text-xs text-gray-500">{{ preview?.sampleRows.length }} rows previewed</span>
      </div>

      <!-- Mapping Form -->
      <div class="space-y-4">
        <!-- Date -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Date Column <span class="text-red-500">*</span>
          </label>
          <select
            v-model="mapping.date"
            class="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select column...</option>
            <option v-for="header in preview?.headers" :key="header" :value="header">
              {{ header }}
            </option>
          </select>
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Description Column <span class="text-red-500">*</span>
          </label>
          <select
            v-model="mapping.description"
            class="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select column...</option>
            <option v-for="header in preview?.headers" :key="header" :value="header">
              {{ header }}
            </option>
          </select>
        </div>

        <!-- Amount Type Toggle -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Amount Format <span class="text-red-500">*</span>
          </label>
          <div class="flex gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                v-model="amountType"
                value="single"
                class="w-4 h-4 text-indigo-600"
              />
              <span class="text-sm text-gray-700">Single amount column</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                v-model="amountType"
                value="separate"
                class="w-4 h-4 text-indigo-600"
              />
              <span class="text-sm text-gray-700">Separate debit/credit columns</span>
            </label>
          </div>
        </div>

        <!-- Single Amount -->
        <div v-if="amountType === 'single'">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Amount Column <span class="text-red-500">*</span>
          </label>
          <select
            v-model="mapping.amount"
            class="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select column...</option>
            <option v-for="header in preview?.headers" :key="header" :value="header">
              {{ header }}
            </option>
          </select>
          <p class="text-xs text-gray-500 mt-1">Negative values will be treated as debits</p>
        </div>

        <!-- Separate Debit/Credit -->
        <div v-else class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Debit Column
            </label>
            <select
              v-model="mapping.debit"
              class="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select column...</option>
              <option v-for="header in preview?.headers" :key="header" :value="header">
                {{ header }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Credit Column
            </label>
            <select
              v-model="mapping.credit"
              class="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select column...</option>
              <option v-for="header in preview?.headers" :key="header" :value="header">
                {{ header }}
              </option>
            </select>
          </div>
        </div>

        <!-- Transaction Type (Optional) -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Transaction Type Column <span class="text-gray-400">(optional)</span>
          </label>
          <select
            v-model="mapping.transactionType"
            class="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">None - infer from amount</option>
            <option v-for="header in preview?.headers" :key="header" :value="header">
              {{ header }}
            </option>
          </select>
        </div>
      </div>

      <!-- Preview Table -->
      <div v-if="preview && preview.sampleRows.length > 0" class="mt-6">
        <h4 class="text-sm font-medium text-gray-700 mb-2">Preview (first {{ preview.sampleRows.length }} rows)</h4>
        <div class="overflow-x-auto border border-gray-200 rounded-2xl">
          <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th
                  v-for="header in preview.headers"
                  :key="header"
                  class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap"
                >
                  {{ header }}
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="(row, idx) in preview.sampleRows" :key="idx">
                <td
                  v-for="header in preview.headers"
                  :key="header"
                  class="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate"
                >
                  {{ row[header] }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          @click="resetState"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          @click="processWithMapping"
          :disabled="!isValidMapping || isProcessing"
          class="px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
        >
          <svg
            v-if="isProcessing"
            class="animate-spin h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isProcessing ? 'Importing...' : 'Import Transactions' }}
        </button>
      </div>
    </div>
  </div>
</template>
