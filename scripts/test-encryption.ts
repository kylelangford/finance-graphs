/**
 * Test encryption detection
 */

import { isEncrypted } from '../src/utils/encryption';

const testCases = [
  { value: 'sk-ant-api03-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-XXXXXXXXXXX', expected: false, description: 'Plain API key' },
  { value: 'hJ9k2F3xM...', expected: true, description: 'Encrypted data (base64)' },
  { value: '', expected: false, description: 'Empty string' },
  { value: 'plain text', expected: false, description: 'Plain text' },
];

console.log('Testing encryption detection:\n');

for (const test of testCases) {
  const result = isEncrypted(test.value);
  const status = result === test.expected ? '✅' : '❌';
  console.log(`${status} ${test.description}`);
  console.log(`   Value: ${test.value.substring(0, 50)}${test.value.length > 50 ? '...' : ''}`);
  console.log(`   Expected: ${test.expected}, Got: ${result}\n`);
}
