import Papa from 'papaparse';
import type { Transaction } from '../types/transaction';

/**
 * Parse a numeric value from a string, handling currency symbols, commas, and whitespace
 */
function parseNumericValue(value: any): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  // Convert to string and trim whitespace
  const strValue = String(value).trim();

  if (strValue === '') {
    return 0;
  }

  // Remove currency symbols, commas, and other non-numeric characters except . and -
  const cleaned = strValue
    .replace(/[$£€¥]/g, '')  // Remove currency symbols
    .replace(/,/g, '')        // Remove commas (thousand separators)
    .replace(/\s/g, '')       // Remove whitespace
    .trim();

  const parsed = parseFloat(cleaned);

  // Return 0 if parsing failed (NaN)
  return isNaN(parsed) ? 0 : parsed;
}

export interface ParseResult {
  success: boolean;
  data?: Transaction[];
  error?: string;
}

export interface CsvPreview {
  headers: string[];
  sampleRows: Record<string, string>[];
}

export interface ColumnMapping {
  date: string;
  description: string;
  amount?: string;       // Single amount column
  debit?: string;        // Or separate debit column
  credit?: string;       // Or separate credit column
  transactionType?: string; // Optional
}

/**
 * Extract headers and sample rows from CSV file
 */
export function previewCsvFile(file: File): Promise<{ success: boolean; preview?: CsvPreview; error?: string }> {
  return new Promise((resolve) => {
    if (!file.name.endsWith('.csv')) {
      resolve({ success: false, error: 'Please upload a CSV file' });
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: 5, // Only parse first 5 rows for preview
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          resolve({ success: false, error: 'CSV file is empty' });
          return;
        }

        const headers = results.meta.fields || [];
        const sampleRows = results.data as Record<string, string>[];

        resolve({
          success: true,
          preview: { headers, sampleRows },
        });
      },
      error: (error) => {
        resolve({ success: false, error: `Error parsing CSV: ${error.message}` });
      },
    });
  });
}

/**
 * Parse CSV file with custom column mapping
 */
export function parseCsvWithMapping(file: File, mapping: ColumnMapping): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const transactions: Transaction[] = (results.data as Record<string, any>[]).map((row, index) => {
            // Get values using mapping
            const date = (row[mapping.date] || '').toString().trim();
            const description = (row[mapping.description] || '').toString().trim();

            let amount: number;
            let transactionType: 'Debit' | 'Credit';

            // Handle amount based on mapping type
            if (mapping.amount) {
              // Single amount column
              amount = parseNumericValue(row[mapping.amount]);

              // Check transaction type column if provided
              if (mapping.transactionType && row[mapping.transactionType]) {
                const typeValue = row[mapping.transactionType].toString().toLowerCase();
                transactionType = typeValue.includes('credit') ? 'Credit' : 'Debit';
                amount = transactionType === 'Debit' ? -Math.abs(amount) : Math.abs(amount);
              } else {
                // Infer from sign
                transactionType = amount < 0 ? 'Debit' : 'Credit';
              }
            } else if (mapping.debit || mapping.credit) {
              // Separate debit/credit columns
              const debitValue = mapping.debit ? parseNumericValue(row[mapping.debit]) : 0;
              const creditValue = mapping.credit ? parseNumericValue(row[mapping.credit]) : 0;

              // Check which column has a value (non-zero)
              const hasDebit = debitValue !== 0;
              const hasCredit = creditValue !== 0;

              if (hasDebit && !hasCredit) {
                transactionType = 'Debit';
                amount = -Math.abs(debitValue);
              } else if (hasCredit && !hasDebit) {
                transactionType = 'Credit';
                amount = Math.abs(creditValue);
              } else if (hasDebit && hasCredit) {
                // Both have values, use the larger one
                if (Math.abs(debitValue) >= Math.abs(creditValue)) {
                  transactionType = 'Debit';
                  amount = -Math.abs(debitValue);
                } else {
                  transactionType = 'Credit';
                  amount = Math.abs(creditValue);
                }
              } else {
                // Both are zero/empty - skip this row or mark as zero
                transactionType = 'Debit';
                amount = 0;
              }
            } else {
              throw new Error('No amount column specified');
            }

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

          resolve({ success: true, data: transactions });
        } catch (error) {
          resolve({
            success: false,
            error: error instanceof Error ? error.message : 'Error parsing CSV',
          });
        }
      },
      error: (error) => {
        resolve({ success: false, error: `Error parsing CSV: ${error.message}` });
      },
    });
  });
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
    const debitValue = parseNumericValue(row.Debit || row.debit || row.DEBIT);
    const creditValue = parseNumericValue(row.Credit || row.credit || row.CREDIT);

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
      const hasDebitVal = debitValue !== 0;
      const hasCreditVal = creditValue !== 0;

      if (hasDebitVal && !hasCreditVal) {
        amount = -Math.abs(debitValue); // Debits are negative
      } else if (hasCreditVal && !hasDebitVal) {
        amount = Math.abs(creditValue); // Credits are positive
      } else {
        // Fallback to combined amount column
        amount = parseNumericValue(row.Amount || row.amount || row.AMOUNT);
        // Apply sign based on transaction type
        amount = transactionType === 'Debit' ? -Math.abs(amount) : Math.abs(amount);
      }
    } else {
      // Infer from debit/credit columns
      const hasDebitVal = debitValue !== 0;
      const hasCreditVal = creditValue !== 0;

      if (hasDebitVal && !hasCreditVal) {
        transactionType = 'Debit';
        amount = -Math.abs(debitValue);
      } else if (hasCreditVal && !hasDebitVal) {
        transactionType = 'Credit';
        amount = Math.abs(creditValue);
      } else {
        // Fallback to combined amount column
        amount = parseNumericValue(row.Amount || row.amount || row.AMOUNT);
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
