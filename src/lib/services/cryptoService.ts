/**
 * Cryptography service for encrypting and decrypting peer configurations
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Encrypt configuration content using AES-256-GCM
 * Returns hex-encoded string in format: iv:authTag:encrypted
 */
export function encryptConfig(plaintext: string, encryptionKey: string): string {
  // Generate a random IV (initialization vector)
  const iv = randomBytes(16);
  
  // Create cipher
  const cipher = createCipheriv(
    "aes-256-gcm",
    Buffer.from(encryptionKey, "hex"),
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

  // Create decipher
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(encryptionKey, "hex"),
    iv
  );

  // Set auth tag
  decipher.setAuthTag(authTag);

  // Decrypt
  let decrypted = decipher.update(encrypted, undefined, "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

