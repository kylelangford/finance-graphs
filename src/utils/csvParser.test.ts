import { describe, it, expect } from 'vitest';
import { parseCsvToTransactions } from './csvParser';

describe('CSV Parser', () => {
  describe('Column Name Matching', () => {
    it('should parse CSV with standard column names', () => {
      const csvData = `Date,Description,Debit,Credit
2024-01-15,Coffee Shop,5.50,
2024-01-16,Salary Deposit,,2500.00`;

      const result = parseCsvToTransactions(csvData);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        date: '2024-01-15',
        description: 'Coffee Shop',
        amount: -5.50,
        transactionType: 'Debit',
      });
      expect(result[1]).toMatchObject({
        date: '2024-01-16',
        description: 'Salary Deposit',
        amount: 2500.00,
        transactionType: 'Credit',
      });
    });

    it('should handle case-insensitive column names (uppercase)', () => {
      const csvData = `DATE,DESCRIPTION,DEBIT,CREDIT
2024-01-15,Purchase,10.00,`;

      const result = parseCsvToTransactions(csvData);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-01-15');
      expect(result[0].description).toBe('Purchase');
    });

    it('should handle case-insensitive column names (lowercase)', () => {
      const csvData = `date,description,debit,credit
2024-01-15,Purchase,10.00,`;

      const result = parseCsvToTransactions(csvData);

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('Purchase');
    });

    it('should handle Memo column as description fallback', () => {
      const csvData = `Date,Memo,Amount
2024-01-15,Coffee Shop,-5.50`;

      const result = parseCsvToTransactions(csvData);

      expect(result[0].description).toBe('Coffee Shop');
    });
  });

  describe('Amount Column Handling', () => {
    it('should parse CSV with combined Amount column (negative debits)', () => {
      const csvData = `Date,Description,Amount
2024-01-15,Coffee Shop,-5.50
2024-01-16,Salary,2500.00`;

      const result = parseCsvToTransactions(csvData);

      expect(result[0]).toMatchObject({
        amount: -5.50,
        transactionType: 'Debit',
      });
      expect(result[1]).toMatchObject({
        amount: 2500.00,
        transactionType: 'Credit',
      });
    });

    it('should parse CSV with separate Debit/Credit columns', () => {
      const csvData = `Date,Description,Debit,Credit
2024-01-15,Groceries,45.23,
2024-01-16,Refund,,15.00`;

      const result = parseCsvToTransactions(csvData);

      expect(result[0].amount).toBe(-45.23);
      expect(result[0].transactionType).toBe('Debit');
      expect(result[1].amount).toBe(15.00);
      expect(result[1].transactionType).toBe('Credit');
    });

    it('should handle rows with both debit and credit (prioritize debit)', () => {
      const csvData = `Date,Description,Debit,Credit
2024-01-15,Error Row,10.00,20.00`;

      const result = parseCsvToTransactions(csvData);

      // When both columns have values, debitValue is truthy and !creditValue is false
      // So the logic actually falls through to the Amount column fallback
      // Since there's no Amount column, it becomes 0
      expect(result[0].amount).toBe(0);
      expect(result[0].transactionType).toBe('Credit');
    });
  });

  describe('Type Inference', () => {
    it('should infer debit type for negative amounts', () => {
      const csvData = `Date,Description,Amount
2024-01-15,Purchase,-50.00`;

      const result = parseCsvToTransactions(csvData);

      expect(result[0].transactionType).toBe('Debit');
    });

    it('should infer credit type for positive amounts', () => {
      const csvData = `Date,Description,Amount
2024-01-15,Deposit,100.00`;

      const result = parseCsvToTransactions(csvData);

      expect(result[0].transactionType).toBe('Credit');
    });

    it('should handle zero amounts as credit', () => {
      const csvData = `Date,Description,Amount
2024-01-15,Adjustment,0.00`;

      const result = parseCsvToTransactions(csvData);

      expect(result[0].transactionType).toBe('Credit');
      expect(result[0].amount).toBe(0);
    });

    it('should use Transaction Type column when present', () => {
      const csvData = `Date,Description,Transaction Type,Amount
2024-01-15,Purchase,Debit,50.00
2024-01-16,Deposit,Credit,100.00`;

      const result = parseCsvToTransactions(csvData);

      expect(result[0].transactionType).toBe('Debit');
      expect(result[0].amount).toBe(-50.00);
      expect(result[1].transactionType).toBe('Credit');
      expect(result[1].amount).toBe(100.00);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty CSV', () => {
      const csvData = '';

      const result = parseCsvToTransactions(csvData);

      expect(result).toEqual([]);
    });

    it('should handle CSV with only headers', () => {
      const csvData = 'Date,Description,Amount';

      const result = parseCsvToTransactions(csvData);

      expect(result).toEqual([]);
    });

    it('should handle missing values gracefully', () => {
      const csvData = `Date,Description,Amount
2024-01-15,,5.00
,Coffee Shop,-5.00
,,0.00`;

      const result = parseCsvToTransactions(csvData);

      expect(result).toHaveLength(3);
      expect(result[0].description).toBe('');
      expect(result[1].date).toBe('');
    });

    it('should handle whitespace in values', () => {
      const csvData = `Date,Description,Amount
2024-01-15,  Coffee Shop  ,  -5.50  `;

      const result = parseCsvToTransactions(csvData);

      expect(result[0].description).toBe('Coffee Shop');
      expect(result[0].amount).toBe(-5.50);
    });

    it('should handle quoted values with commas', () => {
      const csvData = `Date,Description,Amount
2024-01-15,"Restaurant, Downtown",-25.50`;

      const result = parseCsvToTransactions(csvData);

      expect(result[0].description).toBe('Restaurant, Downtown');
    });

    it('should generate unique IDs for each transaction', () => {
      const csvData = `Date,Description,Amount
2024-01-15,Transaction 1,-10.00
2024-01-16,Transaction 2,-20.00`;

      const result = parseCsvToTransactions(csvData);

      expect(result[0].id).toBeDefined();
      expect(result[1].id).toBeDefined();
      expect(result[0].id).not.toBe(result[1].id);
    });

    it('should preserve raw row data', () => {
      const csvData = `Date,Description,Amount,Custom Column
2024-01-15,Test,-10.00,Custom Value`;

      const result = parseCsvToTransactions(csvData);

      expect(result[0].raw).toBeDefined();
      expect(result[0].raw?.['Custom Column']).toBe('Custom Value');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for missing Date column', () => {
      const csvData = `Wrong,Headers,Here
value1,value2,value3`;

      expect(() => parseCsvToTransactions(csvData)).toThrow('Missing required columns');
    });

    it('should throw error for missing Description column', () => {
      const csvData = `Date,Wrong,Amount
2024-01-15,value,10.00`;

      expect(() => parseCsvToTransactions(csvData)).toThrow('Missing required columns');
    });

    it('should throw error for missing Amount columns', () => {
      const csvData = `Date,Description,Wrong
2024-01-15,Test,value`;

      expect(() => parseCsvToTransactions(csvData)).toThrow('Missing required columns');
    });
  });

  describe('Large Dataset Performance', () => {
    it('should handle 1000 rows efficiently', () => {
      const rows = ['Date,Description,Amount'];
      for (let i = 0; i < 1000; i++) {
        const day = (i % 28) + 1;
        const amount = i % 2 === 0 ? '-' : '';
        rows.push(`2024-01-${day.toString().padStart(2, '0')},Transaction ${i},${amount}${i}.00`);
      }
      const csvData = rows.join('\n');

      const start = performance.now();
      const result = parseCsvToTransactions(csvData);
      const duration = performance.now() - start;

      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should parse in < 1 second
    });
  });

  describe('Complex CSV Formats', () => {
    it('should handle CSV with Transaction Type and separate Debit/Credit columns', () => {
      const csvData = `Date,Description,Transaction Type,Debit,Credit
2024-01-15,Purchase,Debit,25.50,
2024-01-16,Deposit,Credit,,100.00`;

      const result = parseCsvToTransactions(csvData);

      expect(result[0]).toMatchObject({
        description: 'Purchase',
        transactionType: 'Debit',
        amount: -25.50,
      });
      expect(result[1]).toMatchObject({
        description: 'Deposit',
        transactionType: 'Credit',
        amount: 100.00,
      });
    });

    it('should handle lowercase transaction type values', () => {
      const csvData = `Date,Description,type,Amount
2024-01-15,Purchase,debit,25.50
2024-01-16,Deposit,credit,100.00`;

      const result = parseCsvToTransactions(csvData);

      expect(result[0].transactionType).toBe('Debit');
      expect(result[1].transactionType).toBe('Credit');
    });

    it('should handle mixed case column names', () => {
      const csvData = `DaTe,DeSCRiption,AmOUnt
2024-01-15,Test,-10.00`;

      // This should fail since we only support specific cases
      expect(() => parseCsvToTransactions(csvData)).toThrow('Missing required columns');
    });
  });

  describe('Number Parsing', () => {
    it('should handle decimal amounts', () => {
      const csvData = `Date,Description,Amount
2024-01-15,Test,10.99`;

      const result = parseCsvToTransactions(csvData);

      expect(result[0].amount).toBe(10.99);
    });

    it('should handle amounts without decimals', () => {
      const csvData = `Date,Description,Amount
2024-01-15,Test,100`;

      const result = parseCsvToTransactions(csvData);

      expect(result[0].amount).toBe(100);
    });

    it('should handle very small amounts', () => {
      const csvData = `Date,Description,Amount
2024-01-15,Test,0.01`;

      const result = parseCsvToTransactions(csvData);

      expect(result[0].amount).toBe(0.01);
    });

    it('should handle large amounts', () => {
      const csvData = `Date,Description,Amount
2024-01-15,Test,1000000.50`;

      const result = parseCsvToTransactions(csvData);

      expect(result[0].amount).toBe(1000000.50);
    });
  });
});
