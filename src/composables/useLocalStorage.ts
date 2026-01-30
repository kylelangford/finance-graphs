import { ref, watch, type Ref } from 'vue';

const STORAGE_KEY_PREFIX = 'finance-graphs-';

/**
 * Composable for syncing a ref with localStorage
 */
export function useLocalStorage<T>(key: string, defaultValue: T): Ref<T> {
  const storageKey = STORAGE_KEY_PREFIX + key;

  // Try to load from localStorage
  const loadFromStorage = (): T => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === null) {
        return defaultValue;
      }
      return JSON.parse(stored) as T;
    } catch (error) {
      console.error(`Error loading from localStorage (${storageKey}):`, error);
      return defaultValue;
    }
  };

  // Create reactive ref with loaded value
  const data = ref<T>(loadFromStorage()) as Ref<T>;

  // Watch for changes and save to localStorage
  watch(
    data,
    (newValue) => {
      if (typeof window === 'undefined') {
        return;
      }

      try {
        localStorage.setItem(storageKey, JSON.stringify(newValue));
      } catch (error) {
        console.error(`Error saving to localStorage (${storageKey}):`, error);
      }
    },
    { deep: true }
  );

  return data;
}

/**
 * Clear a specific item from localStorage
 */
export function clearLocalStorage(key: string): void {
  const storageKey = STORAGE_KEY_PREFIX + key;

  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error(`Error clearing localStorage (${storageKey}):`, error);
  }
}

/**
 * Clear all app-related items from localStorage
 */
export function clearAllLocalStorage(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing all localStorage:', error);
  }
}
