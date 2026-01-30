import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import CsvUpload from './CsvUpload.vue';
import * as notificationsModule from '../composables/useNotifications';

// Mock the useNotifications composable
const mockAddNotification = vi.fn();
vi.spyOn(notificationsModule, 'useNotifications').mockReturnValue({
  notifications: ref([]),
  addNotification: mockAddNotification,
  removeNotification: vi.fn(),
  clearAll: vi.fn(),
});

describe('CsvUpload Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render upload area', () => {
      const wrapper = mount(CsvUpload);

      expect(wrapper.find('.border-dashed').exists()).toBe(true);
      expect(wrapper.text()).toContain('Upload CSV File');
    });

    it('should render file input', () => {
      const wrapper = mount(CsvUpload);

      const fileInput = wrapper.find('input[type="file"]');
      expect(fileInput.exists()).toBe(true);
      expect(fileInput.attributes('accept')).toBe('.csv');
    });

    it('should have hidden file input', () => {
      const wrapper = mount(CsvUpload);

      const fileInput = wrapper.find('input[type="file"]');
      expect(fileInput.classes()).toContain('hidden');
    });

    it('should show upload instructions', () => {
      const wrapper = mount(CsvUpload);

      expect(wrapper.text()).toContain('Drag and drop your banking statement CSV here');
      expect(wrapper.text()).toContain('or click to browse');
    });

    it('should show supported columns info', () => {
      const wrapper = mount(CsvUpload);

      expect(wrapper.text()).toContain('Supported columns');
      expect(wrapper.text()).toContain('Date, Description, Debit, Credit');
    });
  });

  describe('File Upload via Click', () => {
    it('should trigger file input when clicking upload area', async () => {
      const wrapper = mount(CsvUpload);

      const fileInput = wrapper.find('input[type="file"]');
      const clickSpy = vi.spyOn(fileInput.element as HTMLInputElement, 'click');

      await wrapper.find('.border-dashed').trigger('click');

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should emit upload event with parsed transactions on valid CSV', async () => {
      const wrapper = mount(CsvUpload);

      const csvContent = `Date,Description,Amount
2024-01-15,Coffee Shop,-5.50
2024-01-16,Salary,2500.00`;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const fileInput = wrapper.find('input[type="file"]');
      const inputElement = fileInput.element as HTMLInputElement;

      Object.defineProperty(inputElement, 'files', {
        value: [file],
        writable: false,
      });

      await fileInput.trigger('change');

      // Wait for async parsing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.emitted('upload')).toBeTruthy();
      const emittedData = wrapper.emitted('upload')?.[0]?.[0] as any[];
      expect(emittedData).toBeDefined();
      expect(emittedData.length).toBe(2);
      expect(emittedData[0].description).toBe('Coffee Shop');
    });

    it('should show error notification for non-CSV files', async () => {
      const wrapper = mount(CsvUpload);

      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      const fileInput = wrapper.find('input[type="file"]');
      const inputElement = fileInput.element as HTMLInputElement;

      Object.defineProperty(inputElement, 'files', {
        value: [file],
        writable: false,
      });

      await fileInput.trigger('change');
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockAddNotification).toHaveBeenCalledWith(
        'Please upload a CSV file',
        'error'
      );
      expect(wrapper.emitted('upload')).toBeFalsy();
    });

    it('should show success notification on successful upload', async () => {
      const wrapper = mount(CsvUpload);

      const csvContent = `Date,Description,Amount
2024-01-15,Coffee Shop,-5.50
2024-01-16,Salary,2500.00`;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const fileInput = wrapper.find('input[type="file"]');
      const inputElement = fileInput.element as HTMLInputElement;

      Object.defineProperty(inputElement, 'files', {
        value: [file],
        writable: false,
      });

      await fileInput.trigger('change');
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockAddNotification).toHaveBeenCalledWith(
        'Successfully uploaded 2 transactions',
        'success'
      );
    });

  });

  describe('Drag and Drop', () => {
    it('should handle dragover event', async () => {
      const wrapper = mount(CsvUpload);

      const dropArea = wrapper.find('.border-dashed');

      await dropArea.trigger('dragover');

      // Should show dragging state
      expect(wrapper.vm.isDragging).toBe(true);
    });

    it('should handle dragleave event', async () => {
      const wrapper = mount(CsvUpload);

      const dropArea = wrapper.find('.border-dashed');

      await dropArea.trigger('dragover');
      expect(wrapper.vm.isDragging).toBe(true);

      await dropArea.trigger('dragleave');
      expect(wrapper.vm.isDragging).toBe(false);
    });

    it('should apply dragging styles when dragging over', async () => {
      const wrapper = mount(CsvUpload);

      const dropArea = wrapper.find('.border-dashed');
      await dropArea.trigger('dragover');

      expect(dropArea.classes()).toContain('border-indigo-500');
      expect(dropArea.classes()).toContain('bg-indigo-50');
    });

    it('should handle file drop', async () => {
      const wrapper = mount(CsvUpload);

      const csvContent = `Date,Description,Amount
2024-01-15,Test,100.00`;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const dropArea = wrapper.find('.border-dashed');
      const event = {
        dataTransfer: {
          files: [file],
        },
        preventDefault: vi.fn(),
      };

      await dropArea.trigger('drop', event);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.emitted('upload')).toBeTruthy();
      expect(wrapper.vm.isDragging).toBe(false);
    });

    it('should handle drop without files', async () => {
      const wrapper = mount(CsvUpload);

      const dropArea = wrapper.find('.border-dashed');
      const event = {
        dataTransfer: {
          files: [],
        },
        preventDefault: vi.fn(),
      };

      await dropArea.trigger('drop', event);

      expect(wrapper.emitted('upload')).toBeFalsy();
    });
  });

  describe('Processing State', () => {
    it('should show processing text when uploading', async () => {
      const wrapper = mount(CsvUpload);

      wrapper.vm.isProcessing = true;
      await nextTick();

      expect(wrapper.text()).toContain('Processing...');
    });

    it('should disable file input when processing', async () => {
      const wrapper = mount(CsvUpload);

      wrapper.vm.isProcessing = true;
      await nextTick();

      const fileInput = wrapper.find('input[type="file"]');
      expect(fileInput.attributes('disabled')).toBeDefined();
    });

    it('should add opacity class when processing', async () => {
      const wrapper = mount(CsvUpload);

      wrapper.vm.isProcessing = true;
      await nextTick();

      const dropArea = wrapper.find('.border-dashed');
      expect(dropArea.classes()).toContain('opacity-50');
      expect(dropArea.classes()).toContain('cursor-wait');
    });

    it('should show filename after selecting file', async () => {
      const wrapper = mount(CsvUpload);

      wrapper.vm.fileName = 'my-transactions.csv';
      await nextTick();

      expect(wrapper.text()).toContain('my-transactions.csv');
    });
  });

  describe('Error Handling', () => {
    it('should show error notification on parsing error', async () => {
      const wrapper = mount(CsvUpload);

      // CSV with missing required columns
      const invalidCsv = `Wrong,Headers
value1,value2`;

      const file = new File([invalidCsv], 'test.csv', { type: 'text/csv' });

      const fileInput = wrapper.find('input[type="file"]');
      const inputElement = fileInput.element as HTMLInputElement;

      Object.defineProperty(inputElement, 'files', {
        value: [file],
        writable: false,
      });

      await fileInput.trigger('change');

      // Wait for async parsing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockAddNotification).toHaveBeenCalled();
      const call = mockAddNotification.mock.calls.find(call =>
        call[0].includes('Missing required columns')
      );
      expect(call).toBeDefined();
      expect(call?.[1]).toBe('error');
    });

    it('should reset processing state after error', async () => {
      const wrapper = mount(CsvUpload);

      const file = new File(['invalid'], 'test.txt', { type: 'text/plain' });

      const fileInput = wrapper.find('input[type="file"]');
      const inputElement = fileInput.element as HTMLInputElement;

      Object.defineProperty(inputElement, 'files', {
        value: [file],
        writable: false,
      });

      await fileInput.trigger('change');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Processing should be complete even after error
      expect(wrapper.vm.isProcessing).toBe(false);
    });
  });

  describe('Styling and UX', () => {
    it('should have hover styles on upload area', () => {
      const wrapper = mount(CsvUpload);

      const dropArea = wrapper.find('.border-dashed');
      expect(dropArea.classes()).toContain('hover:border-indigo-400');
      expect(dropArea.classes()).toContain('hover:bg-gray-50');
    });

    it('should have cursor pointer on upload area', () => {
      const wrapper = mount(CsvUpload);

      const dropArea = wrapper.find('.border-dashed');
      expect(dropArea.classes()).toContain('cursor-pointer');
    });

    it('should show emoji icon', () => {
      const wrapper = mount(CsvUpload);

      expect(wrapper.text()).toContain('📊');
    });

    it('should have transition classes', () => {
      const wrapper = mount(CsvUpload);

      const dropArea = wrapper.find('.border-dashed');
      expect(dropArea.classes()).toContain('transition-all');
    });
  });

  describe('Accessibility', () => {
    it('should have file input with accept attribute', () => {
      const wrapper = mount(CsvUpload);

      const fileInput = wrapper.find('input[type="file"]');
      expect(fileInput.attributes('accept')).toBe('.csv');
    });

    it('should allow clicking anywhere in drop zone', () => {
      const wrapper = mount(CsvUpload);

      const dropArea = wrapper.find('.border-dashed');
      expect(dropArea.attributes('class')).toContain('cursor-pointer');
    });
  });

  describe('Component API', () => {
    it('should expose isProcessing ref', () => {
      const wrapper = mount(CsvUpload);

      expect(wrapper.vm.isProcessing).toBe(false);
    });

    it('should expose isDragging ref', () => {
      const wrapper = mount(CsvUpload);

      expect(wrapper.vm.isDragging).toBe(false);
    });

    it('should expose fileName ref', () => {
      const wrapper = mount(CsvUpload);

      expect(wrapper.vm.fileName).toBe('');
    });

    it('should emit upload event with correct signature', async () => {
      const wrapper = mount(CsvUpload);

      const csvContent = `Date,Description,Amount
2024-01-15,Test,10.00`;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const fileInput = wrapper.find('input[type="file"]');
      const inputElement = fileInput.element as HTMLInputElement;

      Object.defineProperty(inputElement, 'files', {
        value: [file],
        writable: false,
      });

      await fileInput.trigger('change');
      await new Promise(resolve => setTimeout(resolve, 100));

      const uploadEvent = wrapper.emitted('upload');
      expect(uploadEvent).toBeTruthy();
      expect(Array.isArray(uploadEvent?.[0]?.[0])).toBe(true);
    });
  });
});
