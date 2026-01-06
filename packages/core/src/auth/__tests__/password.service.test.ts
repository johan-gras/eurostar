import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../password.service.js';

describe('password.service', () => {
  describe('hashPassword', () => {
    it('should produce different hash each time', async () => {
      const password = 'test-password-123';

      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce a bcrypt hash', async () => {
      const password = 'test-password-123';

      const hash = await hashPassword(password);

      // bcrypt hashes start with $2b$ or $2a$
      expect(hash).toMatch(/^\$2[ab]\$/);
    });

    it('should handle empty password', async () => {
      const hash = await hashPassword('');

      expect(hash).toBeDefined();
      expect(hash).toMatch(/^\$2[ab]\$/);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'correct-password';
      const hash = await hashPassword(password);

      const result = await verifyPassword(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for wrong password', async () => {
      const password = 'correct-password';
      const wrongPassword = 'wrong-password';
      const hash = await hashPassword(password);

      const result = await verifyPassword(wrongPassword, hash);

      expect(result).toBe(false);
    });

    it('should handle empty password verification', async () => {
      const emptyHash = await hashPassword('');

      const resultCorrect = await verifyPassword('', emptyHash);
      const resultWrong = await verifyPassword('not-empty', emptyHash);

      expect(resultCorrect).toBe(true);
      expect(resultWrong).toBe(false);
    });
  });
});
