import type { Transaction, Category, CategorizationRule, AppSettings } from '../types/transaction';

/**
 * API Client for making HTTP requests to the backend
 */

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new APIError(response.status, error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Pagination types
export interface PaginationInfo {
  hasMore: boolean;
  nextCursor: string | null;
  nextCursorId: string | null;
  count: number;
}

export interface PaginatedResponse<T> {
  transactions: T[];
  pagination: PaginationInfo;
}

export interface PaginationParams {
  limit?: number;
  cursor?: string | null;
  cursorId?: string | null;
}

// Import result types
export interface ImportResult {
  imported: number;
  skipped: number;
  duplicates: Array<{ date: string; description: string; amount: number }>;
  transactions: Transaction[];
}

// Transactions API
export const transactionsAPI = {
  /**
   * Get transactions with pagination
   */
  async getPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<Transaction>> {
    const searchParams = new URLSearchParams();

    // Add cache buster
    searchParams.set('_t', String(Date.now()));

    if (params.limit) {
      searchParams.set('limit', String(params.limit));
    }
    if (params.cursor) {
      searchParams.set('cursor', params.cursor);
    }
    if (params.cursorId) {
      searchParams.set('cursorId', params.cursorId);
    }

    const queryString = searchParams.toString();
    const url = `/api/transactions?${queryString}`;

    return fetchJSON<PaginatedResponse<Transaction>>(url);
  },

  /**
   * Get all transactions (for backward compatibility and small datasets)
   * Note: For large datasets, use getPaginated instead
   */
  async getAll(): Promise<Transaction[]> {
    // Fetch with a high limit to get all in one request
    const result = await this.getPaginated({ limit: 100 });
    let allTransactions = result.transactions;

    // If there are more, keep fetching (fallback for large datasets)
    let pagination = result.pagination;
    while (pagination.hasMore && pagination.nextCursor) {
      const nextResult = await this.getPaginated({
        limit: 100,
        cursor: pagination.nextCursor,
        cursorId: pagination.nextCursorId,
      });
      allTransactions = [...allTransactions, ...nextResult.transactions];
      pagination = nextResult.pagination;
    }

    return allTransactions;
  },

  async create(transactions: Transaction | Transaction[]): Promise<ImportResult> {
    return fetchJSON<ImportResult>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(transactions),
    });
  },

  async update(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    return fetchJSON<Transaction>(`/api/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async delete(id: string): Promise<void> {
    await fetchJSON<{ success: boolean }>(`/api/transactions/${id}`, {
      method: 'DELETE',
    });
  },

  async bulkDelete(ids: string[]): Promise<{ deletedCount: number }> {
    return fetchJSON<{ success: boolean; deletedCount: number }>('/api/transactions', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });
  },

  async deleteAll(): Promise<void> {
    await fetchJSON<{ success: boolean }>('/api/transactions', {
      method: 'DELETE',
    });
  },
};

// Categories API
export const categoriesAPI = {
  async getAll(): Promise<Category[]> {
    return fetchJSON<Category[]>('/api/categories');
  },

  async create(category: Omit<Category, 'id' | 'createdAt' | 'isDefault'>): Promise<Category> {
    return fetchJSON<Category>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
  },

  async update(id: string, updates: Partial<Category>): Promise<Category> {
    return fetchJSON<Category>(`/api/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async delete(id: string): Promise<void> {
    await fetchJSON<{ success: boolean }>(`/api/categories/${id}`, {
      method: 'DELETE',
    });
  },
};

// Rules API
export const rulesAPI = {
  async getAll(): Promise<CategorizationRule[]> {
    return fetchJSON<CategorizationRule[]>('/api/rules');
  },

  async create(rule: Omit<CategorizationRule, 'id'>): Promise<CategorizationRule> {
    return fetchJSON<CategorizationRule>('/api/rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    });
  },

  async update(id: string, updates: Partial<CategorizationRule>): Promise<CategorizationRule> {
    return fetchJSON<CategorizationRule>(`/api/rules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async delete(id: string): Promise<void> {
    await fetchJSON<{ success: boolean }>(`/api/rules/${id}`, {
      method: 'DELETE',
    });
  },
};

// Settings API
export const settingsAPI = {
  async get(): Promise<AppSettings> {
    return fetchJSON<AppSettings>('/api/settings');
  },

  async update(settings: Partial<AppSettings>): Promise<AppSettings> {
    return fetchJSON<AppSettings>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  },
};

// Auth types
export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
}

export interface LoginResponse {
  success: boolean;
  message: string;
}

export interface InviteResponse {
  success: boolean;
  message: string;
}

// Auth API
export const authAPI = {
  async me(): Promise<User | null> {
    try {
      const response = await fetchJSON<AuthResponse>('/api/auth/me');
      return response.user;
    } catch (error) {
      if (error instanceof APIError && error.status === 401) {
        return null;
      }
      throw error;
    }
  },

  async login(email: string): Promise<LoginResponse> {
    return fetchJSON<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async logout(): Promise<void> {
    await fetchJSON<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
    });
  },

  async invite(email: string): Promise<InviteResponse> {
    return fetchJSON<InviteResponse>('/api/auth/invite', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
};

export { APIError };
