import Papa from 'papaparse';
import type { Transaction } from '../types/transaction';

export interface ParseResult {
  success: boolean;
  data?: Transaction[];
  error?: string;
}

/**
 * Parse CSV string into Transaction objects
 */
export function parseCsvToTransactions(csvContent: string): Transaction[] {
  let parsed: Papa.ParseResult<any>;

  try {
    parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });
  } catch (error) {
    throw new Error('Failed to parse CSV: Invalid format');
  }

  if (!parsed.data || parsed.data.length === 0) {
    return [];
  }

  // Validate that we have required columns
  const firstRow = parsed.data[0];
  const hasDateColumn = 'Date' in firstRow || 'date' in firstRow || 'DATE' in firstRow;
  const hasDescriptionColumn =
    'Description' in firstRow ||
    'description' in firstRow ||
    'DESCRIPTION' in firstRow ||
    'Memo' in firstRow ||
    'memo' in firstRow;
  const hasAmountData =
    'Amount' in firstRow ||
    'amount' in firstRow ||
    'AMOUNT' in firstRow ||
    'Debit' in firstRow ||
    'debit' in firstRow ||
    'DEBIT' in firstRow ||
    'Credit' in firstRow ||
    'credit' in firstRow ||
    'CREDIT' in firstRow;

  if (!hasDateColumn || !hasDescriptionColumn || !hasAmountData) {
    throw new Error('Missing required columns. CSV must have Date, Description, and Amount/Debit/Credit columns');
  }

  const transactions: Transaction[] = parsed.data.map((row: any, index: number) => {
    // Get transaction type from column
    const transactionTypeValue =
      row['Transaction Type'] ||
      row['Type'] ||
      row['TRANSACTION TYPE'] ||
      row['type'] ||
      '';

    // Get debit and credit values
    const debitValue = parseFloat(row.Debit || row.debit || row.DEBIT || '0');
    const creditValue = parseFloat(row.Credit || row.credit || row.CREDIT || '0');

    // Determine transaction type and amount
    let transactionType: 'Debit' | 'Credit';
    let amount: number;

    // If transaction type column exists, use it
    if (transactionTypeValue && (
      transactionTypeValue.toLowerCase() === 'debit' ||
      transactionTypeValue.toLowerCase() === 'credit'
    )) {
      transactionType = transactionTypeValue.charAt(0).toUpperCase() +
                       transactionTypeValue.slice(1).toLowerCase() as 'Debit' | 'Credit';

      // If separate columns exist, use them
      if (debitValue && !creditValue) {
        amount = -Math.abs(debitValue); // Debits are negative
      } else if (creditValue && !debitValue) {
        amount = Math.abs(creditValue); // Credits are positive
      } else {
        // Fallback to combined amount column
        amount = parseFloat(row.Amount || row.amount || row.AMOUNT || '0');
        // Apply sign based on transaction type
        amount = transactionType === 'Debit' ? -Math.abs(amount) : Math.abs(amount);
      }
    } else {
      // Infer from debit/credit columns
      if (debitValue && !creditValue) {
        transactionType = 'Debit';
        amount = -Math.abs(debitValue);
      } else if (creditValue && !debitValue) {
        transactionType = 'Credit';
        amount = Math.abs(creditValue);
      } else {
        // Fallback to combined amount column
        amount = parseFloat(row.Amount || row.amount || row.AMOUNT || '0');
        transactionType = amount < 0 ? 'Debit' : 'Credit';
      }
    }

    // Trim whitespace from string values
    const date = (row.Date || row.date || row.DATE || '').toString().trim();
    const description = (
      row.Description ||
      row.description ||
      row.DESCRIPTION ||
      row.Memo ||
      row.memo ||
      ''
    ).toString().trim();

    return {
      id: `${Date.now()}-${index}`,
      date,
      description,
      amount,
      transactionType,
      category: '',
      raw: row,
      originalDescription: description,
    };
  });

  return transactions;
}

/**
 * Parse CSV file into Transaction objects
 */
export function parseCsvFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    if (!file.name.endsWith('.csv')) {
      resolve({
        success: false,
        error: 'Please upload a CSV file',
      });
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const csvContent = results.data.map((row: any) => {
            return Object.entries(row).map(([key, value]) => {
              // Re-create CSV format for parsing
              return value;
            }).join(',');
          }).join('\n');

          // Use the string parser
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const content = e.target?.result as string;
              const transactions = parseCsvToTransactions(content);
              resolve({
                success: true,
                data: transactions,
              });
            } catch (error) {
              resolve({
                success: false,
                error: error instanceof Error ? error.message : 'Error parsing CSV file',
              });
            }
          };
          reader.onerror = () => {
            resolve({
              success: false,
              error: 'Error reading file',
            });
          };
          reader.readAsText(file);
        } catch (error) {
          resolve({
            success: false,
            error: error instanceof Error ? error.message : 'Error parsing CSV file',
          });
        }
      },
      error: (error) => {
        resolve({
          success: false,
          error: `Error parsing CSV file: ${error.message}`,
        });
      },
    });
  });
}
