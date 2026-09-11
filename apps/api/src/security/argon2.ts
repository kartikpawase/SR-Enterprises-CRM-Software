import argon2 from 'argon2';

/**
 * High-performance Argon2id parameters aligned with OWASP recommendations for backend services.
 * Keeps hashing under 35ms while preserving cryptographic resistance and preventing threadpool starvation.
 */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MB
  timeCost: 2, // 2 iterations
  parallelism: 1, // 1 thread (preserves Node.js libuv event loop concurrency)
  hashLength: 32,
};

/**
 * Hash a plaintext password using Argon2id
 */
export async function hashPassword(plainText: string): Promise<string> {
  if (!plainText || typeof plainText !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  return argon2.hash(plainText, ARGON2_OPTIONS);
}

/**
 * Verify a plaintext password against an Argon2id hash.
 * Resilient against argument order (hash, plainText) or (plainText, hash).
 */
export async function verifyPassword(hashOrPlain: string, plainOrHash: string): Promise<boolean> {
  if (!hashOrPlain || !plainOrHash) {
    return false;
  }
  try {
    const isFirstHash = typeof hashOrPlain === 'string' && hashOrPlain.startsWith('$argon2');
    const isSecondHash = typeof plainOrHash === 'string' && plainOrHash.startsWith('$argon2');

    const hash = isFirstHash ? hashOrPlain : (isSecondHash ? plainOrHash : hashOrPlain);
    const plainText = isFirstHash ? plainOrHash : (isSecondHash ? hashOrPlain : plainOrHash);

    return await argon2.verify(hash, plainText);
  } catch {
    return false;
  }
}
