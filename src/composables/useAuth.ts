import { computed, ref } from 'vue';
import { authAPI, type User } from '../utils/apiClient';

// Singleton auth state
const user = ref<User | null>(null);
const isLoading = ref(false);
const isInitialized = ref(false);
const error = ref<string | null>(null);

export function useAuth() {
  const isAuthenticated = computed(() => user.value !== null);

  /**
   * Check authentication status by calling /api/auth/me
   */
  const checkAuth = async (): Promise<User | null> => {
    if (isLoading.value) return user.value;

    isLoading.value = true;
    error.value = null;

    try {
      user.value = await authAPI.me();
      isInitialized.value = true;
      return user.value;
    } catch (err) {
      console.error('Auth check failed:', err);
      user.value = null;
      error.value = 'Failed to check authentication';
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Request a magic link to be sent to the email
   */
  const login = async (email: string): Promise<{ success: boolean; message: string }> => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await authAPI.login(email);
      return response;
    } catch (err: any) {
      const message = err.message || 'Failed to send login link';
      error.value = message;
      return { success: false, message };
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Logout the current user
   */
  const logout = async (): Promise<void> => {
    isLoading.value = true;
    error.value = null;

    try {
      await authAPI.logout();
      user.value = null;
    } catch (err) {
      console.error('Logout failed:', err);
      // Still clear user state even if API call fails
      user.value = null;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Invite a new user by email (requires authentication)
   */
  const invite = async (email: string): Promise<{ success: boolean; message: string }> => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await authAPI.invite(email);
      return response;
    } catch (err: any) {
      const message = err.message || 'Failed to send invitation';
      error.value = message;
      return { success: false, message };
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Clear error state
   */
  const clearError = (): void => {
    error.value = null;
  };

  /**
   * Set user directly (used when returning from verify page)
   */
  const setUser = (newUser: User | null): void => {
    user.value = newUser;
    isInitialized.value = true;
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    error,
    checkAuth,
    login,
    logout,
    invite,
    clearError,
    setUser,
  };
}
