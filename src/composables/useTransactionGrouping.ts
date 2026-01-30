import { type Ref, computed } from 'vue';
import { useLocalStorage } from './useLocalStorage';
import type { Transaction, TransactionGroupWithCategory } from '../types/transaction';

// Store expanded groups in localStorage as array
const expandedGroupsArray: Ref<string[]> = useLocalStorage<string[]>('expanded-groups', []);

export function useTransactionGrouping() {
  // Create a computed Set for easy lookups
  const expandedGroups = computed(() => new Set(expandedGroupsArray.value));

  /**
   * Group transactions by description
   */
  const groupByDescription = (transactions: Transaction[]): TransactionGroupWithCategory[] => {
    const grouped = new Map<string, Transaction[]>();

    // Group transactions by description
    transactions.forEach(transaction => {
      const key = transaction.description || '(Empty Description)';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(transaction);
    });

    // Convert to array of TransactionGroupWithCategory
    const groups: TransactionGroupWithCategory[] = [];

    grouped.forEach((transactions, description) => {
      const total = transactions.reduce((sum, t) => sum + t.amount, 0);

      // Determine group category (if all transactions have same category)
      const categories = new Set(transactions.map(t => t.category).filter(Boolean));
      const groupCategory = categories.size === 1 ? Array.from(categories)[0] : undefined;

      groups.push({
        name: description,
        transactions,
        total,
        category: groupCategory,
        isExpanded: expandedGroups.value.has(description),
      });
    });

    // Sort groups by total number of transactions (descending)
    groups.sort((a, b) => b.transactions.length - a.transactions.length);

    return groups;
  };

  /**
   * Toggle expanded state for a group
   */
  const toggleGroup = (groupName: string): void => {
    const index = expandedGroupsArray.value.indexOf(groupName);
    if (index !== -1) {
      expandedGroupsArray.value.splice(index, 1);
    } else {
      expandedGroupsArray.value.push(groupName);
    }
  };

  /**
   * Expand all groups
   */
  const expandAll = (groups: TransactionGroupWithCategory[]): void => {
    expandedGroupsArray.value = groups.map(group => group.name);
  };

  /**
   * Collapse all groups
   */
  const collapseAll = (): void => {
    expandedGroupsArray.value = [];
  };

  /**
   * Check if a group is expanded
   */
  const isGroupExpanded = (groupName: string): boolean => {
    return expandedGroupsArray.value.includes(groupName);
  };

  return {
    expandedGroups,
    groupByDescription,
    toggleGroup,
    expandAll,
    collapseAll,
    isGroupExpanded,
  };
}
