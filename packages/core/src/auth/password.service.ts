import bcrypt from 'bcrypt';

const COST_FACTOR = 12;

/**
 * Hash a password using bcrypt
 * @param password - The plain text password to hash
 * @returns The hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST_FACTOR);
}

/**
 * Verify a password against a hash
 * @param password - The plain text password to verify
 * @param hash - The hash to verify against
 * @returns True if the password matches, false otherwise
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
