import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import App from './App.vue';
import CsvUpload from './CsvUpload.vue';
import TransactionList from './TransactionList.vue';
import * as localStorageModule from '../composables/useLocalStorage';
import * as notificationsModule from '../composables/useNotifications';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

global.localStorage = localStorageMock as Storage;

// Mock useLocalStorage to use an in-memory ref
const mockTransactions = ref<any[]>([]);
vi.spyOn(localStorageModule, 'useLocalStorage').mockImplementation(() => mockTransactions);

// Mock notifications
const mockAddNotification = vi.fn();
vi.spyOn(notificationsModule, 'useNotifications').mockReturnValue({
  notifications: ref([]),
  addNotification: mockAddNotification,
  removeNotification: vi.fn(),
  clearAll: vi.fn(),
});

describe('App Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransactions.value = [];
    localStorage.clear();
  });

  describe('Initial Render', () => {
    it('should render the app title', () => {
      const wrapper = mount(App);

      expect(wrapper.text()).toContain('Finance Graphs');
    });

    it('should render the subtitle', () => {
      const wrapper = mount(App);

      expect(wrapper.text()).toContain('Upload your banking statements and visualize your financial data');
    });

    it('should show upload component initially', () => {
      const wrapper = mount(App);

      expect(wrapper.findComponent(CsvUpload).exists()).toBe(true);
      expect(wrapper.findComponent(TransactionList).exists()).toBe(false);
    });

    it('should not show "Upload Another File" button initially', () => {
      const wrapper = mount(App);

      expect(wrapper.text()).not.toContain('Upload Another File');
    });
  });

  describe('CSV Upload Flow', () => {
    it('should switch to transaction list after successful upload', async () => {
      const wrapper = mount(App);

      const csvData = `Date,Description,Amount
2024-01-15,Coffee,-5.50
2024-01-16,Salary,2500.00`;

      const file = new File([csvData], 'test.csv', { type: 'text/csv' });

      const fileInput = wrapper.find('input[type="file"]');
      const inputElement = fileInput.element as HTMLInputElement;

      Object.defineProperty(inputElement, 'files', {
        value: [file],
        writable: false,
      });

      await fileInput.trigger('change');

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 150));
      await wrapper.vm.$nextTick();

      // Should now show transaction list
      expect(wrapper.findComponent(TransactionList).exists()).toBe(true);
      expect(wrapper.findComponent(CsvUpload).exists()).toBe(false);
    });

    it('should display uploaded transactions', async () => {
      const wrapper = mount(App);

      const csvData = `Date,Description,Amount
2024-01-15,Coffee Shop,-5.50
2024-01-16,Salary Deposit,2500.00`;

      const file = new File([csvData], 'test.csv', { type: 'text/csv' });

      const fileInput = wrapper.find('input[type="file"]');
      const inputElement = fileInput.element as HTMLInputElement;

      Object.defineProperty(inputElement, 'files', {
        value: [file],
        writable: false,
      });

      await fileInput.trigger('change');
      await new Promise(resolve => setTimeout(resolve, 150));
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain('Coffee Shop');
      expect(wrapper.text()).toContain('Salary Deposit');
    });

    it('should show correct transaction count after upload', async () => {
      const wrapper = mount(App);

      const csvData = `Date,Description,Amount
2024-01-15,Transaction 1,-10.00
2024-01-16,Transaction 2,20.00
2024-01-17,Transaction 3,-30.00`;

      const file = new File([csvData], 'test.csv', { type: 'text/csv' });

      const fileInput = wrapper.find('input[type="file"]');
      const inputElement = fileInput.element as HTMLInputElement;

      Object.defineProperty(inputElement, 'files', {
        value: [file],
        writable: false,
      });

      await fileInput.trigger('change');
      await new Promise(resolve => setTimeout(resolve, 150));
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain('3 transactions');
    });

    it('should calculate and display summary statistics', async () => {
      const wrapper = mount(App);

      const csvData = `Date,Description,Debit,Credit
2024-01-15,Purchase,25.50,
2024-01-16,Deposit,,100.00`;

      const file = new File([csvData], 'test.csv', { type: 'text/csv' });

      const fileInput = wrapper.find('input[type="file"]');
      const inputElement = fileInput.element as HTMLInputElement;

      Object.defineProperty(inputElement, 'files', {
        value: [file],
        writable: false,
      });

      await fileInput.trigger('change');
      await new Promise(resolve => setTimeout(resolve, 150));
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain('Debits: $25.50');
      expect(wrapper.text()).toContain('Credits: $100.00');
      expect(wrapper.text()).toContain('Net: $74.50');
    });
  });

  describe('Upload Another File Flow', () => {
    it('should show "Upload Another File" button after upload', async () => {
      const wrapper = mount(App);

      const csvData = `Date,Description,Amount
2024-01-15,Test,10.00`;

      const file = new File([csvData], 'test.csv', { type: 'text/csv' });

      const fileInput = wrapper.find('input[type="file"]');
      const inputElement = fileInput.element as HTMLInputElement;

      Object.defineProperty(inputElement, 'files', {
        value: [file],
        writable: false,
      });

      await fileInput.trigger('change');
      await new Promise(resolve => setTimeout(resolve, 150));
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain('Upload Another File');
    });

    it('should return to upload view when clicking "Upload Another File"', async () => {
      const wrapper = mount(App);

      const csvData = `Date,Description,Amount
2024-01-15,Test,10.00`;

      const file = new File([csvData], 'test.csv', { type: 'text/csv' });

      const fileInput = wrapper.find('input[type="file"]');
      const inputElement = fileInput.element as HTMLInputElement;

      Object.defineProperty(inputElement, 'files', {
        value: [file],
        writable: false,
      });

      await fileInput.trigger('change');
      await new Promise(resolve => setTimeout(resolve, 150));
      await wrapper.vm.$nextTick();

      // Click "Upload Another File"
      const buttons = wrapper.findAll('button');
      const uploadButton = buttons.find(btn => btn.text().includes('Upload Another File'));
      expect(uploadButton).toBeDefined();
      await uploadButton!.trigger('click');

      // Should show upload component again
      expect(wrapper.findComponent(CsvUpload).exists()).toBe(true);
      expect(wrapper.findComponent(TransactionList).exists()).toBe(false);
    });

    it('should clear transactions when uploading another file', async () => {
      const wrapper = mount(App);

      // First upload
      const csvData = `Date,Description,Amount
2024-01-15,Test,10.00`;

      const file = new File([csvData], 'test.csv', { type: 'text/csv' });

      let fileInput = wrapper.find('input[type="file"]');
      let inputElement = fileInput.element as HTMLInputElement;

      Object.defineProperty(inputElement, 'files', {
        value: [file],
        writable: false,
      });

      await fileInput.trigger('change');
      await new Promise(resolve => setTimeout(resolve, 150));
      await wrapper.vm.$nextTick();

      // Click "Upload Another File"
      const buttons = wrapper.findAll('button');
      const uploadButton = buttons.find(btn => btn.text().includes('Upload Another File'));
      expect(uploadButton).toBeDefined();
      await uploadButton!.trigger('click');
      await wrapper.vm.$nextTick();

      // Check that transactions are cleared
      expect(mockTransactions.value).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should stay on upload view if file upload fails', async () => {
      const wrapper = mount(App);

      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      const fileInput = wrapper.find('input[type="file"]');
      const inputElement = fileInput.element as HTMLInputElement;

      Object.defineProperty(inputElement, 'files', {
        value: [file],
        writable: false,
      });

      await fileInput.trigger('change');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should still show upload component
      expect(wrapper.findComponent(CsvUpload).exists()).toBe(true);
      expect(wrapper.findComponent(TransactionList).exists()).toBe(false);
    });

    it('should handle empty CSV gracefully', async () => {
      const wrapper = mount(App);

      const csvData = 'Date,Description,Amount';

      const file = new File([csvData], 'test.csv', { type: 'text/csv' });

      const fileInput = wrapper.find('input[type="file"]');
      const inputElement = fileInput.element as HTMLInputElement;

      Object.defineProperty(inputElement, 'files', {
        value: [file],
        writable: false,
      });

      await fileInput.trigger('change');
      await new Promise(resolve => setTimeout(resolve, 150));
      await wrapper.vm.$nextTick();

      // Should remain on upload screen since no transactions were parsed
      expect(mockTransactions.value).toHaveLength(0);
      expect(wrapper.findComponent(CsvUpload).exists()).toBe(true);
      expect(wrapper.findComponent(TransactionList).exists()).toBe(false);
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should show info notification when restoring transactions from localStorage', async () => {
      // Pre-populate mockTransactions to simulate restored data
      mockTransactions.value = [
        {
          id: '1',
          date: '2024-01-15',
          description: 'Previous Session',
          amount: 100,
          transactionType: 'Credit',
        },
      ];

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();

      // Should have shown info notification about restored data
      expect(mockAddNotification).toHaveBeenCalledWith(
        'Restored 1 transaction from previous session',
        'info',
        3000
      );

      // Should show transaction list, not upload
      expect(wrapper.findComponent(TransactionList).exists()).toBe(true);
      expect(wrapper.findComponent(CsvUpload).exists()).toBe(false);
    });

    it('should not show notification when no transactions to restore', async () => {
      mockTransactions.value = [];

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();

      // Should not show any notification
      const restoredCalls = mockAddNotification.mock.calls.filter(call =>
        call[0].includes('Restored')
      );
      expect(restoredCalls).toHaveLength(0);
    });

    it('should persist new transactions', async () => {
      const wrapper = mount(App);

      const csvData = `Date,Description,Amount
2024-01-15,Test Transaction,50.00`;

      const file = new File([csvData], 'test.csv', { type: 'text/csv' });

      const fileInput = wrapper.find('input[type="file"]');
      const inputElement = fileInput.element as HTMLInputElement;

      Object.defineProperty(inputElement, 'files', {
        value: [file],
        writable: false,
      });

      await fileInput.trigger('change');
      await new Promise(resolve => setTimeout(resolve, 150));
      await wrapper.vm.$nextTick();

      // Transactions should be stored
      expect(mockTransactions.value).toHaveLength(1);
      expect(mockTransactions.value[0].description).toBe('Test Transaction');
    });

    it('should clear transactions when uploading another file', async () => {
      // Start with existing transactions
      mockTransactions.value = [
        {
          id: '1',
          date: '2024-01-15',
          description: 'Old Transaction',
          amount: 100,
          transactionType: 'Credit',
        },
      ];

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();

      // Click "Upload Another File"
      const buttons = wrapper.findAll('button');
      const uploadButton = buttons.find(btn => btn.text().includes('Upload Another File'));
      expect(uploadButton).toBeDefined();
      await uploadButton!.trigger('click');
      await wrapper.vm.$nextTick();

      // Transactions should be cleared
      expect(mockTransactions.value).toEqual([]);
      expect(wrapper.findComponent(CsvUpload).exists()).toBe(true);
    });
  });

  describe('State Management', () => {
    it('should manage showUpload state correctly', async () => {
      const wrapper = mount(App);

      // Initially should show upload (no transactions)
      expect(mockTransactions.value).toHaveLength(0);
      expect(wrapper.findComponent(CsvUpload).exists()).toBe(true);

      const csvData = `Date,Description,Amount
2024-01-15,Test,10.00`;

      const file = new File([csvData], 'test.csv', { type: 'text/csv' });

      const fileInput = wrapper.find('input[type="file"]');
      const inputElement = fileInput.element as HTMLInputElement;

      Object.defineProperty(inputElement, 'files', {
        value: [file],
        writable: false,
      });

      await fileInput.trigger('change');
      await new Promise(resolve => setTimeout(resolve, 150));
      await wrapper.vm.$nextTick();

      // Should now show transaction list (has transactions)
      expect(mockTransactions.value).toHaveLength(1);
      expect(wrapper.findComponent(TransactionList).exists()).toBe(true);

      // Click "Upload Another File"
      const buttons = wrapper.findAll('button');
      const uploadButton = buttons.find(btn => btn.text().includes('Upload Another File'));
      expect(uploadButton).toBeDefined();
      await uploadButton!.trigger('click');
      await wrapper.vm.$nextTick();

      // Should show upload again (transactions cleared)
      expect(mockTransactions.value).toHaveLength(0);
      expect(wrapper.findComponent(CsvUpload).exists()).toBe(true);
    });

    it('should store transactions in state', async () => {
      const wrapper = mount(App);

      const csvData = `Date,Description,Amount
2024-01-15,Coffee,-5.50
2024-01-16,Salary,2500.00`;

      const file = new File([csvData], 'test.csv', { type: 'text/csv' });

      const fileInput = wrapper.find('input[type="file"]');
      const inputElement = fileInput.element as HTMLInputElement;

      Object.defineProperty(inputElement, 'files', {
        value: [file],
        writable: false,
      });

      await fileInput.trigger('change');
      await new Promise(resolve => setTimeout(resolve, 150));
      await wrapper.vm.$nextTick();

      expect(mockTransactions.value).toHaveLength(2);
      expect(mockTransactions.value[0].description).toBe('Coffee');
      expect(mockTransactions.value[1].description).toBe('Salary');
    });
  });

  describe('Component Communication', () => {
    it('should handle upload event from CsvUpload', async () => {
      const wrapper = mount(App);

      const csvUpload = wrapper.findComponent(CsvUpload);

      const uploadedTransactions = [
        {
          id: '1',
          date: '2024-01-15',
          description: 'Test',
          amount: 10,
          transactionType: 'Credit' as const,
        },
      ];

      csvUpload.vm.$emit('upload', uploadedTransactions);
      await wrapper.vm.$nextTick();

      // Transactions should be auto-categorized (empty category if no match)
      expect(mockTransactions.value).toHaveLength(1);
      expect(mockTransactions.value[0]).toMatchObject({
        id: '1',
        date: '2024-01-15',
        description: 'Test',
        amount: 10,
        transactionType: 'Credit',
      });
      expect(mockTransactions.value[0]).toHaveProperty('category');
      expect(wrapper.findComponent(TransactionList).exists()).toBe(true);
    });
  });

  describe('UI/UX', () => {
    it('should have gradient background', () => {
      const wrapper = mount(App);

      const bgElement = wrapper.find('.bg-gradient-to-br');
      expect(bgElement.exists()).toBe(true);
    });

    it('should center content with container', () => {
      const wrapper = mount(App);

      expect(wrapper.find('.container').exists()).toBe(true);
      expect(wrapper.find('.mx-auto').exists()).toBe(true);
    });

    it('should have styled upload button', async () => {
      const wrapper = mount(App);

      const csvData = `Date,Description,Amount
2024-01-15,Test,10.00`;

      const file = new File([csvData], 'test.csv', { type: 'text/csv' });

      const fileInput = wrapper.find('input[type="file"]');
      const inputElement = fileInput.element as HTMLInputElement;

      Object.defineProperty(inputElement, 'files', {
        value: [file],
        writable: false,
      });

      await fileInput.trigger('change');
      await new Promise(resolve => setTimeout(resolve, 150));
      await wrapper.vm.$nextTick();

      const buttons = wrapper.findAll('button');
      const uploadButton = buttons.find(btn => btn.text().includes('Upload Another File'));
      expect(uploadButton).toBeDefined();
      expect(uploadButton!.classes()).toContain('bg-indigo-600');
      expect(uploadButton!.classes()).toContain('hover:bg-indigo-700');
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full upload, view, and re-upload cycle', async () => {
      const wrapper = mount(App);

      // Step 1: Initial state
      expect(wrapper.findComponent(CsvUpload).exists()).toBe(true);

      // Step 2: Upload first file
      const csvData1 = `Date,Description,Amount
2024-01-15,Coffee,-5.50`;

      const file1 = new File([csvData1], 'test1.csv', { type: 'text/csv' });

      let fileInput = wrapper.find('input[type="file"]');
      let inputElement = fileInput.element as HTMLInputElement;

      Object.defineProperty(inputElement, 'files', {
        value: [file1],
        writable: false,
      });

      await fileInput.trigger('change');
      await new Promise(resolve => setTimeout(resolve, 150));
      await wrapper.vm.$nextTick();

      // Step 3: Verify transaction list is shown
      expect(wrapper.findComponent(TransactionList).exists()).toBe(true);
      expect(wrapper.text()).toContain('Coffee');
      expect(wrapper.text()).toContain('1 transaction');

      // Step 4: Click "Upload Another File"
      const buttons = wrapper.findAll('button');
      const uploadButton = buttons.find(btn => btn.text().includes('Upload Another File'));
      expect(uploadButton).toBeDefined();
      await uploadButton!.trigger('click');

      // Step 5: Verify back to upload view
      expect(wrapper.findComponent(CsvUpload).exists()).toBe(true);
      expect(wrapper.findComponent(TransactionList).exists()).toBe(false);

      // Step 6: Upload second file
      const csvData2 = `Date,Description,Amount
2024-01-16,Salary,2500.00
2024-01-17,Groceries,-45.00`;

      const file2 = new File([csvData2], 'test2.csv', { type: 'text/csv' });

      fileInput = wrapper.find('input[type="file"]');
      inputElement = fileInput.element as HTMLInputElement;

      Object.defineProperty(inputElement, 'files', {
        value: [file2],
        writable: false,
      });

      await fileInput.trigger('change');
      await new Promise(resolve => setTimeout(resolve, 150));
      await wrapper.vm.$nextTick();

      // Step 7: Verify new transactions are shown
      expect(wrapper.text()).toContain('Salary');
      expect(wrapper.text()).toContain('Groceries');
      expect(wrapper.text()).toContain('2 transactions');
      expect(wrapper.text()).not.toContain('Coffee'); // Old data is gone
    });
  });
});
