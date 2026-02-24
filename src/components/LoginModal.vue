<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuth } from '../composables/useAuth';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { login, isLoading, error, clearError } = useAuth();

// Local state
const email = ref('');
const emailSent = ref(false);
const sentMessage = ref('');
const localError = ref('');

// Email validation
const isValidEmail = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.value);
});

const canSubmit = computed(() => {
  return email.value.length > 0 && isValidEmail.value && !isLoading.value;
});

const handleSubmit = async () => {
  if (!canSubmit.value) return;

  localError.value = '';
  clearError();

  const result = await login(email.value);

  if (result.success) {
    emailSent.value = true;
    sentMessage.value = result.message;
  } else {
    localError.value = result.message;
  }
};

const handleReset = () => {
  email.value = '';
  emailSent.value = false;
  sentMessage.value = '';
  localError.value = '';
  clearError();
};
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 overflow-y-auto"
    @click.self="emit('close')"
  >
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" @click="emit('close')"></div>

    <!-- Modal -->
    <div class="flex min-h-screen items-center justify-center p-4">
      <div
        class="relative w-full max-w-md bg-white rounded-2xl shadow-xl"
        @click.stop
      >
        <!-- Close Button -->
        <button
          @click="emit('close')"
          class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <!-- Header -->
        <div class="px-6 py-6 text-center">
          <div class="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-900">Welcome</h2>
          <p class="mt-2 text-gray-600">Sign in to manage your transactions</p>
        </div>

        <!-- Content -->
        <div class="px-6 pb-6">
          <!-- Email Sent State -->
          <div v-if="emailSent" class="text-center space-y-4">
            <div class="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Check your email</h3>
              <p class="mt-2 text-gray-600 text-sm">
                {{ sentMessage }}
              </p>
              <p class="mt-2 text-gray-500 text-xs">
                The link will expire in 15 minutes.
              </p>
            </div>
            <button
              @click="handleReset"
              class="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
            >
              Use a different email
            </button>
          </div>

          <!-- Email Form State -->
          <form v-else @submit.prevent="handleSubmit" class="space-y-4">
            <!-- Error Message -->
            <div
              v-if="localError || error"
              class="p-3 bg-red-50 text-red-800 rounded-xl text-sm"
            >
              {{ localError || error }}
            </div>

            <!-- Email Input -->
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                v-model="email"
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
                class="w-full px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                :disabled="isLoading"
              />
              <p v-if="email && !isValidEmail" class="mt-2 text-sm text-red-600">
                Please enter a valid email address
              </p>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="!canSubmit"
              class="w-full py-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isLoading" class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </span>
              <span v-else>Send magic link</span>
            </button>

            <!-- Help Text -->
            <p class="text-center text-sm text-gray-500">
              We'll send you a secure login link. No password needed.
            </p>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
