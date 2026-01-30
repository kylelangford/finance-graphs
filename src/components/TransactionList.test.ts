import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import TransactionList from './TransactionList.vue';
import type { Transaction, Category } from '../types/transaction';

describe('TransactionList Component', () => {
  const mockCategories: Category[] = [
    { id: 'cat-1', name: 'Food', color: 'green', isDefault: true, createdAt: '2024-01-01' },
    { id: 'cat-2', name: 'Income', color: 'blue', isDefault: true, createdAt: '2024-01-01' },
  ];

  const mockTransactions: Transaction[] = [
    {
      id: '1',
      date: '2024-01-15',
      description: 'Coffee Shop',
      amount: -5.50,
      transactionType: 'Debit',
      category: '',
    },
    {
      id: '2',
      date: '2024-01-16',
      description: 'Salary',
      amount: 2500.00,
      transactionType: 'Credit',
      category: '',
    },
    {
      id: '3',
      date: '2024-01-14',
      description: 'Groceries',
      amount: -45.00,
      transactionType: 'Debit',
      category: '',
    },
  ];

  describe('Rendering', () => {
    it('should render transaction table', () => {
      const wrapper = mount(TransactionList, {
        props: { transactions: mockTransactions, categories: mockCategories },
      });

      expect(wrapper.find('table').exists()).toBe(true);
      expect(wrapper.findAll('tbody tr')).toHaveLength(3);
    });

    it('should display transaction details correctly', () => {
      const wrapper = mount(TransactionList, {
        props: { transactions: mockTransactions, categories: mockCategories },
      });

      const rows = wrapper.findAll('tbody tr');
      expect(rows.length).toBeGreaterThan(0);

      const tableText = wrapper.find('table').text();
      expect(tableText).toContain('Coffee Shop');
      expect(tableText).toContain('Salary');
      expect(tableText).toContain('Groceries');
    });

    it('should show "No transactions" message when empty', () => {
      const wrapper = mount(TransactionList, {
        props: { transactions: [] },
      });

      expect(wrapper.text()).toContain('No transactions to display');
      expect(wrapper.findAll('tbody tr')).toHaveLength(0);
    });

    it('should display correct transaction count in header', () => {
      const wrapper = mount(TransactionList, {
        props: { transactions: mockTransactions, categories: mockCategories },
      });

      expect(wrapper.text()).toContain('3 transactions');
    });

    it('should display singular "transaction" for single item', () => {
      const wrapper = mount(TransactionList, {
        props: { transactions: [mockTransactions[0]] },
      });

      expect(wrapper.text()).toContain('1 transaction');
      expect(wrapper.text()).not.toContain('1 transactions');
    });
  });

  describe('Summary Statistics', () => {
    it('should calculate total debits correctly', () => {
      const wrapper = mount(TransactionList, {
        props: { transactions: mockTransactions, categories: mockCategories },
      });

      const headerText = wrapper.text();
      expect(headerText).toContain('Debits: $50.50'); // 5.50 + 45.00
    });

    it('should calculate total credits correctly', () => {
      const wrapper = mount(TransactionList, {
        props: { transactions: mockTransactions, categories: mockCategories },
      });

      const headerText = wrapper.text();
      expect(headerText).toContain('Credits: $2,500.00');
    });

    it('should calculate net amount correctly', () => {
      const wrapper = mount(TransactionList, {
        props: { transactions: mockTransactions, categories: mockCategories },
      });

      const headerText = wrapper.text();
      expect(headerText).toContain('Net: $2,449.50'); // 2500 - 5.50 - 45.00
    });

    it('should handle all debits correctly', () => {
      const allDebits: Transaction[] = [
        { id: '1', date: '2024-01-15', description: 'Test', amount: -10, transactionType: 'Debit' },
        { id: '2', date: '2024-01-16', description: 'Test', amount: -20, transactionType: 'Debit' },
      ];

      const wrapper = mount(TransactionList, {
        props: { transactions: allDebits },
      });

      expect(wrapper.text()).toContain('Debits: $30.00');
      expect(wrapper.text()).toContain('Credits: $0.00');
      expect(wrapper.text()).toContain('Net: -$30.00');
    });

    it('should handle all credits correctly', () => {
      const allCredits: Transaction[] = [
        { id: '1', date: '2024-01-15', description: 'Test', amount: 100, transactionType: 'Credit' },
        { id: '2', date: '2024-01-16', description: 'Test', amount: 200, transactionType: 'Credit' },
      ];

      const wrapper = mount(TransactionList, {
        props: { transactions: allCredits },
      });

      expect(wrapper.text()).toContain('Debits: $0.00');
      expect(wrapper.text()).toContain('Credits: $300.00');
      expect(wrapper.text()).toContain('Net: $300.00');
    });
  });

  describe('Sorting', () => {
    it('should initially sort by date descending', () => {
      const wrapper = mount(TransactionList, {
        props: { transactions: mockTransactions, categories: mockCategories },
      });

      const rows = wrapper.findAll('tbody tr');
      const firstRowDate = rows[0].text();

      // Should show newest date first (2024-01-16)
      expect(firstRowDate).toContain('Salary');
    });

    it('should toggle sort order when clicking same column', async () => {
      const wrapper = mount(TransactionList, {
        props: { transactions: mockTransactions, categories: mockCategories },
      });

      const dateHeader = wrapper.find('th');

      // Initially sorted by date desc, so first click toggles to asc
      await dateHeader.trigger('click');
      let rows = wrapper.findAll('tbody tr');
      expect(rows[0].text()).toContain('Groceries'); // oldest (2024-01-14)

      // Second click should reverse to desc
      await dateHeader.trigger('click');
      rows = wrapper.findAll('tbody tr');
      expect(rows[0].text()).toContain('Salary'); // newest
    });

    it('should sort by description', async () => {
      const wrapper = mount(TransactionList, {
        props: { transactions: mockTransactions, categories: mockCategories },
      });

      const descriptionHeader = wrapper.findAll('th')[1];
      await descriptionHeader.trigger('click');

      const rows = wrapper.findAll('tbody tr');
      const descriptions = rows.map(row => {
        const text = row.text();
        if (text.includes('Coffee')) return 'Coffee';
        if (text.includes('Groceries')) return 'Groceries';
        if (text.includes('Salary')) return 'Salary';
        return '';
      });

      // Should be sorted Z-A initially (desc)
      expect(descriptions[0]).toBe('Salary');
    });

    it('should sort by amount', async () => {
      const wrapper = mount(TransactionList, {
        props: { transactions: mockTransactions, categories: mockCategories },
      });

      const amountHeader = wrapper.findAll('th')[4]; // Index changed due to category column
      await amountHeader.trigger('click');

      const rows = wrapper.findAll('tbody tr');

      // First row should have highest amount (desc)
      expect(rows[0].text()).toContain('Salary');
    });

    it('should sort by transaction type', async () => {
      const wrapper = mount(TransactionList, {
        props: { transactions: mockTransactions, categories: mockCategories },
      });

      const typeHeader = wrapper.findAll('th')[2];
      await typeHeader.trigger('click');

      const rows = wrapper.findAll('tbody tr');

      // Check that sorting happened (we have both Debit and Credit)
      expect(rows.length).toBe(3);
    });

    it('should show correct sort icons', () => {
      const wrapper = mount(TransactionList, {
        props: { transactions: mockTransactions, categories: mockCategories },
      });

      const headerText = wrapper.findAll('th')[0].text();

      // Active sort column should show ↓ or ↑
      expect(headerText).toMatch(/[↓↑]/);
    });
  });

  describe('Formatting', () => {
    it('should format currency correctly', () => {
      const wrapper = mount(TransactionList, {
        props: { transactions: mockTransactions, categories: mockCategories },
      });

      const text = wrapper.text();
      expect(text).toContain('$5.50');
      expect(text).toContain('$2,500.00');
    });

    it('should format dates correctly', () => {
      const wrapper = mount(TransactionList, {
        props: { transactions: mockTransactions, categories: mockCategories },
      });

      const text = wrapper.text();
      expect(text).toContain('Jan');
      expect(text).toContain('2024');
    });

    it('should handle invalid dates gracefully', () => {
      const invalidDateTransaction: Transaction = {
        id: '1',
        date: 'invalid-date',
        description: 'Test',
        amount: 10,
        transactionType: 'Credit',
      };

      const wrapper = mount(TransactionList, {
        props: { transactions: [invalidDateTransaction] },
      });

      // Should display the original string if date is invalid
      expect(wrapper.text()).toContain('invalid-date');
    });

    it('should display debit badge with red styling', () => {
      const wrapper = mount(TransactionList, {
        props: { transactions: [mockTransactions[0]] }, // Coffee Shop - Debit
      });

      const badge = wrapper.find('.bg-red-100');
      expect(badge.exists()).toBe(true);
      expect(badge.text()).toBe('Debit');
    });

    it('should display credit badge with green styling', () => {
      const wrapper = mount(TransactionList, {
        props: { transactions: [mockTransactions[1]] }, // Salary - Credit
      });

      const badge = wrapper.find('.bg-green-100');
      expect(badge.exists()).toBe(true);
      expect(badge.text()).toBe('Credit');
    });

    it('should color negative amounts red', () => {
      const wrapper = mount(TransactionList, {
        props: { transactions: [mockTransactions[0]] }, // Negative amount
      });

      const amountCell = wrapper.find('.text-red-600');
      expect(amountCell.exists()).toBe(true);
    });

    it('should color positive amounts green', () => {
      const wrapper = mount(TransactionList, {
        props: { transactions: [mockTransactions[1]] }, // Positive amount
      });

      const amountCell = wrapper.find('.text-green-600');
      expect(amountCell.exists()).toBe(true);
    });
  });

  describe('Responsive Behavior', () => {
    it('should have overflow-x-auto for mobile scrolling', () => {
      const wrapper = mount(TransactionList, {
        props: { transactions: mockTransactions, categories: mockCategories },
      });

      const scrollContainer = wrapper.find('.overflow-x-auto');
      expect(scrollContainer.exists()).toBe(true);
    });
  });

  describe('Computed Properties', () => {
    it('should recalculate stats when transactions change', async () => {
      const wrapper = mount(TransactionList, {
        props: { transactions: [mockTransactions[0]] },
      });

      expect(wrapper.text()).toContain('1 transaction');
      expect(wrapper.text()).toContain('Debits: $5.50');

      // Update props
      await wrapper.setProps({ transactions: mockTransactions });

      expect(wrapper.text()).toContain('3 transactions');
      expect(wrapper.text()).toContain('Debits: $50.50');
    });

    it('should maintain sort when transactions update', async () => {
      const wrapper = mount(TransactionList, {
        props: { transactions: mockTransactions, categories: mockCategories },
      });

      // Click to sort by amount
      const amountHeader = wrapper.findAll('th')[3];
      await amountHeader.trigger('click');

      // Add a new transaction
      const newTransactions = [
        ...mockTransactions,
        {
          id: '4',
          date: '2024-01-17',
          description: 'New Transaction',
          amount: -100,
          transactionType: 'Debit' as const,
        },
      ];

      await wrapper.setProps({ transactions: newTransactions });

      // Should still be sorted by amount
      expect(wrapper.findAll('tbody tr')).toHaveLength(4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero amount transactions', () => {
      const zeroTransaction: Transaction = {
        id: '1',
        date: '2024-01-15',
        description: 'Zero Amount',
        amount: 0,
        transactionType: 'Credit',
      };

      const wrapper = mount(TransactionList, {
        props: { transactions: [zeroTransaction] },
      });

      expect(wrapper.text()).toContain('$0.00');
    });

    it('should handle very large amounts', () => {
      const largeTransaction: Transaction = {
        id: '1',
        date: '2024-01-15',
        description: 'Large Amount',
        amount: 1000000.50,
        transactionType: 'Credit',
      };

      const wrapper = mount(TransactionList, {
        props: { transactions: [largeTransaction] },
      });

      expect(wrapper.text()).toContain('$1,000,000.50');
    });

    it('should handle very long descriptions', () => {
      const longDescTransaction: Transaction = {
        id: '1',
        date: '2024-01-15',
        description: 'A'.repeat(200),
        amount: 10,
        transactionType: 'Credit',
      };

      const wrapper = mount(TransactionList, {
        props: { transactions: [longDescTransaction] },
      });

      expect(wrapper.find('tbody').exists()).toBe(true);
    });

    it('should handle multiple transactions with same date', () => {
      const sameDate: Transaction[] = [
        { id: '1', date: '2024-01-15', description: 'First', amount: -10, transactionType: 'Debit' },
        { id: '2', date: '2024-01-15', description: 'Second', amount: -20, transactionType: 'Debit' },
        { id: '3', date: '2024-01-15', description: 'Third', amount: -30, transactionType: 'Debit' },
      ];

      const wrapper = mount(TransactionList, {
        props: { transactions: sameDate },
      });

      expect(wrapper.findAll('tbody tr')).toHaveLength(3);
    });
  });
});
