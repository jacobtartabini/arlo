/**
 * Server-side encryption utilities for sensitive data like OAuth tokens.
 * Uses AES-256-GCM for authenticated encryption.
 */

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 128; // 128-bit auth tag

/**
 * Get the encryption key from environment variables.
 * The key should be a base64-encoded 256-bit key.
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyBase64 = Deno.env.get('TOKEN_ENCRYPTION_KEY');
  
  if (!keyBase64) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is not set');
  }

  // If the key is not base64, treat it as a passphrase and derive a key
  let keyBytes: Uint8Array;
  
  try {
    // Try to decode as base64
    keyBytes = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
    
    // If it's not 32 bytes, derive a key from it
    if (keyBytes.length !== 32) {
      keyBytes = await deriveKeyFromPassphrase(keyBase64);
    }
  } catch {
    // Not valid base64, derive from passphrase
    keyBytes = await deriveKeyFromPassphrase(keyBase64);
  }

  return crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Derive a 256-bit key from a passphrase using PBKDF2.
 */
async function deriveKeyFromPassphrase(passphrase: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Use a static salt (since we need deterministic encryption for existing data)
  // In a production system, you'd store the salt with each encrypted value
  const salt = encoder.encode('arlo-token-encryption-salt-v1');
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passphraseKey,
    256
  );

  return new Uint8Array(derivedBits);
}

/**
 * Encrypt a plaintext string.
 * Returns a base64-encoded string containing: IV || ciphertext || auth tag
 */
export async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext) {
    return plaintext;
  }

  const key = await getEncryptionKey();
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
      tagLength: TAG_LENGTH,
    },
    key,
    encoder.encode(plaintext)
  );

  // Combine IV and ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Return as base64 with a prefix to identify encrypted values
  return 'enc:' + btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt an encrypted string.
 * Expects a base64-encoded string containing: IV || ciphertext || auth tag
 */
export async function decrypt(encrypted: string): Promise<string> {
  if (!encrypted) {
    return encrypted;
  }

  // Check if this is an encrypted value
  if (!encrypted.startsWith('enc:')) {
    // Not encrypted, return as-is (for backward compatibility with existing plaintext tokens)
    return encrypted;
  }

  const key = await getEncryptionKey();
  const encryptedData = encrypted.slice(4); // Remove 'enc:' prefix
  
  // Decode from base64
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  
  // Extract IV and ciphertext
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv,
      tagLength: TAG_LENGTH,
    },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Check if a value is encrypted (has the enc: prefix)
 */
export function isEncrypted(value: string | null | undefined): boolean {
  return value?.startsWith('enc:') ?? false;
}
