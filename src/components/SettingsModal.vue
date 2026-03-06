<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSettings } from '../composables/useSettings';
import { validateApiKey, cleanDescriptions } from '../services/claudeService';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
  deleteAllTransactions: [];
}>();

const { settings, setApiKey, clearApiKey, toggleAICleaning, getPrompt, setPrompt, resetPrompt, DEFAULT_PROMPT } = useSettings();

// Local state for API key input
const apiKeyInput = ref(settings.value.claudeApiKey || '');
const showApiKey = ref(false);
const testingApiKey = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);

// Local state for custom prompt
const customPromptInput = ref(getPrompt());

const isValidApiKey = computed(() => {
  return validateApiKey(apiKeyInput.value);
});

const hasApiKey = computed(() => {
  return apiKeyInput.value.length > 0;
});

const handleClose = () => {
  emit('close');
};

const handleSave = () => {
  if (apiKeyInput.value) {
    setApiKey(apiKeyInput.value);
  } else {
    clearApiKey();
  }

  // Save custom prompt
  setPrompt(customPromptInput.value);

  emit('close');
};

const handleResetPrompt = () => {
  customPromptInput.value = DEFAULT_PROMPT;
};

const handleTestApiKey = async () => {
  if (!isValidApiKey.value) {
    testResult.value = {
      success: false,
      message: 'Invalid API key format. Keys should start with "sk-ant-"',
    };
    return;
  }

  testingApiKey.value = true;
  testResult.value = null;

  try {
    // Test with a simple description
    const result = await cleanDescriptions(
      ['VISA DDA PUR TEST TRANSACTION'],
      apiKeyInput.value
    );

    if (result.success) {
      testResult.value = {
        success: true,
        message: 'API key is valid and working!',
      };
    } else {
      testResult.value = {
        success: false,
        message: result.error || 'API key test failed',
      };
    }
  } catch (error) {
    testResult.value = {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to test API key',
    };
  } finally {
    testingApiKey.value = false;
  }
};

const handleClearApiKey = () => {
  apiKeyInput.value = '';
  testResult.value = null;
};

const handleDeleteAllTransactions = () => {
  if (!confirm('Are you sure you want to delete ALL transactions? Your categories will not be affected. This cannot be undone.')) {
    return;
  }
  emit('deleteAllTransactions');
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
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 class="text-2xl font-bold text-gray-900">Settings</h2>
          <button
            @click="handleClose"
            class="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="px-6 py-6 space-y-6">
          <!-- AI Features Section -->
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-gray-900">AI Features</h3>

            <!-- Enable AI Cleaning Toggle -->
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <div class="flex-1">
                <div class="font-medium text-gray-900">Clean descriptions with AI</div>
                <div class="text-sm text-gray-600 mt-1">
                  Use Claude AI to make transaction descriptions human-readable before categorization
                </div>
              </div>
              <button
                @click="toggleAICleaning"
                :class="[
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                  settings.enableAICleaning ? 'bg-indigo-600' : 'bg-gray-200'
                ]"
                role="switch"
                :aria-checked="settings.enableAICleaning"
              >
                <span
                  :class="[
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    settings.enableAICleaning ? 'translate-x-5' : 'translate-x-0'
                  ]"
                />
              </button>
            </div>

            <!-- API Key Section -->
            <div class="space-y-3">
              <label class="block">
                <span class="text-sm font-medium text-gray-700">Claude API Key</span>
                <div class="mt-2 flex gap-2">
                  <div class="relative flex-1">
                    <input
                      v-model="apiKeyInput"
                      :type="showApiKey ? 'text' : 'password'"
                      placeholder="sk-ant-..."
                      class="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button
                      @click="showApiKey = !showApiKey"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      type="button"
                    >
                      <svg v-if="!showApiKey" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    </button>
                  </div>
                  <button
                    @click="handleTestApiKey"
                    :disabled="!hasApiKey || testingApiKey"
                    class="px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium whitespace-nowrap"
                  >
                    {{ testingApiKey ? 'Testing...' : 'Test Key' }}
                  </button>
                  <button
                    v-if="hasApiKey"
                    @click="handleClearApiKey"
                    class="px-4 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors font-medium"
                  >
                    Clear
                  </button>
                </div>
              </label>

              <!-- Test Result -->
              <div
                v-if="testResult"
                :class="[
                  'p-3 rounded-2xl text-sm',
                  testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                ]"
              >
                {{ testResult.message }}
              </div>

              <!-- Help Text -->
              <div class="text-sm text-gray-600 space-y-1">
                <p>
                  <strong>Optional:</strong> Provide your own API key from
                  <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-700 underline">Anthropic Console</a>
                </p>
                <p class="text-xs text-gray-500">
                  If left empty, the server's configured API key will be used (if available).
                  Transaction descriptions are sent to Anthropic's API for processing.
                  Estimated cost: ~$0.0023 per 100 transactions.
                </p>
              </div>
            </div>

            <!-- Custom Prompt Section -->
            <div class="space-y-3 pt-4 border-t border-gray-200">
              <div class="flex items-center justify-between">
                <label class="block">
                  <span class="text-sm font-medium text-gray-700">AI Cleaning Prompt</span>
                </label>
                <button
                  @click="handleResetPrompt"
                  class="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Reset to Default
                </button>
              </div>
              <textarea
                v-model="customPromptInput"
                rows="6"
                class="w-full px-3 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono"
                placeholder="Enter your custom prompt for cleaning transaction descriptions..."
              ></textarea>
              <div class="text-xs text-gray-600">
                <p class="mb-1">
                  Customize how Claude AI cleans your transaction descriptions. The prompt should instruct the AI on what to preserve and how to format the output.
                </p>
                <p class="text-gray-500">
                  <strong>Note:</strong> The system will automatically add numbered input descriptions and request numbered output in the same order.
                </p>
              </div>
            </div>
          </div>

          <!-- Danger Zone -->
          <div class="space-y-4 pt-6 border-t border-gray-200">
            <h3 class="text-lg font-semibold text-red-600">Danger Zone</h3>
            <div class="p-4 bg-red-50 rounded-2xl border border-red-200">
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-medium text-gray-900">Delete all transactions</div>
                  <div class="text-sm text-gray-600 mt-1">
                    Permanently remove all transactions. Categories and rules will not be affected.
                  </div>
                </div>
                <button
                  @click="handleDeleteAllTransactions"
                  class="px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors font-medium whitespace-nowrap"
                >
                  Delete All
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
          <button
            @click="handleClose"
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            @click="handleSave"
            class="px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors font-medium"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
