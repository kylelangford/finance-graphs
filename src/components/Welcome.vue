<script setup lang="ts">
import { ref } from 'vue';

const message = ref('Finance Graphs');
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
    <div class="text-center space-y-8 p-8">
      <h1 class="text-6xl font-bold text-gray-900">
        {{ message }}
      </h1>
      <p class="text-xl text-gray-600 max-w-2xl">
        Upload your banking statements (CSV files) and visualize your financial data with interactive graphs and grouping.
      </p>
      <div class="flex gap-4 justify-center">
        <button class="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
          Get Started
        </button>
        <button class="px-6 py-3 bg-white text-indigo-600 border-2 border-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium">
          Learn More
        </button>
      </div>
    </div>
  </div>
</template>
