import 'dotenv/config';
import { db } from '../src/db/client';
import { transactions } from '../src/db/schema';
import { inArray } from 'drizzle-orm';

interface TransactionRecord {
  id: string;
  date: string;
  description: string;
  originalDescription: string | null;
  amount: string;
  createdAt: Date;
}

function getFingerprint(t: TransactionRecord): string {
  const desc = (t.originalDescription || t.description || '').toLowerCase().trim();
  const amount = Math.round(parseFloat(t.amount) * 100) / 100;
  return `${t.date}|${desc}|${amount}`;
}

async function cleanupDuplicates(dryRun = true) {
  console.log(`=== Duplicate Cleanup ${dryRun ? '(DRY RUN)' : '(LIVE)'} ===\n`);

  // Fetch all transactions
  const allTx = await db.query.transactions.findMany({
    columns: {
      id: true,
      date: true,
      description: true,
      originalDescription: true,
      amount: true,
      createdAt: true,
    },
    orderBy: (transactions, { asc }) => [asc(transactions.createdAt)],
  });

  console.log('Total transactions:', allTx.length);

  // Group by fingerprint
  const fingerprints = new Map<string, TransactionRecord[]>();

  allTx.forEach(t => {
    const fp = getFingerprint(t);
    const existing = fingerprints.get(fp) || [];
    existing.push(t);
    fingerprints.set(fp, existing);
  });

  // Find duplicates and collect IDs to delete
  const idsToDelete: string[] = [];
  const duplicateGroups: Array<{ fingerprint: string; keep: TransactionRecord; delete: TransactionRecord[] }> = [];

  fingerprints.forEach((txs, fp) => {
    if (txs.length > 1) {
      // Sort by createdAt ascending - keep the first (oldest) one
      const sorted = txs.sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const keep = sorted[0];
      const toDelete = sorted.slice(1);

      duplicateGroups.push({ fingerprint: fp, keep, delete: toDelete });
      idsToDelete.push(...toDelete.map(t => t.id));
    }
  });

  console.log('Unique fingerprints:', fingerprints.size);
  console.log('Duplicate groups:', duplicateGroups.length);
  console.log('Transactions to delete:', idsToDelete.length);
  console.log('Transactions to keep:', allTx.length - idsToDelete.length);

  if (duplicateGroups.length === 0) {
    console.log('\nNo duplicates found. Nothing to clean up.');
    return;
  }

  // Show sample of what will be deleted
  console.log('\n--- Sample of duplicates to remove ---\n');
  duplicateGroups.slice(0, 5).forEach(({ fingerprint, keep, delete: toDelete }) => {
    const [date, desc, amount] = fingerprint.split('|');
    console.log(`${date} | $${amount} | ${desc.slice(0, 40)}`);
    console.log(`  KEEP: ${keep.id.slice(0, 8)}... (created ${keep.createdAt})`);
    toDelete.forEach(t => {
      console.log(`  DELETE: ${t.id.slice(0, 8)}... (created ${t.createdAt})`);
    });
    console.log();
  });

  if (duplicateGroups.length > 5) {
    console.log(`... and ${duplicateGroups.length - 5} more duplicate groups\n`);
  }

  if (dryRun) {
    console.log('=== DRY RUN - No changes made ===');
    console.log('Run with --live to actually delete duplicates:');
    console.log('  npx tsx scripts/cleanup-duplicates.ts --live\n');
    return;
  }

  // Actually delete
  console.log('Deleting duplicates...');

  // Delete in batches of 100 to avoid query limits
  const batchSize = 100;
  let deletedCount = 0;

  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = idsToDelete.slice(i, i + batchSize);
    const result = await db.delete(transactions)
      .where(inArray(transactions.id, batch))
      .returning({ id: transactions.id });

    deletedCount += result.length;
    console.log(`  Deleted batch ${Math.floor(i / batchSize) + 1}: ${result.length} transactions`);
  }

  console.log(`\n=== Cleanup Complete ===`);
  console.log(`Deleted: ${deletedCount} duplicate transactions`);
  console.log(`Remaining: ${allTx.length - deletedCount} transactions`);
}

// Check for --live flag
const isLive = process.argv.includes('--live');
cleanupDuplicates(!isLive).catch(console.error).finally(() => process.exit(0));
