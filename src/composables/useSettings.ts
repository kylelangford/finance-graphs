import { computed } from 'vue';
import { useLocalStorage } from './useLocalStorage';

export interface AppSettings {
  enableAICleaning: boolean;
  claudeApiKey: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  enableAICleaning: false,
  claudeApiKey: '',
};

// Singleton settings storage
const settings = useLocalStorage<AppSettings>('app-settings', DEFAULT_SETTINGS);

export function useSettings() {
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
  const setApiKey = (key: string): void => {
    settings.value.claudeApiKey = key;
  };

  /**
   * Clear the Claude API key from user settings
   */
  const clearApiKey = (): void => {
    settings.value.claudeApiKey = '';
  };

  /**
   * Toggle AI cleaning feature on/off
   */
  const toggleAICleaning = (): void => {
    settings.value.enableAICleaning = !settings.value.enableAICleaning;
  };

  /**
   * Enable AI cleaning feature
   */
  const enableAICleaning = (): void => {
    settings.value.enableAICleaning = true;
  };

  /**
   * Disable AI cleaning feature
   */
  const disableAICleaning = (): void => {
    settings.value.enableAICleaning = false;
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
  const resetSettings = (): void => {
    settings.value = { ...DEFAULT_SETTINGS };
  };

  return {
    settings,
    getApiKey,
    setApiKey,
    clearApiKey,
    toggleAICleaning,
    enableAICleaning,
    disableAICleaning,
    isAICleaningEnabled,
    canUseAIFeatures,
    resetSettings,
  };
}
