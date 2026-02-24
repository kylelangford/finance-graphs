<script setup lang="ts">
import { ref } from 'vue';
import LoginModal from './LoginModal.vue';

const showLoginModal = ref(false);
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
    <!-- Login Modal -->
    <LoginModal :is-open="showLoginModal" @close="showLoginModal = false" />

    <!-- Navigation -->
    <nav class="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <span class="text-xl font-bold text-gray-900">Spend Tracker</span>
      </div>
      <button
        @click="showLoginModal = true"
        class="px-5 py-2.5 text-indigo-600 font-medium hover:bg-indigo-50 rounded-full transition-colors"
      >
        Sign In
      </button>
    </nav>

    <!-- Hero Section -->
    <section class="max-w-6xl mx-auto px-4 pt-16 pb-24 text-center">
      <h1 class="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
        Take control of your
        <span class="text-indigo-600">spending</span>
      </h1>
      <p class="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
        Import your bank statements, automatically categorize transactions, and gain insights into where your money goes. Simple, private, and powerful.
      </p>
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          @click="showLoginModal = true"
          class="px-8 py-4 bg-indigo-600 text-white font-semibold rounded-full hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
        >
          Get Started
        </button>
        <a
          href="#features"
          class="px-8 py-4 text-gray-700 font-semibold hover:text-indigo-600 transition-colors"
        >
          Learn More
        </a>
      </div>
      <p class="mt-6 text-sm text-gray-500">
        Currently invite-only. Have an account? <button @click="showLoginModal = true" class="text-indigo-600 hover:underline">Sign in</button>
      </p>
    </section>

    <!-- Features Section -->
    <section id="features" class="bg-white py-24">
      <div class="max-w-6xl mx-auto px-4">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Everything you need to track spending
          </h2>
          <p class="text-lg text-gray-600 max-w-2xl mx-auto">
            Powerful features that make managing your finances effortless.
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <!-- Feature 1 -->
          <div class="p-8 rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100">
            <div class="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6">
              <svg class="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-3">Easy CSV Import</h3>
            <p class="text-gray-600">
              Import transactions from any bank. Just drag and drop your CSV file and we'll handle the rest.
            </p>
          </div>

          <!-- Feature 2 -->
          <div class="p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-white border border-purple-100">
            <div class="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
              <svg class="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-3">Smart Categorization</h3>
            <p class="text-gray-600">
              Automatically categorize transactions with customizable rules. The more you use it, the smarter it gets.
            </p>
          </div>

          <!-- Feature 3 -->
          <div class="p-8 rounded-2xl bg-gradient-to-br from-amber-50 to-white border border-amber-100">
            <div class="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-6">
              <svg class="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-3">AI-Powered Insights</h3>
            <p class="text-gray-600">
              Clean up messy bank descriptions and get intelligent insights about your spending patterns.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section class="py-24 bg-gray-50">
      <div class="max-w-6xl mx-auto px-4">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How it works
          </h2>
          <p class="text-lg text-gray-600">
            Get started in three simple steps.
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <div class="text-center">
            <div class="w-16 h-16 bg-indigo-600 text-white text-2xl font-bold rounded-full flex items-center justify-center mx-auto mb-6">
              1
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-3">Upload your statement</h3>
            <p class="text-gray-600">
              Export a CSV from your bank and upload it to Spend Tracker.
            </p>
          </div>

          <div class="text-center">
            <div class="w-16 h-16 bg-indigo-600 text-white text-2xl font-bold rounded-full flex items-center justify-center mx-auto mb-6">
              2
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-3">Categorize transactions</h3>
            <p class="text-gray-600">
              Review auto-categorized transactions and adjust as needed.
            </p>
          </div>

          <div class="text-center">
            <div class="w-16 h-16 bg-indigo-600 text-white text-2xl font-bold rounded-full flex items-center justify-center mx-auto mb-6">
              3
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-3">Understand your spending</h3>
            <p class="text-gray-600">
              See where your money goes and identify areas to save.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Privacy Section -->
    <section class="py-24 bg-white">
      <div class="max-w-4xl mx-auto px-4 text-center">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Your data stays private
        </h2>
        <p class="text-lg text-gray-600 max-w-2xl mx-auto">
          Your financial data is encrypted and never shared. We don't connect to your bank accounts directly - you control what data you upload.
        </p>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-24 bg-indigo-600">
      <div class="max-w-4xl mx-auto px-4 text-center">
        <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">
          Ready to take control?
        </h2>
        <p class="text-xl text-indigo-100 mb-8">
          Start tracking your spending today.
        </p>
        <button
          @click="showLoginModal = true"
          class="px-8 py-4 bg-white text-indigo-600 font-semibold rounded-full hover:bg-indigo-50 transition-colors shadow-lg"
        >
          Get Started
        </button>
        <p class="mt-4 text-indigo-200 text-sm">
          Currently available by invitation only.
        </p>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-900 text-gray-400 py-12">
      <div class="max-w-6xl mx-auto px-4">
        <div class="flex flex-col md:flex-row items-center justify-between">
          <div class="flex items-center gap-2 mb-4 md:mb-0">
            <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span class="text-white font-semibold">Spend Tracker</span>
          </div>
          <p class="text-sm">
            Built with Vue, Astro, and Claude AI
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>
