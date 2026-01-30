export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  transactionType: 'Debit' | 'Credit';
  category?: string;
  raw?: Record<string, any>;
  originalDescription?: string;
}

export interface TransactionGroup {
  name: string;
  transactions: Transaction[];
  total: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  createdAt: string;
}

export interface CategorizationRule {
  id: string;
  categoryId: string;
  keywords: string[];
  matchCase: boolean;
  enabled: boolean;
  priority: number;
}

export interface TransactionGroupWithCategory extends TransactionGroup {
  category?: string;
  isExpanded: boolean;
}

export interface CategoryStats {
  categoryId: string;
  categoryName: string;
  count: number;
  totalAmount: number;
  percentage: number;
}
