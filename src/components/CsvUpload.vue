<script setup lang="ts">
import { ref } from 'vue';
import type { Transaction } from '../types/transaction';
import { parseCsvFile } from '../utils/csvParser';
import { useNotifications } from '../composables/useNotifications';

const emit = defineEmits<{
  upload: [transactions: Transaction[]];
}>();

const { addNotification } = useNotifications();

const isDragging = ref(false);
const isProcessing = ref(false);
const fileName = ref('');
const fileInput = ref<HTMLInputElement | null>(null);

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
    processFile(files[0]);
  }
};

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  if (files && files.length > 0) {
    processFile(files[0]);
  }
};

const processFile = async (file: File) => {
  fileName.value = file.name;
  isProcessing.value = true;

  const result = await parseCsvFile(file);

  isProcessing.value = false;

  if (result.success && result.data) {
    emit('upload', result.data);
    addNotification(
      `Successfully uploaded ${result.data.length} transaction${result.data.length !== 1 ? 's' : ''}`,
      'success'
    );
  } else {
    addNotification(
      result.error || 'Error parsing CSV file. Please check the format.',
      'error'
    );
  }
};

const triggerFileInput = () => {
  fileInput.value?.click();
};
</script>

<template>
  <div class="w-full max-w-2xl mx-auto">
    <div
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="triggerFileInput"
      :class="[
        'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all',
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
        <div class="text-6xl">
          📊
        </div>

        <div>
          <h3 class="text-xl font-semibold text-gray-900">
            {{ isProcessing ? 'Processing...' : 'Upload CSV File' }}
          </h3>
          <p class="text-gray-600 mt-2">
            Drag and drop your banking statement CSV here, or click to browse
          </p>
        </div>

        <div v-if="fileName" class="text-sm text-indigo-600 font-medium">
          {{ fileName }}
        </div>

        <div class="text-xs text-gray-500">
          Supported columns: Date, Description, Debit, Credit, Transaction Type (or similar variations)
        </div>
      </div>
    </div>
  </div>
</template>
