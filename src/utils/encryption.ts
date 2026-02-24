import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * Encryption utility for sensitive data like API keys
 * Uses AES-256-GCM for encryption with authentication
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment
 * Uses scrypt to derive a proper key from the env variable
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY || import.meta.env.ENCRYPTION_KEY;

  if (!envKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  // Use a fixed salt for key derivation (stored with encrypted data has its own salt)
  const salt = Buffer.from('finance-graphs-2024', 'utf8');

  // Derive a proper 256-bit key using scrypt
  return scryptSync(envKey, salt, KEY_LENGTH);
}

/**
 * Encrypt a string value
 * Returns: base64(iv:salt:authTag:encryptedData)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    return '';
  }

  try {
    const key = getEncryptionKey();

    // Generate random IV (initialization vector)
    const iv = randomBytes(IV_LENGTH);

    // Generate random salt for this specific encryption
    const salt = randomBytes(SALT_LENGTH);

    // Create cipher
    const cipher = createCipheriv(ALGORITHM, key, iv);

    // Encrypt the data
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine: iv:salt:authTag:encrypted
    const combined = Buffer.concat([
      iv,
      salt,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]);

    // Return as base64
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt an encrypted string
 * Expects format: base64(iv:salt:authTag:encryptedData)
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) {
    return '';
  }

  try {
    const key = getEncryptionKey();

    // Decode from base64
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract components
    const iv = combined.subarray(0, IV_LENGTH);
    const salt = combined.subarray(IV_LENGTH, IV_LENGTH + SALT_LENGTH);
    const authTag = combined.subarray(IV_LENGTH + SALT_LENGTH, IV_LENGTH + SALT_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + SALT_LENGTH + AUTH_TAG_LENGTH);

    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the data
    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data - data may be corrupted or encryption key may have changed');
  }
}

/**
 * Check if a string appears to be encrypted
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;

  // If it looks like a plain API key, it's not encrypted
  if (value.startsWith('sk-ant-')) {
    return false;
  }

  try {
    // Check if it's valid base64
    const decoded = Buffer.from(value, 'base64');
    // Should be at least IV + salt + authTag length
    // Also check that it's not just base64-decodable text (like API keys can be)
    const minLength = IV_LENGTH + SALT_LENGTH + AUTH_TAG_LENGTH;
    if (decoded.length < minLength) {
      return false;
    }

    // Additional check: encrypted data should be significantly different from original
    // If decoding to base64 gives us back something that looks like text, it's probably not encrypted
    const decodedStr = decoded.toString('utf8', 0, Math.min(10, decoded.length));
    if (/^[a-zA-Z0-9-_]+$/.test(decodedStr)) {
      return false; // Looks like plain text
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Safely encrypt a value if it's not already encrypted
 */
export function encryptIfNeeded(value: string | null): string | null {
  if (!value) return null;

  // Don't re-encrypt if already encrypted
  if (isEncrypted(value)) {
    return value;
  }

  return encrypt(value);
}

/**
 * Safely decrypt a value, returns original if not encrypted
 */
export function decryptIfNeeded(value: string | null): string {
  if (!value) return '';

  // If it looks encrypted, decrypt it
  if (isEncrypted(value)) {
    try {
      return decrypt(value);
    } catch (error) {
      console.error('Failed to decrypt value:', error);
      return '';
    }
  }

  // Return as-is if not encrypted (backward compatibility)
  return value;
}
