/**
 * Cryptography service for encrypting and decrypting peer configurations
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Normalize and validate encryption key format and length
 * Supports both hex (64 chars) and base64 (44 chars) formats
 * AES-256 requires exactly 32 bytes
 * Handles whitespace trimming and auto-detects format
 */
function normalizeAndValidateEncryptionKey(key: string): Buffer {
  if (!key || typeof key !== 'string') {
    throw new Error(`Invalid encryption key: key must be a non-empty string`);
  }
  
  // Trim whitespace (common issue with env vars)
  const trimmedKey = key.trim();
  
  if (!trimmedKey) {
    throw new Error(`Invalid encryption key: key is empty after trimming whitespace`);
  }
  
  let keyBuffer: Buffer;
  let detectedFormat: string;
  
  // Detect format: base64 typically ends with = or contains + or /
  // Hex only contains 0-9, a-f, A-F
  if (trimmedKey.includes('=') || trimmedKey.includes('+') || trimmedKey.includes('/')) {
    // Try base64
    try {
      keyBuffer = Buffer.from(trimmedKey, 'base64');
      detectedFormat = 'base64';
    } catch {
      throw new Error(
        `Invalid encryption key: appears to be base64 but failed to decode. ` +
        `Key length: ${trimmedKey.length} characters. ` +
        `Key starts with: ${trimmedKey.substring(0, 10)}...`
      );
    }
  } else if (/^[0-9a-fA-F]+$/.test(trimmedKey)) {
    // Try hex
    try {
      keyBuffer = Buffer.from(trimmedKey, 'hex');
      detectedFormat = 'hex';
    } catch {
      throw new Error(
        `Invalid encryption key: appears to be hex but failed to decode. ` +
        `Key length: ${trimmedKey.length} characters.`
      );
    }
  } else {
    throw new Error(
      `Invalid encryption key format: key must be either hexadecimal (64 chars) or base64 (44 chars). ` +
      `Got ${trimmedKey.length} characters. ` +
      `Key starts with: ${trimmedKey.substring(0, 10)}...`
    );
  }
  
  // AES-256 requires exactly 32 bytes
  if (keyBuffer.length !== 32) {
    throw new Error(
      `Invalid encryption key length: expected 32 bytes for AES-256, ` +
      `got ${keyBuffer.length} bytes from ${detectedFormat} format (${trimmedKey.length} characters). ` +
      `For hex: use 64 characters. For base64: use 44 characters. ` +
      `Generate using: openssl rand -hex 32 (hex) or openssl rand -base64 32 (base64)`
    );
  }
  
  return keyBuffer;
}

/**
 * Encrypt configuration content using AES-256-GCM
 * Returns hex-encoded string in format: iv:authTag:encrypted
 */
export function encryptConfig(plaintext: string, encryptionKey: string): string {
  // Normalize and validate key before use (returns Buffer)
  const keyBuffer = normalizeAndValidateEncryptionKey(encryptionKey);
  
  // Generate a random IV (initialization vector)
  const iv = randomBytes(16);
  
  // Create cipher
  const cipher = createCipheriv(
    "aes-256-gcm",
    keyBuffer,
    iv
  );
 
  // Encrypt
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  // Get auth tag
  const authTag = cipher.getAuthTag();
  
  // Combine IV + authTag + encrypted data (all in hex)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt configuration content using AES-256-GCM
 * Accepts either:
 * - string in format: iv:authTag:encrypted (all hex encoded)
 * - PostgreSQL bytea hex format: \xHEXSTRING (where HEXSTRING encodes the entire "iv:authTag:encrypted" string)
 */
export function decryptConfig(ciphertext: string, encryptionKey: string): string {
  // Handle PostgreSQL bytea format (\xHEXSTRING)
  let processedCiphertext = ciphertext;
  if (ciphertext.startsWith('\\x')) {
    // Remove \x prefix and convert hex to ASCII string
    // The hex encodes the entire "iv:authTag:encrypted" string
    const hexString = ciphertext.substring(2);
    processedCiphertext = Buffer.from(hexString, 'hex').toString('ascii');
  }

  // Split the ciphertext into components
  const parts = processedCiphertext.split(":");
  if (parts.length !== 3) {
    throw new Error(`Invalid ciphertext format: expected 3 parts separated by ':', got ${parts.length} parts`);
  }

  const [ivHex, authTagHex, encryptedHex] = parts;

  // Validate hex strings
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Invalid ciphertext: missing components");
  }

  // Convert hex strings to buffers
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  // Validate buffer sizes
  if (iv.length !== 16) {
    throw new Error(`Invalid IV length: expected 16 bytes, got ${iv.length}`);
  }
  if (authTag.length !== 16) {
    throw new Error(`Invalid auth tag length: expected 16 bytes, got ${authTag.length}`);
  }

  // Normalize and validate key before use (returns Buffer)
  const keyBuffer = normalizeAndValidateEncryptionKey(encryptionKey);

  // Create decipher
  const decipher = createDecipheriv(
    "aes-256-gcm",
    keyBuffer,
    iv
  );

  // Set auth tag
  decipher.setAuthTag(authTag);

  // Decrypt
  let decrypted = decipher.update(encrypted, undefined, "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

