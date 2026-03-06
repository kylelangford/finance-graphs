import 'dotenv/config';
import { db } from '../src/db/client';
import { transactions, users } from '../src/db/schema';
import { desc, count } from 'drizzle-orm';

async function checkDB() {
  console.log('=== Database Check ===\n');

  // Check users
  const allUsers = await db.select().from(users);
  console.log('Users:', allUsers.length);
  allUsers.forEach(u => console.log('  -', u.email, '(id:', u.id.slice(0, 8) + '...)'));

  // Check transaction count
  const txCount = await db.select({ count: count() }).from(transactions);
  console.log('\nTotal transactions:', txCount[0].count);

  // Get sample transactions
  const sampleTx = await db.query.transactions.findMany({
    limit: 5,
    orderBy: [desc(transactions.createdAt)],
    columns: {
      id: true,
      date: true,
      description: true,
      originalDescription: true,
      amount: true,
      transactionType: true,
      createdAt: true,
    }
  });

  console.log('\nRecent transactions:');
  if (sampleTx.length === 0) {
    console.log('  (none)');
  } else {
    sampleTx.forEach(t => {
      console.log('  -', t.date, '|', t.description.slice(0, 40).padEnd(40), '|', t.amount.padStart(10), t.transactionType);
      if (t.originalDescription && t.originalDescription !== t.description) {
        console.log('    original:', t.originalDescription.slice(0, 60));
      }
    });
  }

  // Check for any issues
  console.log('\n=== Data Integrity Check ===');

  // Check for transactions with missing required fields
  const allTx = await db.query.transactions.findMany({
    columns: {
      id: true,
      date: true,
      description: true,
      amount: true,
      transactionType: true,
      userId: true,
    }
  });

  let issues = 0;
  allTx.forEach(t => {
    if (!t.date) { console.log('  Missing date:', t.id); issues++; }
    if (!t.description) { console.log('  Missing description:', t.id); issues++; }
    if (!t.amount) { console.log('  Missing amount:', t.id); issues++; }
    if (!t.transactionType) { console.log('  Missing transactionType:', t.id); issues++; }
    if (!t.userId) { console.log('  Missing userId:', t.id); issues++; }
  });

  if (issues === 0) {
    console.log('  All transactions have required fields ✓');
  } else {
    console.log(`  Found ${issues} issues`);
  }
}

checkDB().catch(console.error).finally(() => process.exit(0));
