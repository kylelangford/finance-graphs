import 'dotenv/config';
import { db } from '../src/db/client';
import { transactions } from '../src/db/schema';

function getFingerprint(t: { date: string; originalDescription: string | null; description: string; amount: string }): string {
  const desc = (t.originalDescription || t.description || '').toLowerCase().trim();
  const amount = Math.round(parseFloat(t.amount) * 100) / 100;
  return `${t.date}|${desc}|${amount}`;
}

async function checkDuplicates() {
  console.log('=== Duplicate Check ===\n');

  const allTx = await db.query.transactions.findMany({
    columns: {
      id: true,
      date: true,
      description: true,
      originalDescription: true,
      amount: true,
    }
  });

  console.log('Total transactions:', allTx.length);

  // Build fingerprint map
  const fingerprints = new Map<string, typeof allTx>();

  allTx.forEach(t => {
    const fp = getFingerprint(t);
    const existing = fingerprints.get(fp) || [];
    existing.push(t);
    fingerprints.set(fp, existing);
  });

  // Find duplicates
  const duplicates = Array.from(fingerprints.entries())
    .filter(([_, txs]) => txs.length > 1);

  console.log('Unique fingerprints:', fingerprints.size);
  console.log('Duplicate groups:', duplicates.length);

  if (duplicates.length > 0) {
    console.log('\nDuplicate transactions found:');
    duplicates.slice(0, 5).forEach(([fp, txs]) => {
      console.log(`\n  Fingerprint: ${fp}`);
      console.log(`  Count: ${txs.length} transactions`);
      txs.forEach(t => {
        console.log(`    - ID: ${t.id.slice(0, 8)}... | ${t.date} | ${t.description.slice(0, 30)}`);
      });
    });
    if (duplicates.length > 5) {
      console.log(`\n  ... and ${duplicates.length - 5} more duplicate groups`);
    }
  } else {
    console.log('\nNo duplicate transactions found ✓');
  }
}

checkDuplicates().catch(console.error).finally(() => process.exit(0));
