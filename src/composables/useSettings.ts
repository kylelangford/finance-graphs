import { computed, ref } from 'vue';
import { settingsAPI } from '../utils/apiClient';

export interface AppSettings {
  enableAICleaning: boolean;
  claudeApiKey: string;
  customPrompt?: string;
}

const DEFAULT_PROMPT = `Clean these bank transaction descriptions to just the merchant or service name. Be as brief as possible.

Rules:
- Remove payment method prefixes (VISA, MASTERCARD, DEBIT, etc.)
- Remove transaction codes, reference numbers, and IDs
- Remove location unless it's part of the business name
- Remove transaction type words (PURCHASE, POS, DDA, ACH, etc.)
- Use proper capitalization

Examples:
- "VISA DDA PUR 1234 GOOGLE *YOUTUBE PREM" → "Google YouTube Premium"
- "POS DEBIT STARBUCKS #12345 SAN FRANCISCO CA" → "Starbucks"
- "ACH TRANSFER NETFLIX.COM" → "Netflix"`;

const DEFAULT_SETTINGS: AppSettings = {
  enableAICleaning: false,
  claudeApiKey: '',
  customPrompt: DEFAULT_PROMPT,
};

// Singleton settings storage
const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS });
const isLoaded = ref(false);

export function useSettings() {
  /**
   * Load settings from API
   */
  const loadSettings = async (): Promise<void> => {
    if (isLoaded.value) return;

    try {
      settings.value = await settingsAPI.get();
      isLoaded.value = true;
    } catch (error) {
      console.error('Failed to load settings:', error);
      settings.value = { ...DEFAULT_SETTINGS };
    }
  };

  /**
   * Save settings to API
   */
  const saveSettings = async (updates: Partial<AppSettings>): Promise<void> => {
    try {
      settings.value = await settingsAPI.update(updates);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  /**
   * Get the Claude API key (from user settings or environment variable)
   */
  const getApiKey = (): string | null => {
    // Return user-provided key in settings
    // If empty, the API endpoint will use the server-side CLAUDE_API_KEY
    if (settings.value.claudeApiKey) {
      return settings.value.claudeApiKey;
    }

    // Return empty string to signal server should use its own key
    return '';
  };

  /**
   * Set the Claude API key in user settings
   */
  const setApiKey = async (key: string): Promise<void> => {
    await saveSettings({ claudeApiKey: key });
  };

  /**
   * Clear the Claude API key from user settings
   */
  const clearApiKey = async (): Promise<void> => {
    await saveSettings({ claudeApiKey: '' });
  };

  /**
   * Toggle AI cleaning feature on/off
   */
  const toggleAICleaning = async (): Promise<void> => {
    await saveSettings({ enableAICleaning: !settings.value.enableAICleaning });
  };

  /**
   * Enable AI cleaning feature
   */
  const enableAICleaning = async (): Promise<void> => {
    await saveSettings({ enableAICleaning: true });
  };

  /**
   * Disable AI cleaning feature
   */
  const disableAICleaning = async (): Promise<void> => {
    await saveSettings({ enableAICleaning: false });
  };

  /**
   * Check if AI cleaning is enabled
   */
  const isAICleaningEnabled = (): boolean => {
    return settings.value.enableAICleaning;
  };

  /**
   * Check if AI features can be used (just check if enabled)
   * API key is either user-provided or server-side CLAUDE_API_KEY
   */
  const canUseAIFeatures = computed(() => {
    return settings.value.enableAICleaning;
  });

  /**
   * Reset all settings to defaults
   */
  const resetSettings = async (): Promise<void> => {
    await saveSettings(DEFAULT_SETTINGS);
  };

  /**
   * Get the custom prompt (from user settings or default)
   */
  const getPrompt = (): string => {
    return settings.value.customPrompt || DEFAULT_PROMPT;
  };

  /**
   * Set the custom prompt
   */
  const setPrompt = async (prompt: string): Promise<void> => {
    await saveSettings({ customPrompt: prompt });
  };

  /**
   * Reset prompt to default
   */
  const resetPrompt = async (): Promise<void> => {
    await saveSettings({ customPrompt: DEFAULT_PROMPT });
  };

  // Auto-load settings on first use
  if (!isLoaded.value) {
    loadSettings();
  }

  return {
    settings,
    loadSettings,
    getApiKey,
    setApiKey,
    clearApiKey,
    getPrompt,
    setPrompt,
    resetPrompt,
    toggleAICleaning,
    enableAICleaning,
    disableAICleaning,
    isAICleaningEnabled,
    canUseAIFeatures,
    resetSettings,
    DEFAULT_PROMPT,
  };
}
